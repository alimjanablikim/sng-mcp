import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { buildMissingComponentExtras } from '../component-fallback.js';
import { SNAPSHOT_REBUILD_HINT } from '../constants.js';
import { TOOL_DEFINITIONS } from '../tool-definitions.js';
import { toToolError, toToolResponse } from '../tool-response.js';
import { normalizeComponentSlug, resolveComponentSlug } from '../tool-utils.js';
import type { SnapshotData } from '../types.js';

export function registerGetDependencyMapTool(server: McpServer, snapshotPromise: Promise<SnapshotData>) {
  server.registerTool(
    'get_dependency_map',
    TOOL_DEFINITIONS.get_dependency_map,
    async ({ component }) => {
      try {
        const snapshot = await snapshotPromise;
        const slug = resolveComponentSlug(component, snapshot.components) ?? normalizeComponentSlug(component);
        const item = snapshot.components.find((entry) => entry.slug === slug);

        if (!item) {
          return toToolError(
            'COMPONENT_NOT_FOUND',
            `Component source not found for '${slug}'.`,
            'Use list_components to discover valid names.',
            buildMissingComponentExtras(snapshot, [component, slug])
          );
        }

        return toToolResponse({
          component: slug,
          dependencies: item.dependencies.dependencies,
          peerDependencies: item.dependencies.peerDependencies,
          sourceFiles: item.dependencies.sourceFiles,
        });
      } catch (error) {
        return toToolError(
          'DATA_SOURCE_UNAVAILABLE',
          `Failed to build dependency map: ${(error as Error).message}`,
          SNAPSHOT_REBUILD_HINT
        );
      }
    }
  );
}
