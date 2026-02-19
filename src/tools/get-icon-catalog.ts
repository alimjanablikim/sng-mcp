import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { SNAPSHOT_REBUILD_HINT } from '../constants.js';
import { TOOL_DEFINITIONS } from '../tool-definitions.js';
import { toToolError, toToolResponse } from '../tool-response.js';
import type { SnapshotData } from '../types.js';

export function registerGetIconCatalogTool(server: McpServer, snapshotPromise: Promise<SnapshotData>) {
  server.registerTool(
    'get_icon_catalog',
    TOOL_DEFINITIONS.get_icon_catalog,
    async ({ query, variant, limit }) => {
      try {
        const snapshot = await snapshotPromise;
        const q = query?.trim().toLowerCase();
        const max = Math.min(Math.max(limit ?? 50, 1), 200);

        const filtered = snapshot.icons.filter((icon) => {
          if (variant && icon.variant !== variant) {
            return false;
          }
          if (!q) {
            return true;
          }
          return icon.name.toLowerCase().includes(q) || icon.category.toLowerCase().includes(q);
        });

        const fallbackPolicy = {
          preferredSource: '@shadng/sng-icons',
          inlineSvgAllowed: true,
          guidance: 'If no suitable icon is found in @shadng/sng-icons, use inline SVG.',
        };

        const fallbackSuggestion =
          filtered.length === 0
            ? {
                strategy: 'inline-svg-fallback',
                reason: query
                  ? `No matching icon found for '${query}'.`
                  : 'No matching icon found for current filters.',
                example: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">...</svg>',
              }
            : undefined;

        return toToolResponse({
          icons: filtered.slice(0, max),
          count: filtered.length,
          fallbackPolicy,
          fallbackSuggestion,
          sourceFiles: ['data/snapshot.json'],
        });
      } catch (error) {
        return toToolError(
          'DATA_SOURCE_UNAVAILABLE',
          `Failed to load icon catalog: ${(error as Error).message}`,
          SNAPSHOT_REBUILD_HINT
        );
      }
    }
  );
}
