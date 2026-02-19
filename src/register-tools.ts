import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { TOOL_REGISTRATIONS } from './tools/index.js';
import type { SnapshotData } from './types.js';

export function registerTools(server: McpServer, snapshotPromise: Promise<SnapshotData>) {
  const seenIds = new Set<string>();

  for (const tool of TOOL_REGISTRATIONS) {
    if (seenIds.has(tool.id)) {
      throw new Error(`Duplicate MCP tool id: ${tool.id}`);
    }
    seenIds.add(tool.id);
    tool.register(server, snapshotPromise);
  }
}
