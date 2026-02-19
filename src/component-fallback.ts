import type { SnapshotData } from './types.js';

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function buildMissingComponentExtras(
  snapshot: SnapshotData,
  requested: string[],
  availableSampleSize = 12
) {
  const sample = snapshot.components
    .map((component) => component.installName)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, availableSampleSize);

  return {
    missingComponents: unique(requested),
    componentFallbackPolicy: {
      preferredSource: '@shadng/sng-ui',
      customComponentAllowed: true,
      guidance:
        'If a component or behavior is missing in @shadng/sng-ui, build a custom component that follows ShadNG authoring rules.',
    },
    authoringGuide: snapshot.authoringGuide,
    suggestedNextSteps: [
      'Use list_components to verify current component coverage.',
      'Use get_component_docs on similar components to mirror API/style patterns.',
      'Create a custom sng- component and keep user classes override-friendly.',
      'Use shadcn/ui design references for visual direction, then implement with Angular and ShadNG patterns.',
    ],
    availableComponentSample: sample,
  };
}
