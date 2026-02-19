import * as z from 'zod/v4';

export const TOOL_DEFINITIONS = {
  list_components: {
    title: 'List Components',
    description: 'List available ShadNG UI components with selectors and docs URLs.',
    inputSchema: {
      query: z.string().optional(),
      includeDeprecated: z.boolean().optional(),
    },
  },
  get_component_docs: {
    title: 'Get Component Docs',
    description: 'Return parsed markdown docs for a ShadNG component.',
    inputSchema: {
      component: z.string(),
      includeRawMarkdown: z.boolean().optional(),
    },
  },
  get_component_examples: {
    title: 'Get Component Examples',
    description: 'Return available examples and toc entries for a component page.',
    inputSchema: {
      component: z.string(),
    },
  },
  get_install_command: {
    title: 'Get Install Command',
    description: 'Return canonical install commands for @shadng/sng-ui.',
    inputSchema: {
      components: z.array(z.string()).optional(),
      includeInit: z.boolean().optional(),
      includeAll: z.boolean().optional(),
    },
  },
  get_dependency_map: {
    title: 'Get Dependency Map',
    description: 'Return inferred Angular/CDK dependency usage for a component.',
    inputSchema: {
      component: z.string(),
    },
  },
  get_icon_catalog: {
    title: 'Get Icon Catalog',
    description: 'Return icon names from @shadng/sng-icons with optional filtering.',
    inputSchema: {
      query: z.string().optional(),
      variant: z.enum(['regular', 'solid']).optional(),
      limit: z.number().int().min(1).max(200).optional(),
    },
  },
  get_dashboard_context: {
    title: 'Get Dashboard Context',
    description: 'Return parsed AI context for the Sng Dashboard page.',
    inputSchema: {
      includeRawMarkdown: z.boolean().optional(),
    },
  },
} as const;
