#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const UI_DOC_BASE_URL = 'https://shadng.js.org/ui';
const DASHBOARD_CONTEXT_URL = 'https://shadng.js.org/ai/sng-dashboard.md';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(packageRoot, '..', '..');

const uiDocsDir = path.join(workspaceRoot, 'projects', 'sng-app', 'public', 'ui');
const uiPagesDir = path.join(workspaceRoot, 'projects', 'sng-app', 'src', 'app', 'pages', 'ui');
const sngUiLibDir = path.join(workspaceRoot, 'projects', 'sng-ui', 'src', 'lib');
const dashboardAiMdPath = path.join(workspaceRoot, 'projects', 'sng-app', 'public', 'ai', 'sng-dashboard.md');
const agentsPath = path.join(workspaceRoot, 'AGENTS.md');
const snapshotPath = path.join(packageRoot, 'data', 'snapshot.json');

function toPosixRelative(filePath) {
  return path.relative(workspaceRoot, filePath).replace(/\\/g, '/');
}

function slugToPascal(slug) {
  return `Sng${slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')}`;
}

function slugToSelector(slug) {
  return `sng-${slug}`;
}

function installCommandForSlugs(slugs) {
  if (slugs.length === 0) {
    return 'npx @shadng/sng-ui add --all';
  }
  return `npx @shadng/sng-ui add ${slugs.join(' ')}`;
}

function titleCaseCategory(raw) {
  return raw
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? '';
}

function extractSummary(markdown) {
  const lines = markdown.split(/\r?\n/);
  const titleIndex = lines.findIndex((line) => line.startsWith('# '));
  const start = titleIndex >= 0 ? titleIndex + 1 : 0;

  const collected = [];
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) {
      if (collected.length > 0) {
        break;
      }
      continue;
    }

    if (line.startsWith('#')) {
      if (collected.length > 0) {
        break;
      }
      continue;
    }

    collected.push(line);
  }

  return collected.join(' ').trim();
}

function extractSections(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];

  let currentHeading = '';
  let currentBody = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const headingMatch = line.match(/^##\s+(.+)$/);

    if (headingMatch) {
      if (currentHeading) {
        sections.push({
          heading: currentHeading,
          body: currentBody.join('\n').trim(),
        });
      }

      currentHeading = headingMatch[1].trim();
      currentBody = [];
      continue;
    }

    if (currentHeading) {
      currentBody.push(rawLine);
    }
  }

  if (currentHeading) {
    sections.push({
      heading: currentHeading,
      body: currentBody.join('\n').trim(),
    });
  }

  return sections.filter((section) => section.body.length > 0);
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function hasWorkspaceSources() {
  const requiredPaths = [uiDocsDir, uiPagesDir, sngUiLibDir, dashboardAiMdPath];
  const checks = await Promise.all(requiredPaths.map((entry) => exists(entry)));
  return checks.every(Boolean);
}

async function listFilesRecursive(dirPath) {
  const results = [];

  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
      } else {
        results.push(absolute);
      }
    }
  }

  if (await exists(dirPath)) {
    await walk(dirPath);
  }

  return results;
}

async function readJsonFile(filePath) {
  if (!(await exists(filePath))) {
    return null;
  }
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function componentSourceDirectories(slug) {
  const direct = path.join(sngUiLibDir, slug);
  const fallbackMap = {
    table: ['sng-table', 'sng-table-core'],
    'nav-menu': ['nav-menu'],
    'search-input': ['search-input'],
    'file-input': ['file-input'],
    'otp-input': ['otp-input'],
    layout: ['layout'],
  };

  const mapped = fallbackMap[slug] ?? [slug];
  const mappedPaths = mapped.map((name) => path.join(sngUiLibDir, name));

  return [direct, ...mappedPaths];
}

async function buildComponentDependencies(slug) {
  const sourceDirs = componentSourceDirectories(slug);
  const existingDirs = [];

  for (const dir of sourceDirs) {
    if (await exists(dir)) {
      existingDirs.push(dir);
    }
  }

  const files = (await Promise.all(existingDirs.map((dir) => listFilesRecursive(dir)))).flat();
  const sourceFiles = files
    .filter((file) => /\.(ts|html|css)$/.test(file))
    .sort((a, b) => a.localeCompare(b));

  const dependencies = new Map();
  dependencies.set('@angular/core', {
    name: '@angular/core',
    kind: 'angular',
  });

  for (const file of sourceFiles) {
    const content = await fs.readFile(file, 'utf8');

    const cdkMatches = content.match(/@angular\/cdk\/[a-z-]+/g) ?? [];
    for (const cdkPath of cdkMatches) {
      dependencies.set(cdkPath, {
        name: cdkPath,
        kind: 'cdk',
      });
    }

    const importMatches = [...content.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
    for (const importPath of importMatches) {
      if (importPath.startsWith('.')) {
        continue;
      }

      if (importPath.startsWith('@angular/cdk/')) {
        dependencies.set(importPath, { name: importPath, kind: 'cdk' });
        continue;
      }

      if (importPath.startsWith('@angular/')) {
        dependencies.set(importPath, { name: importPath, kind: 'angular' });
        continue;
      }

      if (importPath === '@shadng/sng-icons') {
        dependencies.set(importPath, {
          name: importPath,
          kind: 'sng-icons',
          notes: 'Used for icon rendering.',
        });
        continue;
      }

      dependencies.set(importPath, { name: importPath, kind: 'external' });
    }

    if (content.includes('sng-icon') || content.includes('@shadng/sng-icons')) {
      dependencies.set('@shadng/sng-icons', {
        name: '@shadng/sng-icons',
        kind: 'sng-icons',
        notes: 'Used for icon rendering.',
      });
    }
  }

  const peerDependencies = new Set();
  for (const dep of dependencies.values()) {
    if (dep.kind === 'angular' && dep.name.startsWith('@angular/')) {
      const parts = dep.name.split('/');
      if (parts.length >= 2) {
        peerDependencies.add(`${parts[0]}/${parts[1]}`);
      }
    }
    if (dep.kind === 'cdk') {
      peerDependencies.add('@angular/cdk');
    }
  }
  peerDependencies.add('@angular/core');

  return {
    dependencies: Array.from(dependencies.values()).sort((a, b) => a.name.localeCompare(b.name)),
    peerDependencies: Array.from(peerDependencies).sort((a, b) => a.localeCompare(b)),
    sourceFiles: sourceFiles.map(toPosixRelative),
  };
}

async function buildComponentExamples(slug) {
  const pageDir = path.join(uiPagesDir, slug);
  const examplesDir = path.join(pageDir, 'examples');
  const exampleFiles = (await listFilesRecursive(examplesDir))
    .filter((file) => file.endsWith('.ts'))
    .filter((file) => path.basename(file) !== 'index.ts')
    .sort((a, b) => a.localeCompare(b));

  const tocPath = path.join(pageDir, 'json', 'toc-items.json');
  const toc = (await readJsonFile(tocPath)) ?? [];

  const items = exampleFiles.map((file) => {
    const id = path.basename(file).replace(/\.ts$/, '');
    return {
      id,
      title: id
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' '),
      previewPath: toPosixRelative(file),
      codePath: toPosixRelative(file),
    };
  });

  const sourceFiles = [
    ...exampleFiles.map(toPosixRelative),
    ...(toc.length > 0 ? [toPosixRelative(tocPath)] : []),
  ].sort((a, b) => a.localeCompare(b));

  return {
    items,
    toc: toc.map((item) => ({
      id: item.id,
      label: item.label,
    })),
    sourceFiles,
  };
}

async function buildComponents() {
  const files = (await fs.readdir(uiDocsDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const components = [];
  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const mdPath = path.join(uiDocsDir, file);
    const markdown = await fs.readFile(mdPath, 'utf8');
    const installMatch = markdown.match(/npx\s+@shadng\/sng-ui\s+add\s+[^\n`]+/);

    components.push({
      slug,
      name: slugToPascal(slug),
      selector: slugToSelector(slug),
      installName: slug,
      docUrl: `${UI_DOC_BASE_URL}/${slug}.md`,
      deprecated: false,
      docs: {
        title: extractTitle(markdown),
        summary: extractSummary(markdown),
        sections: extractSections(markdown),
        installCommand: installMatch?.[0]?.trim() ?? installCommandForSlugs([slug]),
        rawMarkdown: markdown,
        sourceFiles: [toPosixRelative(mdPath)],
      },
      examples: await buildComponentExamples(slug),
      dependencies: await buildComponentDependencies(slug),
    });
  }

  return components;
}

async function buildIconCatalog() {
  const require = createRequire(import.meta.url);
  const packageJsonPath = require.resolve('@shadng/sng-icons/package.json', {
    paths: [workspaceRoot, packageRoot],
  });
  const packageDir = path.dirname(packageJsonPath);
  const typesFile = path.join(packageDir, 'dist', 'types', 'shadng-sng-icons.d.ts');

  const raw = await fs.readFile(typesFile, 'utf8');
  const blockRegex = /\/\*\*([\s\S]*?)\*\/\s*declare const ([a-zA-Z0-9]+): IconData;/g;

  const icons = [];
  let match = blockRegex.exec(raw);

  while (match) {
    const jsDoc = match[1] ?? '';
    const constName = match[2] ?? '';

    const typeMatch = jsDoc.match(/@type\s+(regular|solid)/);
    const categoryMatch = jsDoc.match(/@category\s+([^\n\r*]+)/);
    const nameMatch = jsDoc.match(/@name\s+([^\n\r*]+)/);

    const inferredVariant = constName.endsWith('Regular')
      ? 'regular'
      : constName.endsWith('Solid')
        ? 'solid'
        : null;
    const variant = typeMatch?.[1] ?? inferredVariant;

    if (!variant) {
      match = blockRegex.exec(raw);
      continue;
    }

    const name = (nameMatch?.[1] ?? constName)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
    const category = titleCaseCategory((categoryMatch?.[1] ?? 'other').trim());

    icons.push({
      name,
      variant,
      category,
    });

    match = blockRegex.exec(raw);
  }

  icons.sort((a, b) => {
    const nameCmp = a.name.localeCompare(b.name);
    if (nameCmp !== 0) {
      return nameCmp;
    }
    return a.variant.localeCompare(b.variant);
  });

  return {
    icons,
    sourceFile: toPosixRelative(typesFile),
  };
}

async function buildDashboardContext() {
  const markdown = await fs.readFile(dashboardAiMdPath, 'utf8');

  return {
    title: extractTitle(markdown),
    summary: extractSummary(markdown),
    sections: extractSections(markdown),
    rawMarkdown: markdown,
    contextUrl: DASHBOARD_CONTEXT_URL,
    sourceFiles: [toPosixRelative(dashboardAiMdPath)],
  };
}

async function buildAuthoringGuide() {
  const rules = [
    'Prefer element selectors with sng- prefix (for example: selector: "sng-foo").',
    'Prefer Angular Signal API patterns (input/model/output/signal/computed/linkedSignal).',
    'Prefer modern template control flow (@if and @for with track).',
    'For style customization, prefer class input and keep this.class() last so user classes can win.',
    'Prefer semantic design tokens (bg-primary, text-foreground) over fixed color values.',
    'Prefer deterministic interaction flow over keyboard maps and timing workarounds when possible.',
    'If a component is missing in sng-ui, build a custom component using ShadNG patterns.',
  ];

  const sourceFiles = [];
  if (await exists(agentsPath)) {
    sourceFiles.push(toPosixRelative(agentsPath));
  }

  return {
    title: 'ShadNG Component Authoring Guide',
    summary:
      'When a requested component or behavior is missing from @shadng/sng-ui, it is recommended to create a custom component that follows ShadNG architecture and styling patterns.',
    reference:
      'Use shadcn/ui design references for visual direction, then implement in Angular with ShadNG patterns.',
    rules,
    sourceFiles,
  };
}

function gitSourceVersion() {
  try {
    return execSync('git rev-parse HEAD', {
      cwd: workspaceRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

async function main() {
  if (!(await hasWorkspaceSources())) {
    if (await exists(snapshotPath)) {
      console.log('Workspace sources not found; keeping existing snapshot.json');
      return;
    }

    throw new Error('Workspace sources not found and no existing snapshot.json is available.');
  }

  const [components, iconCatalog, dashboardContext, authoringGuide] = await Promise.all([
    buildComponents(),
    buildIconCatalog(),
    buildDashboardContext(),
    buildAuthoringGuide(),
  ]);

  const nextSnapshot = {
    generatedAt: new Date().toISOString(),
    sourceVersion: gitSourceVersion(),
    components,
    icons: iconCatalog.icons,
    authoringGuide,
    dashboardContext,
  };

  const stableCurrent = {
    components,
    icons: iconCatalog.icons,
    authoringGuide,
    dashboardContext,
  };

  if (await exists(snapshotPath)) {
    const raw = await fs.readFile(snapshotPath, 'utf8');
    const current = JSON.parse(raw);
    const stableExisting = {
      components: current.components ?? [],
      icons: current.icons ?? [],
      authoringGuide: current.authoringGuide ?? {},
      dashboardContext: current.dashboardContext ?? {},
    };

    if (JSON.stringify(stableExisting) === JSON.stringify(stableCurrent)) {
      console.log(`sng-mcp snapshot up-to-date: ${toPosixRelative(snapshotPath)}`);
      console.log(`components: ${components.length}`);
      console.log(`icons: ${iconCatalog.icons.length}`);
      return;
    }
  }

  await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
  await fs.writeFile(snapshotPath, `${JSON.stringify(nextSnapshot, null, 2)}\n`, 'utf8');

  console.log(`sng-mcp snapshot written: ${toPosixRelative(snapshotPath)}`);
  console.log(`components: ${components.length}`);
  console.log(`icons: ${iconCatalog.icons.length}`);
}

main().catch((error) => {
  console.error('Failed to build sng-mcp snapshot:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
