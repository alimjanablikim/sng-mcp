import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerTools } from './register-tools.js';
import { loadSnapshot } from './snapshot.js';

export async function createServer() {
  const snapshotPromise = loadSnapshot();
  const server = new McpServer({
    name: 'sng-mcp',
    version: '0.1.0-dev',
  });

  registerTools(server, snapshotPromise);
  return server;
}
