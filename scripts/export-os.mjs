#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');

const EXPORT_ITEMS = ['.gitignore', 'README.md', 'package.json', 'tsconfig.json', 'vitest.config.ts', 'src', 'tests', 'scripts', 'data'];

function parseTargetArg(argv) {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--target') {
      return argv[i + 1] ?? '';
    }
    if (arg.startsWith('--target=')) {
      return arg.slice('--target='.length);
    }
  }
  return '';
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function cleanTargetDir(targetDir) {
  await fs.mkdir(targetDir, { recursive: true });
  const entries = await fs.readdir(targetDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === '.git') {
      continue;
    }
    await fs.rm(path.join(targetDir, entry.name), {
      recursive: true,
      force: true,
    });
  }
}

async function copyItem(name, targetDir) {
  const sourcePath = path.join(packageRoot, name);
  const targetPath = path.join(targetDir, name);

  if (!(await exists(sourcePath))) {
    return;
  }

  await fs.cp(sourcePath, targetPath, {
    recursive: true,
    force: true,
  });
}

async function main() {
  const targetInput = parseTargetArg(process.argv.slice(2));
  if (!targetInput) {
    throw new Error('Missing --target <path>. Example: npm run mcp:sng:export-os -- --target ../sng-mcp-os');
  }

  const targetDir = path.resolve(process.cwd(), targetInput);
  if (targetDir === packageRoot) {
    throw new Error('Target path cannot be the same as packages/sng-mcp.');
  }

  await cleanTargetDir(targetDir);

  for (const item of EXPORT_ITEMS) {
    await copyItem(item, targetDir);
  }

  console.log(`sng-mcp export complete: ${targetDir}`);
  console.log('Copied:', EXPORT_ITEMS.join(', '));
}

main().catch((error) => {
  console.error('Failed to export sng-mcp:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
