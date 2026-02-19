#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(packageRoot, '..', '..');
const serverEntry = path.join(packageRoot, 'dist', 'server.js');

function asObject(result) {
  if (result && typeof result.structuredContent === 'object' && result.structuredContent !== null) {
    return result.structuredContent;
  }

  const text = result?.content?.[0]?.text;
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
    cwd: workspaceRoot,
    stderr: 'pipe',
  });

  if (transport.stderr) {
    transport.stderr.on('data', (chunk) => {
      const text = String(chunk).trim();
      if (text) {
        process.stderr.write(`[sng-mcp] ${text}\n`);
      }
    });
  }

  const client = new Client({
    name: 'sng-mcp-stdio-smoke',
    version: '0.0.1',
  });

  await client.connect(transport);

  try {
    const tools = await client.listTools();
    const names = tools.tools.map((tool) => tool.name);

    assert(names.includes('list_components'), 'Missing tool: list_components');
    assert(names.includes('get_component_docs'), 'Missing tool: get_component_docs');
    assert(names.includes('get_component_examples'), 'Missing tool: get_component_examples');
    assert(names.includes('get_install_command'), 'Missing tool: get_install_command');
    assert(names.includes('get_dependency_map'), 'Missing tool: get_dependency_map');
    assert(names.includes('get_icon_catalog'), 'Missing tool: get_icon_catalog');
    assert(names.includes('get_dashboard_context'), 'Missing tool: get_dashboard_context');

    const listComponents = asObject(
      await client.callTool({
        name: 'list_components',
        arguments: { query: 'button' },
      })
    );
    const components = Array.isArray(listComponents.components) ? listComponents.components : [];
    assert((listComponents.count ?? 0) >= 1, 'list_components returned empty result');
    assert(
      components.some((item) => item && typeof item === 'object' && item.installName === 'button'),
      'list_components did not include button'
    );

    const docs = asObject(
      await client.callTool({
        name: 'get_component_docs',
        arguments: { component: 'button' },
      })
    );
    assert(docs.component === 'button', 'get_component_docs returned wrong component');
    assert(String(docs.docUrl) === 'https://shadng.js.org/ui/button.md', 'get_component_docs docUrl mismatch');

    const install = asObject(
      await client.callTool({
        name: 'get_install_command',
        arguments: { components: ['button', 'table'], includeInit: true },
      })
    );
    const commands = Array.isArray(install.commands) ? install.commands : [];
    assert(commands.includes('npx @shadng/sng-ui init'), 'get_install_command missing init command');
    assert(
      commands.includes('npx @shadng/sng-ui add button table'),
      'get_install_command missing multi add command'
    );

    const iconCatalog = asObject(
      await client.callTool({
        name: 'get_icon_catalog',
        arguments: { query: 'github', limit: 10 },
      })
    );
    assert((iconCatalog.count ?? 0) >= 1, 'get_icon_catalog returned zero results for github');

    const dashboard = asObject(
      await client.callTool({
        name: 'get_dashboard_context',
        arguments: {},
      })
    );
    assert(
      String(dashboard.contextUrl) === 'https://shadng.js.org/ai/sng-dashboard.md',
      'get_dashboard_context contextUrl mismatch'
    );

    console.log('sng-mcp stdio smoke: PASS');
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('sng-mcp stdio smoke: FAIL');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
