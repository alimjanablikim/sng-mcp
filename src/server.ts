#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createServer } from './create-server.js';

export { createServer };

async function main() {
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('sng-mcp server running on stdio');
}

const currentFilePath = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] ? path.resolve(process.argv[1]) === currentFilePath : false;

if (isDirectRun) {
  main().catch((error) => {
    console.error('sng-mcp fatal error:', error);
    process.exit(1);
  });
}
