import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { buildMissingComponentExtras } from '../component-fallback.js';
import { SNAPSHOT_REBUILD_HINT, UI_DOC_BASE_URL } from '../constants.js';
import { TOOL_DEFINITIONS } from '../tool-definitions.js';
import { toToolError, toToolResponse } from '../tool-response.js';
import { normalizeComponentSlug, resolveComponentSlug } from '../tool-utils.js';
import type { SnapshotData } from '../types.js';

export function registerGetComponentDocsTool(server: McpServer, snapshotPromise: Promise<SnapshotData>) {
  server.registerTool(
    'get_component_docs',
    TOOL_DEFINITIONS.get_component_docs,
    async ({ component, includeRawMarkdown }) => {
      try {
        const snapshot = await snapshotPromise;
        const slug = resolveComponentSlug(component, snapshot.components) ?? normalizeComponentSlug(component);
        const item = snapshot.components.find((entry) => entry.slug === slug);

        if (!item) {
          return toToolError(
            'DOC_NOT_FOUND',
            `Component docs not found for '${slug}'.`,
            'Use list_components to discover available component names.',
            buildMissingComponentExtras(snapshot, [component, slug])
          );
        }

        return toToolResponse({
          component: slug,
          title: item.docs.title,
          summary: item.docs.summary,
          sections: item.docs.sections,
          installCommand: item.docs.installCommand,
          docUrl: item.docUrl || `${UI_DOC_BASE_URL}/${slug}.md`,
          rawMarkdown: includeRawMarkdown ? item.docs.rawMarkdown : undefined,
          sourceFiles: item.docs.sourceFiles,
        });
      } catch (error) {
        return toToolError(
          'DATA_SOURCE_UNAVAILABLE',
          `Failed to load component docs: ${(error as Error).message}`,
          SNAPSHOT_REBUILD_HINT
        );
      }
    }
  );
}
