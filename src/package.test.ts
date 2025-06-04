import { describe, it, expect } from 'vitest';
import { getSafeOutputName, updateDependencyVersion } from './package';

describe('updateDependencyVersion', () => {
  it('should update standard caret dependencies', () => {
    const packageJson = `{
      "dependencies": {
        "test-package": "^1.0.0"
      }
    }`;

    const result = updateDependencyVersion(packageJson, 'test-package', {
      oldVersion: '1.0.0',
      newVersion: '2.0.0',
    });

    expect(result.updated).toBe(true);
    expect(result.content).toContain('"test-package": "^2.0.0"');
  });

  it('should update workspace caret dependencies', () => {
    const packageJson = `{
      "dependencies": {
        "test-package": "workspace:^1.0.0"
      }
    }`;

    const result = updateDependencyVersion(packageJson, 'test-package', {
      oldVersion: '1.0.0',
      newVersion: '2.0.0',
    });

    expect(result.updated).toBe(true);
    expect(result.content).toContain('"test-package": "workspace:^2.0.0"');
  });

  it('should update fixed version dependencies', () => {
    const packageJson = `{
      "dependencies": {
        "test-package": "1.0.0"
      }
    }`;

    const result = updateDependencyVersion(packageJson, 'test-package', {
      oldVersion: '1.0.0',
      newVersion: '2.0.0',
    });

    expect(result.updated).toBe(true);
    expect(result.content).toContain('"test-package": "^2.0.0"');
  });

  it('should update fixed workspace version dependencies', () => {
    const packageJson = `{
      "dependencies": {
        "test-package": "workspace:1.0.0"
      }
    }`;

    const result = updateDependencyVersion(packageJson, 'test-package', {
      oldVersion: '1.0.0',
      newVersion: '2.0.0',
    });

    expect(result.updated).toBe(true);
    expect(result.content).toContain('"test-package": "workspace:^2.0.0"');
  });

  it('should update dependencies with extra whitespace', () => {
    const packageJson = `{
      "dependencies": {
        "test-package"  :  "^1.0.0"
      }
    }`;

    const result = updateDependencyVersion(packageJson, 'test-package', {
      oldVersion: '1.0.0',
      newVersion: '2.0.0',
    });

    expect(result.updated).toBe(true);
    expect(result.content).toContain('"test-package"  :  "^2.0.0"');
  });

  it('should update dependencies in all sections', () => {
    const packageJson = `{
      "dependencies": {
        "test-package": "^1.0.0"
      },
      "devDependencies": {
        "test-package": "^1.0.0"
      },
      "peerDependencies": {
        "test-package": "^1.0.0"
      }
    }`;

    const result = updateDependencyVersion(packageJson, 'test-package', {
      oldVersion: '1.0.0',
      newVersion: '2.0.0',
    });

    expect(result.updated).toBe(true);
    // Should update all three instances
    const matches = result.content.match(/"test-package": "\^2\.0\.0"/g);
    expect(matches).toHaveLength(3);
  });

  it('should return updated=false when package is not found', () => {
    const packageJson = `{
      "dependencies": {
        "other-package": "^1.0.0"
      }
    }`;

    const result = updateDependencyVersion(packageJson, 'test-package', {
      oldVersion: '1.0.0',
      newVersion: '2.0.0',
    });

    expect(result.updated).toBe(false);
    expect(result.content).toBe(packageJson);
  });

  it('should not modify other dependencies', () => {
    const packageJson = `{
      "dependencies": {
        "test-package": "^1.0.0",
        "other-package": "^3.0.0"
      }
    }`;

    const result = updateDependencyVersion(packageJson, 'test-package', {
      oldVersion: '1.0.0',
      newVersion: '2.0.0',
    });

    expect(result.updated).toBe(true);
    expect(result.content).toContain('"test-package": "^2.0.0"');
    expect(result.content).toContain('"other-package": "^3.0.0"');
  });

  it('should handle packages with special characters in name', () => {
    const packageJson = `{
      "dependencies": {
        "@scope/test-package": "^1.0.0"
      }
    }`;

    const result = updateDependencyVersion(packageJson, '@scope/test-package', {
      oldVersion: '1.0.0',
      newVersion: '2.0.0',
    });

    expect(result.updated).toBe(true);
    expect(result.content).toContain('"@scope/test-package": "^2.0.0"');
  });

  it('should handle complex version strings correctly', () => {
    const packageJson = `{
      "dependencies": {
        "test-package": "^1.2.3-beta.4"
      }
    }`;

    const result = updateDependencyVersion(packageJson, 'test-package', {
      oldVersion: '1.2.3-beta.4',
      newVersion: '2.0.0',
    });

    expect(result.updated).toBe(true);
    expect(result.content).toContain('"test-package": "^2.0.0"');
  });

  it('should handle file: protocol dependencies', () => {
    const packageJson = `{
      "dependencies": {
        "test-package": "file:../some-local-package"
      }
    }`;

    const result = updateDependencyVersion(packageJson, 'test-package', {
      oldVersion: '1.0.0',
      newVersion: '2.0.0',
    });

    // File dependencies should not be updated since they're not version-based
    expect(result.updated).toBe(false);
    expect(result.content).toContain('"test-package": "file:../some-local-package"');
  });

  it('should set safe output name', () => {
    const packageName = '@cadamsdev/lazy-changesets-action';
    const safeOutputName = getSafeOutputName(packageName);
    expect(safeOutputName).toBe('lazy-changesets-action');
  });
});
