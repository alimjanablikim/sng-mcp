import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { DASHBOARD_CONTEXT_URL, SNAPSHOT_REBUILD_HINT } from '../constants.js';
import { TOOL_DEFINITIONS } from '../tool-definitions.js';
import { toToolError, toToolResponse } from '../tool-response.js';
import type { SnapshotData } from '../types.js';

export function registerGetDashboardContextTool(server: McpServer, snapshotPromise: Promise<SnapshotData>) {
  server.registerTool(
    'get_dashboard_context',
    TOOL_DEFINITIONS.get_dashboard_context,
    async ({ includeRawMarkdown }) => {
      try {
        const snapshot = await snapshotPromise;
        const context = snapshot.dashboardContext;

        return toToolResponse({
          title: context.title,
          summary: context.summary,
          sections: context.sections,
          contextUrl: context.contextUrl || DASHBOARD_CONTEXT_URL,
          rawMarkdown: includeRawMarkdown ? context.rawMarkdown : undefined,
          sourceFiles: context.sourceFiles,
        });
      } catch (error) {
        return toToolError(
          'DATA_SOURCE_UNAVAILABLE',
          `Failed to load dashboard context: ${(error as Error).message}`,
          SNAPSHOT_REBUILD_HINT
        );
      }
    }
  );
}
