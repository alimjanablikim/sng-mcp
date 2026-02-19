import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { SnapshotData } from './types.js';

export async function loadSnapshot(): Promise<SnapshotData> {
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFilePath);

  const candidates = [
    path.resolve(currentDir, '../data/snapshot.json'),
    path.resolve(currentDir, '../../data/snapshot.json'),
  ];

  let lastError: Error | null = null;

  for (const filePath of candidates) {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as SnapshotData;

      if (
        !Array.isArray(parsed.components) ||
        !Array.isArray(parsed.icons) ||
        !parsed.dashboardContext ||
        !parsed.authoringGuide
      ) {
        throw new Error('Snapshot file is present but invalid.');
      }

      return parsed;
    } catch (error) {
      lastError = error as Error;
    }
  }

  throw new Error(
    `Could not load snapshot data (tried ${candidates.join(', ')}). ${lastError?.message ?? ''}`.trim()
  );
}
