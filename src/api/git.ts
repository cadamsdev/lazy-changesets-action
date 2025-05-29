import { execSync } from "child_process";

export function setupGitConfig() {
  execSync('git config --global user.name github-actions[bot]');
  execSync(
    'git config --global user.email 41898282+github-actions[bot]@users.noreply.github.com',
  );
  execSync('git config --global --add safe.directory /github/workspace');
}

export function hasUnstagedChanges(): boolean {
  try {
    const statusOutput = execSync('git status --porcelain', {
      encoding: 'utf-8',
    });
    return statusOutput.trim().length > 0;
  } catch (error) {
    console.error('Error checking git status:', error);
    return false;
  }
}

export function gitFetch() {
  try {
    execSync('git fetch origin', { stdio: 'inherit' });
  } catch (error) {
    console.error('Error fetching from origin:', error);
  }
}

export function switchBranch(branchName: string) {
    console.log(`Switching to branch ${branchName}`);
    try {
      execSync(`git switch ${branchName}`);
      execSync('git reset --hard origin/main');
      execSync('git push --force-with-lease');
    } catch (e) {
      console.log(`Branch ${branchName} does not exist. Creating it...`);
      console.error(e);
      execSync(`git switch -c ${branchName}`);
    }
}

export function commitAllAndPush(msg: string) {
  execSync('git add .');
  execSync(`git commit -m "${msg}"`);
  execSync('git push origin HEAD');
}
