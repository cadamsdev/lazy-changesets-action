import { read } from "gray-matter";
import { ChangesetEntry } from "./markdown-utils";
import { packageMetadata } from "./changelog-utils";

export function getChangeSetMap(
  changesetFiles: string[],
): Map<string, ChangesetEntry> {
  const changesetMap = new Map<string, ChangesetEntry>();
  for (const file of changesetFiles) {
    const data = read(file);
    Object.entries(data.data).forEach(([key, type]) => {
      const isBreakingChange = `${type}`.includes('!');
      let tempType = `${type}`.replace('!', '');
      if (changesetMap.has(key)) {
        const existingValue = changesetMap.get(key);
        if (existingValue) {
          existingValue.buckets[tempType] = existingValue.buckets[type] || [];

          if (isBreakingChange) {
            existingValue.breakingChanges.push(data.content.trim());
          } else {
            existingValue.buckets[tempType].push(data.content.trim());
          }
        }
      } else {
        const packageData = packageMetadata.get(key);
        changesetMap.set(key, {
          breakingChanges: isBreakingChange ? [data.content.trim()] : [],
          buckets: {
            [tempType]: isBreakingChange ? [] : [data.content.trim()],
          },
          version: packageData?.version || '0.0.0',
          isRoot: packageData?.isRoot || false,
          packageName: key,
        });
      }
    });
  }

  return changesetMap;
}

export function getTagNameForEntry(
  entry: ChangesetEntry,
): string {

  if (!entry.version) {
    throw new Error(`No version found for package: ${entry.packageName}`);
  }

  let tagName = '';

  if (entry.isRoot) {
    tagName = `v${entry.version}`;
  } else {
    tagName = `${entry.packageName}@${entry.version}`;
  }

  return tagName;
}
