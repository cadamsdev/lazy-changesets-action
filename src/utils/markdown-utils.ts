import { packageMetadata } from "./changelog-utils";

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

export function generateMarkdown(changesetMap: Map<string, ChangesetEntry>) {
  let markdown = '# Releases\n';

  Array.from(changesetMap.entries()).forEach(([key, value]) => {
    const metadata = packageMetadata.get(key);
    if (!metadata) {
      console.warn(`No metadata found for package: ${key}`);
      return;
    }

    markdown += `## ${key}@${value.version}`;

    if (metadata.newVersion) {
      markdown += `➡️${metadata.newVersion}`;
    }

    markdown += `\n\n`;

    if (value.breakingChanges.length > 0) {
      markdown += `### ⚠️ BREAKING CHANGES\n`;
      value.breakingChanges.forEach((entry) => {
        markdown += `- ${entry}\n`;
      });
    }

    const buckets = Object.keys(value.buckets).sort((a, b) => {
      const orderA = typeToDataDict[a]?.sortOrder ?? Infinity;
      const orderB = typeToDataDict[b]?.sortOrder ?? Infinity;
      return orderA - orderB;
    });

    buckets.forEach((type) => {
      const content = value.buckets[type];
      if (!content.length) {
        return;
      }

      markdown += `### ${typeToDataDict[type].emoji} ${type}\n`;
      content.forEach((entry) => {
        markdown += `- ${entry}\n`;
      });
    });
  });

  console.log('Generated markdown:', markdown);
  return markdown;
}

export function getMarkdownForEntry(
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

  return markdown;
}

