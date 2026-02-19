import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../src/server.js';

type ToolResult = {
  content?: Array<{ type: string; text?: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

function structured(result: ToolResult): Record<string, unknown> {
  if (result.structuredContent && typeof result.structuredContent === 'object') {
    return result.structuredContent;
  }

  const text = result.content?.[0]?.text;
  if (text) {
    return JSON.parse(text) as Record<string, unknown>;
  }

  return {};
}

describe('sng-mcp tool contracts', () => {
  let client: Client;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeAll(async () => {
    server = await createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);

    client = new Client({
      name: 'sng-mcp-test-client',
      version: '0.0.1',
    });

    await client.connect(clientTransport);
  });

  afterAll(async () => {
    await client.close();
    await server.close();
  });

  it('registers expected tools', async () => {
    const result = await client.listTools();
    const names = result.tools.map((tool) => tool.name);

    expect(names).toContain('list_components');
    expect(names).toContain('get_component_docs');
    expect(names).toContain('get_component_examples');
    expect(names).toContain('get_install_command');
    expect(names).toContain('get_dependency_map');
    expect(names).toContain('get_icon_catalog');
    expect(names).toContain('get_dashboard_context');
  });

  it('list_components returns component list contract', async () => {
    const result = (await client.callTool({
      name: 'list_components',
      arguments: { query: 'button' },
    })) as ToolResult;

    const payload = structured(result);
    const components = payload.components as Array<Record<string, unknown>>;

    expect(Array.isArray(components)).toBe(true);
    expect((payload.count as number) >= 1).toBe(true);
    expect(components.some((item) => item.installName === 'button')).toBe(true);
    expect(Array.isArray(payload.sourceFiles)).toBe(true);
  });

  it('get_component_docs returns docs contract', async () => {
    const result = (await client.callTool({
      name: 'get_component_docs',
      arguments: { component: 'button', includeRawMarkdown: true },
    })) as ToolResult;

    const payload = structured(result);

    expect(payload.component).toBe('button');
    expect(typeof payload.title).toBe('string');
    expect(typeof payload.summary).toBe('string');
    expect(Array.isArray(payload.sections)).toBe(true);
    expect(String(payload.installCommand)).toContain('@shadng/sng-ui add button');
    expect(String(payload.docUrl)).toBe('https://shadng.js.org/ui/button.md');
    expect(String(payload.rawMarkdown)).toContain('# ShadNG Button');
  });

  it('get_component_examples returns examples contract', async () => {
    const result = (await client.callTool({
      name: 'get_component_examples',
      arguments: { component: 'button' },
    })) as ToolResult;

    const payload = structured(result);

    expect(payload.component).toBe('button');
    expect(Array.isArray(payload.examples)).toBe(true);
    expect(Array.isArray(payload.sourceFiles)).toBe(true);
    expect((payload.examples as Array<unknown>).length > 0).toBe(true);
  });

  it('get_install_command returns canonical commands', async () => {
    const result = (await client.callTool({
      name: 'get_install_command',
      arguments: {
        components: ['button', 'table'],
        includeInit: true,
        includeAll: true,
      },
    })) as ToolResult;

    const payload = structured(result);
    const commands = payload.commands as string[];

    expect(commands).toContain('npx @shadng/sng-ui init');
    expect(commands).toContain('npx @shadng/sng-ui add button table');
    expect(commands).toContain('npx @shadng/sng-ui add --all');
  });

  it('get_dependency_map returns dependency shape', async () => {
    const result = (await client.callTool({
      name: 'get_dependency_map',
      arguments: { component: 'table' },
    })) as ToolResult;

    const payload = structured(result);
    const dependencies = payload.dependencies as Array<Record<string, unknown>>;

    expect(payload.component).toBe('table');
    expect(Array.isArray(dependencies)).toBe(true);
    expect(dependencies.some((dep) => dep.name === '@angular/core')).toBe(true);
    expect(Array.isArray(payload.peerDependencies)).toBe(true);
    expect(Array.isArray(payload.sourceFiles)).toBe(true);
  });

  it('get_icon_catalog returns icon records', async () => {
    const result = (await client.callTool({
      name: 'get_icon_catalog',
      arguments: {
        query: 'github',
        limit: 10,
      },
    })) as ToolResult;

    const payload = structured(result);
    const icons = payload.icons as Array<Record<string, unknown>>;

    expect(Array.isArray(icons)).toBe(true);
    expect((payload.count as number) >= 1).toBe(true);
    expect(icons.some((icon) => String(icon.name).toLowerCase().includes('github'))).toBe(true);
    expect((payload.fallbackPolicy as Record<string, unknown>).inlineSvgAllowed).toBe(true);
  });

  it('get_icon_catalog returns inline svg fallback guidance when no icon matches', async () => {
    const result = (await client.callTool({
      name: 'get_icon_catalog',
      arguments: {
        query: 'zzzz-no-match-zzzz',
        limit: 10,
      },
    })) as ToolResult;

    const payload = structured(result);

    expect(payload.count).toBe(0);
    expect((payload.fallbackPolicy as Record<string, unknown>).inlineSvgAllowed).toBe(true);
    expect((payload.fallbackSuggestion as Record<string, unknown>).strategy).toBe('inline-svg-fallback');
  });

  it('get_dashboard_context returns dashboard context contract', async () => {
    const result = (await client.callTool({
      name: 'get_dashboard_context',
      arguments: {
        includeRawMarkdown: true,
      },
    })) as ToolResult;

    const payload = structured(result);

    expect(typeof payload.title).toBe('string');
    expect(typeof payload.summary).toBe('string');
    expect(Array.isArray(payload.sections)).toBe(true);
    expect(payload.contextUrl).toBe('https://shadng.js.org/ai/sng-dashboard.md');
    expect(String(payload.rawMarkdown)).toContain('Sng Dashboard AI Context');
  });

  it('accepts selector and pascal-case component aliases', async () => {
    const docsResult = (await client.callTool({
      name: 'get_component_docs',
      arguments: { component: 'sng-button' },
    })) as ToolResult;

    const docsPayload = structured(docsResult);
    expect(docsPayload.component).toBe('button');

    const installResult = (await client.callTool({
      name: 'get_install_command',
      arguments: { components: ['SngButton', 'sng-table'] },
    })) as ToolResult;

    const installPayload = structured(installResult);
    const commands = installPayload.commands as string[];
    expect(commands).toContain('npx @shadng/sng-ui add button table');
  });

  it('returns build guidance for missing components', async () => {
    const result = (await client.callTool({
      name: 'get_component_docs',
      arguments: { component: 'sng-super-grid-pro' },
    })) as ToolResult;

    expect(result.isError).toBe(true);
    const payload = structured(result);
    expect((payload.error as Record<string, unknown>).code).toBe('DOC_NOT_FOUND');
    expect((payload.componentFallbackPolicy as Record<string, unknown>).customComponentAllowed).toBe(true);
    expect((payload.authoringGuide as Record<string, unknown>).reference).toContain('design references');
    expect(Array.isArray(payload.suggestedNextSteps)).toBe(true);
  });
});
