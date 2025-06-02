import { PackageMetadata } from "./changelog-utils";

export interface ChangesetEntry {
  breakingChanges: string[];
  buckets: {
    [key: string]: string[];
  };
  version: string;
  isRoot: boolean;
  packageName: string;
}

export interface TypeData {
  emoji: string;
  sortOrder: number;
}

export const typeToDataDict: { [key: string]: TypeData } = {
  feat: { emoji: '🚀', sortOrder: 0 },
  fix: { emoji: '🛠️', sortOrder: 1 },
  perf: { emoji: '⚡️', sortOrder: 2 },
  chore: { emoji: '🏠', sortOrder: 3 },
  docs: { emoji: '📚', sortOrder: 4 },
  style: { emoji: '🎨', sortOrder: 5 },
  refactor: { emoji: '♻️', sortOrder: 6 },
  test: { emoji: '✅', sortOrder: 7 },
  build: { emoji: '📦', sortOrder: 8 },
  ci: { emoji: '🤖', sortOrder: 9 },
  revert: { emoji: '⏪', sortOrder: 10 },
};

export function generateMarkdown(packageData: Map<string, PackageMetadata>, changesetMap: Map<string, ChangesetEntry>) {
  let markdown = '# Releases\n\n';

  const sortedPackages = Array.from(packageData).sort((a, b) => {
    const [keyA, metaA] = a;
    const [keyB, metaB] = b;

    if (metaA.isRoot && !metaB.isRoot) {
      return -1; // Root package first
    } else if (!metaA.isRoot && metaB.isRoot) {
      return 1; // Non-root package after root
    }

    return keyA.localeCompare(keyB); // Sort alphabetically otherwise
  });

  sortedPackages.forEach(([key, metadata], index) => {
    const entry = changesetMap.get(key);

    const hasChanges = !!entry || !!metadata.dependencyUpdates?.length;

    if (!hasChanges) {
      console.log(`No changes for ${key}, skipping...`);
      return;
    }

    markdown += `## ${key}`;

    if (entry && entry.version && entry.version !== metadata.newVersion) {
      markdown += `@${entry.version}`;

      if (metadata.newVersion) {
        markdown += `➡️${metadata.newVersion}`;
      }
    }

    markdown += `\n`;

    if (entry) {
      if (entry.breakingChanges.length > 0) {
        markdown += `### ⚠️ BREAKING CHANGES\n`;
        entry.breakingChanges.forEach((entry) => {
          markdown += `- ${entry}\n`;
        });
      }

      const buckets = Object.keys(entry.buckets).sort((a, b) => {
        const orderA = typeToDataDict[a]?.sortOrder ?? Infinity;
        const orderB = typeToDataDict[b]?.sortOrder ?? Infinity;
        return orderA - orderB;
      });

      buckets.forEach((type) => {
        const content = entry.buckets[type];
        if (!content.length) {
          return;
        }

        markdown += `### ${typeToDataDict[type].emoji} ${type}\n`;
        content.forEach((entry) => {
          markdown += `- ${entry}\n`;
        });
      });
    }

    // Add dependency updates section
    const depUpdatesLength = metadata.dependencyUpdates?.length || 0;
    if (metadata.dependencyUpdates && depUpdatesLength > 0) {
      markdown += `### 📦 Updated Dependencies\n`;
      metadata.dependencyUpdates.forEach((update, depIndex) => {
        markdown += `- \`${update.dependencyName}\`: \`^${update.oldVersion}\` ➡️ \`^${update.newVersion}\``;

        if (depIndex < depUpdatesLength - 1) {
          markdown += '\n';
        } else if (depIndex === depUpdatesLength - 1 && index < sortedPackages.length - 1) {
          markdown += '\n';
        }
      });
    }

    if (index < sortedPackages.length - 1) {
      markdown += '\n';
    }
  });

  console.log('Generated markdown:', markdown);
  return markdown;
}

export function getMarkdownForEntry(
  packageMetadata: Map<string, PackageMetadata>,
  entry: ChangesetEntry,
): string {
  let markdown = '';

  if (entry.breakingChanges.length > 0) {
    markdown += `\n\n### ⚠️ BREAKING CHANGES\n`;
    entry.breakingChanges.forEach((entry) => {
      markdown += `- ${entry}\n`;
    });
  }

  const buckets = Object.keys(entry.buckets).sort((a, b) => {
    const orderA = typeToDataDict[a]?.sortOrder ?? Infinity;
    const orderB = typeToDataDict[b]?.sortOrder ?? Infinity;
    return orderA - orderB;
  });

  buckets.forEach((type) => {
    const content = entry.buckets[type];
    if (!content.length) {
      return;
    }

    markdown += `### ${typeToDataDict[type].emoji} ${type}\n`;
    content.forEach((entry) => {
      markdown += `- ${entry}\n`;
    });
  });

  const metadata = packageMetadata.get(entry.packageName);
  if (metadata?.dependencyUpdates && metadata.dependencyUpdates.length > 0) {
    markdown += `\n### 📦 Updated Dependencies\n`;
    metadata.dependencyUpdates.forEach((update) => {
      markdown += `- \`${update.dependencyName}\`: \`^${update.oldVersion}\` ➡️ \`^${update.newVersion}\`\n`;
    });
  }

  return markdown;
}

