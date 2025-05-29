import { vi, describe, it, expect } from 'vitest';
import { setupGitConfig } from './git';
import { execSync } from 'child_process';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('setupGitConfig', () => {
  it('should call execSync with the correct git config commands', () => {
    setupGitConfig();

    expect(execSync).toHaveBeenCalledWith(
      'git config --global user.name github-actions[bot]',
    );
    expect(execSync).toHaveBeenCalledWith(
      'git config --global user.email 41898282+github-actions[bot]@users.noreply.github.com',
    );
    expect(execSync).toHaveBeenCalledWith(
      'git config --global --add safe.directory /github/workspace',
    );
  });
});
