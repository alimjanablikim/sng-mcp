import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { SnapshotData } from '../types.js';

export type ToolRegistrar = (server: McpServer, snapshotPromise: Promise<SnapshotData>) => void;

export type ToolRegistration = {
  id: string;
  summary: string;
  register: ToolRegistrar;
};
