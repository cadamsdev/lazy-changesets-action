import { describe, it, expect } from 'vitest';
import { ChangesetEntry, generateMarkdown } from './markdown-utils';

describe('generateMarkdown', () => {
  it('should generate markdown for a given changeset map', () => {
    const changesetMap = new Map<
      string,
      ChangesetEntry
    >([
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
    ]);

    const expectedMarkdown = `# Releases
## package-a

## 🚀 feat
- Added a new feature
## 🛠️ fix
- Fixed a bug
## package-b

## 🏠 chore
- Updated dependencies
`;

    const result = generateMarkdown(changesetMap);
    expect(result).toBe(expectedMarkdown);
  });

  it('should handle an empty changeset map', () => {
    const changesetMap = new Map<
      string,
      ChangesetEntry
    >();
    const expectedMarkdown = '# Releases\n';
    const result = generateMarkdown(changesetMap);
    expect(result).toBe(expectedMarkdown);
  });
});
