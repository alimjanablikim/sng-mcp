import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { buildMissingComponentExtras } from '../component-fallback.js';
import { SNAPSHOT_REBUILD_HINT } from '../constants.js';
import { TOOL_DEFINITIONS } from '../tool-definitions.js';
import { toToolError, toToolResponse } from '../tool-response.js';
import { installCommandForSlugs, normalizeComponentSlug, resolveComponentSlug } from '../tool-utils.js';
import type { SnapshotData } from '../types.js';

export function registerGetInstallCommandTool(server: McpServer, snapshotPromise: Promise<SnapshotData>) {
  server.registerTool(
    'get_install_command',
    TOOL_DEFINITIONS.get_install_command,
    async ({ components, includeInit, includeAll }) => {
      try {
        const snapshot = await snapshotPromise;
        const requested = (components ?? []).map((item) => ({
          raw: item,
          normalized: normalizeComponentSlug(item),
          resolved: resolveComponentSlug(item, snapshot.components),
        }));

        const missing = requested.filter((item) => !item.resolved).map((item) => item.normalized);
        if (missing.length > 0) {
          return toToolError(
            'COMPONENT_NOT_FOUND',
            `Unknown component(s): ${missing.join(', ')}`,
            'Use list_components to discover valid names.',
            buildMissingComponentExtras(snapshot, missing)
          );
        }

        const normalized = Array.from(
          new Set(
            requested
              .map((item) => item.resolved)
              .filter((item): item is string => typeof item === 'string' && item.length > 0)
          )
        );

        const commands: string[] = [];

        if (includeInit) {
          commands.push('npx @shadng/sng-ui init');
        }

        if (normalized.length > 0) {
          commands.push(installCommandForSlugs(normalized));
        }

        if (includeAll || commands.length === 0) {
          commands.push('npx @shadng/sng-ui add --all');
        }

        return toToolResponse({
          commands,
          sourceFiles: ['data/snapshot.json'],
        });
      } catch (error) {
        return toToolError(
          'DATA_SOURCE_UNAVAILABLE',
          `Failed to build install command: ${(error as Error).message}`,
          SNAPSHOT_REBUILD_HINT
        );
      }
    }
  );
}
