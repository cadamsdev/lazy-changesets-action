import { describe, it, expect, vi } from 'vitest';
import { ChangesetEntry, generateMarkdown } from './markdown-utils';
import { PackageMetadata } from './changelog-utils';
import { readConfig } from '../config';

vi.mock('../config', () => ({
  readConfig: () => ({
    lazyChangesets: {
      types: {
        feat: {
          displayName: 'New Features',
          emoji: '🚀',
          sort: 0,
        },
        fix: {
          displayName: 'Bug Fixes',
          emoji: '🐛',
          sort: 1,
        },
        perf: {
          displayName: 'Performance Improvements',
          emoji: '⚡️',
          sort: 2,
        },
        chore: {
          displayName: 'Chores',
          emoji: '🏠',
          sort: 3,
        },
        docs: {
          displayName: 'Documentation',
          emoji: '📚',
          sort: 4,
        },
      },
    },
  })
}));

describe('generateMarkdown', () => {
  it('should generate markdown for a given changeset map', () => {
    const config = readConfig();
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
### 🚀 New Features
- Added a new feature
### 🐛 Bug Fixes
- Fixed a bug

## package-b
### 🏠 Chores
- Updated dependencies
### 📦 Updated Dependencies
- \`package-a\`: \`^1.0.0\` ➡️ \`^1.1.0\`

## package-c
### 📦 Updated Dependencies
- \`package-b\`: \`^1.0.0\` ➡️ \`^1.0.1\``;

    const result = generateMarkdown(config, packageMetadata, changesetMap);
    expect(result).toBe(expectedMarkdown);
  });

  it('should handle an empty changeset map', () => {
    const config = readConfig();
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
    const result = generateMarkdown(config, packageMetadata, changesetMap);
    expect(result).toBe(expectedMarkdown);
  });
});
