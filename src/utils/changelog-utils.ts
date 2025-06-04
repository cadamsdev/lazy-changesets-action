import { existsSync, readFileSync, writeFileSync } from "fs";
import { ChangesetEntry } from "./markdown-utils";
import { join } from "path";
import { ChangesetConfig } from "../changeset";

export interface PackageMetadata {
  path: string;
  version: string;
  newVersion?: string;
  isRoot: boolean;
  isPrivate: boolean;
  packageName: string;
  dependencyUpdates?: Array<{
    dependencyName: string;
    oldVersion: string;
    newVersion: string;
  }>;
}

export const packageMetadata = new Map<string, PackageMetadata>();

export function createOrUpdateChangelog(config: ChangesetConfig, changesetMap: Map<string, ChangesetEntry>) {
  Array.from(changesetMap.entries()).forEach(([packageName, entry]) => {
    const metadata = packageMetadata.get(packageName);
    if (!metadata) {
      console.warn(`No metadata found for package: ${packageName}`);
      return;
    }

    const changelogPath = join(rewritePath(metadata.path), 'CHANGELOG.md');
    if (!existsSync(changelogPath)) {
      console.log(`Creating changelog file at ${changelogPath}`);

      let content = `# ${packageName}\n\n`;

      const changelogContent = getChangelogContent(
        config,
        metadata,
        entry,
      );

      if (changelogContent) {
        content += changelogContent;
        writeFileSync(changelogPath, content, 'utf-8');
      }
    } else {
      let existingContent = readFileSync(changelogPath, 'utf-8');
      if (!existingContent) {
        console.warn(`Changelog file is empty: ${changelogPath}`);
        return;
      }

      // update package name
      existingContent = existingContent.replace(
        /^# .+/m,
        `# ${packageName}`,
      );

      console.log(`Updating changelog file at ${changelogPath}`);

      const newContent = getChangelogContent(
        config,
        metadata,
        entry,
      );

      // append changlogContent to existing content

      existingContent = existingContent.replace(
        /(^# .+\n)/m,
        `$1${newContent}\n`,
      );
      

      writeFileSync(changelogPath, existingContent, 'utf-8');
    }
  });
}

function getChangelogContent(
  config: ChangesetConfig,
  packageMetaData: PackageMetadata,
  entry: ChangesetEntry,
): string {
  const changesetTypes = config.lazyChangesets.types;

  let content = `## ${packageMetaData.newVersion}\n\n`;

  if (entry.breakingChanges.length > 0) {
    content += `### ⚠️ BREAKING CHANGES\n`;
    entry.breakingChanges.forEach((entry) => {
      content += `- ${entry}\n`;
    });
  }

  const buckets = Object.keys(entry.buckets).sort((a, b) => {
    const orderA = changesetTypes[a]?.sort ?? Infinity;
    const orderB = changesetTypes[b]?.sort ?? Infinity;
    return orderA - orderB;
  });

  buckets.forEach((bucket) => {
    const items = entry.buckets[bucket];
    if (!items.length) {
      return;
    }

    const changesetType = changesetTypes[bucket];
    content += `### ${changesetType.emoji} ${changesetType.displayName}\n`;
    items.forEach((entry) => {
      content += `- ${entry}\n`;
    });
  });

  if (packageMetaData.dependencyUpdates && packageMetaData.dependencyUpdates.length > 0) {
    content += `### 📦 Updated Dependencies\n`;
    packageMetaData.dependencyUpdates.forEach((update) => {
      content += `- \`${update.dependencyName}\`: \`^${update.oldVersion}\` ➡️ \`^${update.newVersion}\`\n`;
    });
    content += `\n`;
  }

  return content;
}

function rewritePath(path: string): string {
  return './' + path.replace(/\/?package.json/, '');
}
