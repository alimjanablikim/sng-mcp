import { PassThrough } from 'node:stream';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createServer } from '../src/server.js';

type JsonRpcResponse = {
  id?: string | number;
  result?: Record<string, unknown>;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

class RawStdioSession {
  private readonly input = new PassThrough();
  private readonly output = new PassThrough();
  private buffer = '';
  private requestId = 0;
  private pending = new Map<number, (value: JsonRpcResponse) => void>();
  private server!: Awaited<ReturnType<typeof createServer>>;

  async start() {
    this.server = await createServer();
    this.output.setEncoding('utf8');
    this.output.on('data', (chunk) => this.consume(String(chunk)));

    const transport = new StdioServerTransport(this.input, this.output);
    await this.server.connect(transport);
  }

  async close() {
    this.input.end();
    await this.server.close();
    this.pending.clear();
  }

  async request(method: string, params: Record<string, unknown>) {
    const id = ++this.requestId;
    const responsePromise = new Promise<JsonRpcResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for response to ${method}`));
      }, 2000);

      this.pending.set(id, (response) => {
        clearTimeout(timer);
        resolve(response);
      });
    });

    this.input.write(
      `${JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params,
      })}\n`
    );

    return responsePromise;
  }

  notify(method: string, params: Record<string, unknown>) {
    this.input.write(
      `${JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
      })}\n`
    );
  }

  private consume(chunk: string) {
    this.buffer += chunk;
    while (true) {
      const newlineIdx = this.buffer.indexOf('\n');
      if (newlineIdx < 0) {
        return;
      }

      const line = this.buffer.slice(0, newlineIdx).trim();
      this.buffer = this.buffer.slice(newlineIdx + 1);
      if (!line) {
        continue;
      }

      const message = JSON.parse(line) as JsonRpcResponse;
      const id = typeof message.id === 'number' ? message.id : undefined;
      if (id === undefined) {
        continue;
      }

      const resolver = this.pending.get(id);
      if (resolver) {
        this.pending.delete(id);
        resolver(message);
      }
    }
  }
}

function parseToolStructuredContent(response: JsonRpcResponse): Record<string, unknown> {
  const result = response.result ?? {};
  if (
    result.structuredContent &&
    typeof result.structuredContent === 'object' &&
    !Array.isArray(result.structuredContent)
  ) {
    return result.structuredContent as Record<string, unknown>;
  }

  const content = Array.isArray(result.content) ? result.content : [];
  const first = content[0] as { text?: string } | undefined;
  if (!first?.text) {
    return {};
  }

  try {
    return JSON.parse(first.text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

describe('sng-mcp stdio protocol compatibility', () => {
  let session: RawStdioSession;

  beforeAll(async () => {
    session = new RawStdioSession();
    await session.start();
  });

  afterAll(async () => {
    await session.close();
  });

  it('accepts minimal initialize handshake', async () => {
    const initialize = await session.request('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: {
        name: 'compat-client',
        version: '0.0.1',
      },
    });

    expect(initialize.error).toBeUndefined();
    expect(initialize.result?.protocolVersion).toBeDefined();
    expect(initialize.result?.capabilities).toBeDefined();

    session.notify('notifications/initialized', {});
  });

  it('returns tools/list with expected tool names and object schemas', async () => {
    const response = await session.request('tools/list', {});
    expect(response.error).toBeUndefined();

    const result = response.result ?? {};
    const tools = Array.isArray(result.tools) ? result.tools : [];

    const names = tools.map((tool) => String((tool as Record<string, unknown>).name));
    expect(names).toContain('list_components');
    expect(names).toContain('get_component_docs');
    expect(names).toContain('get_component_examples');
    expect(names).toContain('get_install_command');
    expect(names).toContain('get_dependency_map');
    expect(names).toContain('get_icon_catalog');
    expect(names).toContain('get_dashboard_context');

    for (const tool of tools) {
      const inputSchema = (tool as Record<string, unknown>).inputSchema as Record<string, unknown>;
      expect(inputSchema.type).toBe('object');
    }
  });

  it('supports selector-style component aliases through tools/call', async () => {
    const response = await session.request('tools/call', {
      name: 'get_component_docs',
      arguments: {
        component: 'sng-button',
      },
    });

    expect(response.error).toBeUndefined();
    const payload = parseToolStructuredContent(response);
    expect(payload.component).toBe('button');
  });

  it('returns fallback policy metadata on valid icon lookups', async () => {
    const response = await session.request('tools/call', {
      name: 'get_icon_catalog',
      arguments: {
        limit: 50,
      },
    });

    expect(response.error).toBeUndefined();
    const payload = parseToolStructuredContent(response);
    expect((payload.fallbackPolicy as Record<string, unknown>).inlineSvgAllowed).toBe(true);
  });

  it('returns inline svg fallback suggestion when icon lookup has no matches', async () => {
    const response = await session.request('tools/call', {
      name: 'get_icon_catalog',
      arguments: {
        query: 'zzzz-no-match-zzzz',
      },
    });

    expect(response.error).toBeUndefined();
    const payload = parseToolStructuredContent(response);
    expect(payload.count).toBe(0);
    expect((payload.fallbackSuggestion as Record<string, unknown>).strategy).toBe('inline-svg-fallback');
  });

  it('returns component build fallback guidance when component is missing', async () => {
    const response = await session.request('tools/call', {
      name: 'get_component_docs',
      arguments: {
        component: 'sng-super-grid-pro',
      },
    });

    expect(response.error).toBeUndefined();
    const result = response.result ?? {};
    expect(result.isError).toBe(true);

    const payload = parseToolStructuredContent(response);
    expect((payload.error as Record<string, unknown>).code).toBe('DOC_NOT_FOUND');
    expect((payload.componentFallbackPolicy as Record<string, unknown>).customComponentAllowed).toBe(true);
  });
});
