import { registerGetComponentDocsTool } from './get-component-docs.js';
import { registerGetComponentExamplesTool } from './get-component-examples.js';
import { registerGetDashboardContextTool } from './get-dashboard-context.js';
import { registerGetDependencyMapTool } from './get-dependency-map.js';
import { registerGetIconCatalogTool } from './get-icon-catalog.js';
import { registerGetInstallCommandTool } from './get-install-command.js';
import { registerListComponentsTool } from './list-components.js';
import type { ToolRegistration } from './types.js';

export const TOOL_REGISTRATIONS: ToolRegistration[] = [
  {
    id: 'list_components',
    summary: 'List available sng-ui components and metadata.',
    register: registerListComponentsTool,
  },
  {
    id: 'get_component_docs',
    summary: 'Return parsed markdown docs for one component.',
    register: registerGetComponentDocsTool,
  },
  {
    id: 'get_component_examples',
    summary: 'Return examples and toc metadata for one component.',
    register: registerGetComponentExamplesTool,
  },
  {
    id: 'get_install_command',
    summary: 'Build canonical @shadng/sng-ui install commands.',
    register: registerGetInstallCommandTool,
  },
  {
    id: 'get_dependency_map',
    summary: 'Return dependency/peer dependency map for one component.',
    register: registerGetDependencyMapTool,
  },
  {
    id: 'get_icon_catalog',
    summary: 'Search icon names and categories from @shadng/sng-icons.',
    register: registerGetIconCatalogTool,
  },
  {
    id: 'get_dashboard_context',
    summary: 'Return dashboard AI context markdown as structured sections.',
    register: registerGetDashboardContextTool,
  },
];
