export type ToolErrorCode =
  | 'INVALID_INPUT'
  | 'COMPONENT_NOT_FOUND'
  | 'DOC_NOT_FOUND'
  | 'ICON_NOT_FOUND'
  | 'DATA_SOURCE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export type SnapshotSection = {
  heading: string;
  body: string;
};

export type SnapshotDependency = {
  name: string;
  kind: 'angular' | 'cdk' | 'sng-ui' | 'sng-icons' | 'external';
  notes?: string;
};

export type SnapshotExample = {
  id: string;
  title: string;
  previewPath: string;
  codePath: string;
};

export type SnapshotTocItem = {
  id: string;
  label: string;
};

export type SnapshotComponent = {
  slug: string;
  name: string;
  selector: string;
  installName: string;
  docUrl: string;
  deprecated: boolean;
  docs: {
    title: string;
    summary: string;
    sections: SnapshotSection[];
    installCommand: string;
    rawMarkdown: string;
    sourceFiles: string[];
  };
  examples: {
    items: SnapshotExample[];
    toc: SnapshotTocItem[];
    sourceFiles: string[];
  };
  dependencies: {
    dependencies: SnapshotDependency[];
    peerDependencies: string[];
    sourceFiles: string[];
  };
};

export type SnapshotIcon = {
  name: string;
  variant: 'regular' | 'solid';
  category: string;
};

export type SnapshotData = {
  generatedAt: string;
  sourceVersion: string;
  components: SnapshotComponent[];
  icons: SnapshotIcon[];
  authoringGuide: {
    title: string;
    summary: string;
    reference: string;
    rules: string[];
    sourceFiles: string[];
  };
  dashboardContext: {
    title: string;
    summary: string;
    sections: SnapshotSection[];
    rawMarkdown: string;
    contextUrl: string;
    sourceFiles: string[];
  };
};
