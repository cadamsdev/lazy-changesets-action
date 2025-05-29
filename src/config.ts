import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface ChangesetConfig {
  access: 'restricted' | 'public';
  baseBranch: string;
}

export function readConfig(): ChangesetConfig {
  const changesetsDir = '.changeset';

  if (!existsSync(changesetsDir)) {
    throw new Error(`Directory ${changesetsDir} does not exist.`);
  }

  const configPath = path.join(changesetsDir, 'config.json');

  if (!existsSync(configPath)) {
    throw new Error(`File ${configPath} does not exist.`);
  }

  const fileData = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(fileData) as ChangesetConfig;
  return {
    ...config,
    access: config.access || 'restricted',
    baseBranch: config.baseBranch || 'main',
  };
}
