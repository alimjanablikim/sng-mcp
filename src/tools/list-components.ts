import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { buildMissingComponentExtras } from '../component-fallback.js';
import { SNAPSHOT_REBUILD_HINT } from '../constants.js';
import { TOOL_DEFINITIONS } from '../tool-definitions.js';
import { toToolError, toToolResponse } from '../tool-response.js';
import type { SnapshotData } from '../types.js';

export function registerListComponentsTool(server: McpServer, snapshotPromise: Promise<SnapshotData>) {
  server.registerTool(
    'list_components',
    TOOL_DEFINITIONS.list_components,
    async ({ query, includeDeprecated }) => {
      try {
        const snapshot = await snapshotPromise;
        const q = query?.trim().toLowerCase();

        const components = snapshot.components
          .filter((component) => (includeDeprecated ? true : !component.deprecated))
          .filter((component) => {
            if (!q) {
              return true;
            }
            return (
              component.name.toLowerCase().includes(q) ||
              component.selector.toLowerCase().includes(q) ||
              component.installName.toLowerCase().includes(q)
            );
          })
          .map((component) => ({
            name: component.name,
            selector: component.selector,
            installName: component.installName,
            docUrl: component.docUrl,
            deprecated: component.deprecated,
          }));

        return toToolResponse({
          components,
          count: components.length,
          queryFallback:
            q && components.length === 0
              ? {
                  query: q,
                  ...buildMissingComponentExtras(snapshot, [q]),
                }
              : undefined,
          sourceFiles: ['data/snapshot.json'],
        });
      } catch (error) {
        return toToolError(
          'DATA_SOURCE_UNAVAILABLE',
          `Failed to list components: ${(error as Error).message}`,
          SNAPSHOT_REBUILD_HINT
        );
      }
    }
  );
}
