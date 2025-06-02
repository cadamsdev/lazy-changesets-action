import { describe, it, expect } from 'vitest';
import { ChangesetEntry, generateMarkdown } from './markdown-utils';
import { PackageMetadata } from './changelog-utils';

describe('generateMarkdown', () => {
  it('should generate markdown for a given changeset map', () => {
    const packageMetadata = new Map<string, PackageMetadata>([
      [
        'package-a',
        {
          path: '',
          version: '1.0.0',
          newVersion: '1.1.0',
          isRoot: false,
          isPrivate: false,
          packageName: 'package-a',
          dependencyUpdates: [],
        },
      ],
      [
        'package-b',
        {
          path: '',
          version: '1.0.0',
          newVersion: '1.0.1',
          isRoot: false,
          isPrivate: false,
          packageName: 'package-b',
          dependencyUpdates: [
            {
              dependencyName: 'package-a',
              oldVersion: '1.0.0',
              newVersion: '1.1.0',
            },
          ],
        },
      ],
      [
        'package-c',
        {
          path: '',
          version: '1.0.0',
          newVersion: '1.0.0',
          isRoot: false,
          isPrivate: false,
          packageName: 'package-c',
          dependencyUpdates: [
            {
              dependencyName: 'package-b',
              oldVersion: '1.0.0',
              newVersion: '1.0.1',
            }
          ],
        },
      ],
    ]);

    const changesetMap = new Map<string, ChangesetEntry>([
      [
        'package-a',
        {
          breakingChanges: [],
          buckets: {
            feat: ['Added a new feature'],
            fix: ['Fixed a bug'],
          },
          version: '1.1.0',
          isRoot: false,
          packageName: 'package-a',
        },
      ],
      [
        'package-b',
        {
          breakingChanges: [],
          buckets: {
            chore: ['Updated dependencies'],
          },
          version: '1.0.1',
          isRoot: false,
          packageName: 'package-b',
        },
      ],
      [
        'package-c',
        {
          breakingChanges: [],
          buckets: {
          },
          version: '1.0.0',
          isRoot: false,
          packageName: 'package-c',
        },
      ],
    ]);

    const expectedMarkdown = `# Releases

## package-a
### 🚀 feat
- Added a new feature
### 🛠️ fix
- Fixed a bug

## package-b
### 🏠 chore
- Updated dependencies
### 📦 Updated Dependencies
- \`package-a\`: \`^1.0.0\` ➡️ \`^1.1.0\`

## package-c
### 📦 Updated Dependencies
- \`package-b\`: \`^1.0.0\` ➡️ \`^1.0.1\``;

    const result = generateMarkdown(packageMetadata, changesetMap);
    expect(result).toBe(expectedMarkdown);
  });

  it('should handle an empty changeset map', () => {
    const packageMetadata = new Map<string, PackageMetadata>([
      [
        'package-a',
        {
          path: '',
          version: '1.0.0',
          newVersion: '1.1.0',
          isRoot: false,
          isPrivate: false,
          packageName: 'package-a',
          dependencyUpdates: [],
        },
      ],
      [
        'package-b',
        {
          path: '',
          version: '1.0.0',
          newVersion: '1.0.1',
          isRoot: false,
          isPrivate: false,
          packageName: 'package-b',
          dependencyUpdates: [],
        },
      ],
    ]);

    const changesetMap = new Map<
      string,
      ChangesetEntry
    >();
    const expectedMarkdown = '# Releases\n\n';
    const result = generateMarkdown(packageMetadata, changesetMap);
    expect(result).toBe(expectedMarkdown);
  });
});
