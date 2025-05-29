import { globSync } from 'tinyglobby';
import { execSync } from 'child_process';
import { commitAllAndPush, gitFetch, hasUnstagedChanges, setupGitConfig, switchBranch } from './api/git';
import { createGitHubRelease, createOrUpdatePR, updateOrCreatePRComment } from './api/github';
import { ChangesetEntry, generateMarkdown, getMarkdownForEntry } from './utils/markdown-utils';
import { getChangeSetMap, getTagNameForEntry } from './utils/changeset-utils';
import { createOrUpdateChangelog, packageMetadata } from './utils/changelog-utils';
import { applyNewVersion, scanDirForPackagePaths } from './package';
import { deleteFiles, getDirectoryPath } from './utils/file-utils';
import { CHANGESET_COMMAND, CREATE_GITHUB_RELEASES, GITHUB_TOKEN, NPM_TOKEN, RELEASE_BRANCH_NAME, RELEASE_PR_TITLE } from './constants';
import { detect } from 'package-manager-detector/detect';
import { resolveCommand } from 'package-manager-detector/commands';
import { context } from '@actions/github';
import { ChangesetConfig, readConfig } from './config';
import { setOutput } from '@actions/core';

(async () => {
  init();

  let config: ChangesetConfig;
  try {
    config = readConfig();
  } catch (error) {
    console.error('Error reading config:', error);
    process.exit(1);
  }

  if (context.eventName === 'pull_request') {
    onPullRequest();
    return;
  }

  // get the list of changeset files
  const changesetFiles = globSync({
    patterns: ['.changeset/*.md', '!.changeset/README.md'],
  });

  if (changesetFiles.length) {
    console.log('Found changeset files:', changesetFiles);
  } else {
    console.log('No changeset files found.');
  }

  scanDirForPackagePaths();

  const hasChangesets = changesetFiles.length > 0;

  if (hasChangesets) {
    await handleCreateOrUpdateReleasePR(changesetFiles);
  } else {
    await handlePublish(config);
  }

  console.log('Done!');
})();

async function onPullRequest() {
  // get target branch name
  const targetBranch = context.payload.pull_request?.base.ref || 'main';
  console.log(`Comparing changes with target branch: ${targetBranch}`);

  try {
    /*
      Fetch the target branch specifically. This is necessary so we don't need to use fetch-depth: 0 in the workflow file.
      - name: Checkout Repo
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
    */
    console.log(`Fetching ${targetBranch} branch...`);
    execSync(`git fetch origin ${targetBranch}`, { stdio: 'inherit' });

    // Get changed files between target branch and current branch
    const diffOutput = execSync('git diff --name-only FETCH_HEAD HEAD')
      .toString()
      .trim()
      .split('\n');

    // Filter for changeset markdown files, excluding README
    const changesetFiles = diffOutput.filter(
      (file) =>
        file.startsWith('.changeset/') &&
        file.endsWith('.md') &&
        file !== '.changeset/README.md',
    );

    let markdown = '';

    const lastCommitHash = execSync('git rev-parse HEAD').toString().trim();
    const commitHashMarkdown = getMarkdownForCommitHash(lastCommitHash);

    if (changesetFiles.length) {
      console.log('Found changeset files:', changesetFiles);
      markdown += '### 🦋 Changeset detected\n';
      markdown += `Latest commit: ${commitHashMarkdown}\n\n`;
      scanDirForPackagePaths();
      const changesetMap = getChangeSetMap(changesetFiles);
      if (changesetMap.size > 0) {
        applyNewVersion(changesetMap);
        markdown += generateMarkdown(changesetMap);
      }
    } else {
      console.log('No changesets found. Creating PR comment...');
      markdown += '### ⚠️ No Changeset found\n';
      markdown += `Latest commit: ${commitHashMarkdown}\n\n`;
      markdown +=
        'Merging this PR will not bump any package versions or create a release.';

      if (CHANGESET_COMMAND) {
        markdown += `\n\nTo create a changeset, run \`${CHANGESET_COMMAND}\` in your terminal.`;
      }
    }

    await updateOrCreatePRComment(markdown);
  } catch (error) {
    console.error('Error while attempting to create or update PR comment:', error);
    process.exit(1);
  }
}

function getMarkdownForCommitHash(commitHash: string): string {
  return `[${commitHash.substring(0, 7)}](https://github.com/${context.repo.owner}/${context.repo.repo}/commit/${commitHash})`;
}

function getCommitCount(): number {
  return parseInt(execSync('git rev-list --count HEAD').toString().trim(), 10);
}

async function handlePublish(config: ChangesetConfig) {
  console.log('Attemping to publish...');

  // Check for merge commit first
  const isMergeCommit = checkIfLastCommitIsMerge();

  // Different strategies for detecting changesets based on merge type
  let changesetFiles: string[] = [];

  if (isMergeCommit) {
    console.log(
      'Last commit is a merge commit. Using merge-specific strategy...',
    );
    // For merge commits, we need to compare with the first parent
    changesetFiles = getDeletedChangesetFilesFromMerge();
  } else {
    // Original approach for squash merges
    const commitCount = getCommitCount();
    if (commitCount < 2) {
      console.log('Not enough commits to diff. Skipping publish.');
      return;
    } else {
      console.log(`Found ${commitCount} commits. Proceeding to publish...`);
    }

    // Original squash merge detection
    changesetFiles = getDeletedChangesetFilesFromSquash();
  }

  if (!changesetFiles.length) {
    console.log('No changeset files deleted. Skipping publish.');
    return;
  } else {
    console.log('Found deleted changeset files:', changesetFiles);
  }

  // get the commit hash of the last commit
  let commitHash: string;
  if (isMergeCommit) {
    // For merge commits, use HEAD^ (first parent) to restore files
    commitHash = execSync('git rev-parse HEAD^').toString().trim();
    console.log(`Using first parent of merge commit: ${commitHash}`);
  } else {
    // For non-merge commits (squash), use HEAD~1
    commitHash = execSync('git rev-parse HEAD~1').toString().trim();
    console.log(`Using previous commit: ${commitHash}`);
  }

  for (const file of changesetFiles) {
    console.log(`Restoring deleted changeset file: ${file}`);
    execSync(`git restore --source=${commitHash.trim()} ${file}`, {
      stdio: 'inherit',
    });
  }

  // get changeset map
  const changesetMap = getChangeSetMap(changesetFiles);

  // discard the changeset files we restored
  deleteFiles(changesetFiles);

  const pm = await detect();
  if (!pm) {
    throw new Error('No package manager detected');
  }

  const rci = resolveCommand(pm.agent, 'frozen', []);
  if (!rci?.command) {
    throw new Error(`No command found for package manager ${pm.agent}`);
  }
  const fullInstallCommand = [rci.command, ...(rci.args || [])].join(' ');
  console.log(`Running package manager command: ${fullInstallCommand}`);
  execSync(fullInstallCommand, { stdio: 'inherit' });

  const rcb = resolveCommand(pm.agent, 'run', ['build']);
  if (!rcb?.command) {
    throw new Error(`No command found for package manager ${pm.agent}`);
  }
  const fullBuildCommand = [rcb.command, ...(rcb.args || [])].join(' ');
  console.log(`Running package manager command: ${fullBuildCommand}`);
  execSync(fullBuildCommand, { stdio: 'inherit' });

  // create and push tags
  createAndPushTags(changesetMap);

  // publish packages
  publishPackages(config);

  if (CREATE_GITHUB_RELEASES) {
    console.log('Creating GitHub releases...');
    changesetMap.forEach(async (entry, packageName) => {
      const packageData = packageMetadata.get(packageName);
      if (!packageData) {
        console.warn(`No metadata found for package: ${packageName}`);
        return;
      }

      const version = entry.version;
      const tagName = getTagNameForEntry(entry);
      const path = getDirectoryPath(packageData.path);
      let title = tagName;
      if (path === './') {
        title = `v${version}`;
      }

      console.log(`Creating GitHub release for ${tagName}...`);
      console.log(`Package path: ${path}`);
      console.log(`Package version: ${version}`);
      console.log(`Package name: ${packageName}`);
      console.log(`Tag name: ${tagName}`);
      console.log(`Release title: ${title}`);

      const markdown = getMarkdownForEntry(entry);
      console.log('Generated markdown:', markdown);

      await createGitHubRelease({
        tag_name: tagName,
        name: title,
        body: markdown,
      });
    });
  } else {
    console.log('Skipping GitHub release creation.');
  }
}

function getDeletedChangesetFilesFromMerge(): string[] {
  try {
    // For merge commits, compare with first parent to get changes
    return execSync('git diff --name-status HEAD^ HEAD')
      .toString()
      .split('\n')
      .filter((line) => line.trim() !== '')
      .filter((line) => {
        const [status, filePath] = line.split('\t');
        return (
          status === 'D' &&
          filePath &&
          filePath.startsWith('.changeset/') &&
          filePath.endsWith('.md') &&
          filePath !== '.changeset/README.md'
        );
      })
      .map((line) => line.split('\t')[1]);
  } catch (error) {
    console.error('Error getting deleted changeset files from merge:', error);
    return [];
  }
}

function getDeletedChangesetFilesFromSquash(): string[] {
  // Original implementation for squash merges
  return execSync('git diff --name-status HEAD~1 HEAD')
    .toString()
    .split('\n')
    .filter((line) => line.trim() !== '')
    .filter((line) => {
      const [status, filePath] = line.split('\t');
      return (
        status === 'D' &&
        filePath &&
        filePath.startsWith('.changeset/') &&
        filePath.endsWith('.md') &&
        filePath !== '.changeset/README.md'
      );
    })
    .map((line) => line.split('\t')[1]);
}

function checkIfLastCommitIsMerge(): boolean {
  try {
    // Check if the last commit has multiple parents (merge commit)
    const parentCount = execSync('git rev-list --parents -n 1 HEAD | wc -w')
      .toString()
      .trim();
    // A merge commit will have at least 3 words (commit hash + 2+ parent hashes)
    return parseInt(parentCount, 10) >= 3;
  } catch (error) {
    console.error('Error checking if commit is merge:', error);
    return false;
  }
}

function init() {
  // set output defaults
  setOutput('published', 'false');

  if (!GITHUB_TOKEN) {
    console.error(
      'GITHUB_TOKEN is not set. Please set it in your environment.',
    );
    process.exit(1);
  }

  if (context.eventName !== 'pull_request' && context.eventName !== 'push') {
    console.error(
      'This action can only be run on pull_request or push events.',
    );
    process.exit(1);
  }

  // print git version
  execSync('git --version', { stdio: 'inherit' });

  setNpmConfig();
  setupGitConfig();
}

function setNpmConfig() {
  console.log('Setting npm config...');

  if (NPM_TOKEN) {
    // publish to npm
    console.log('Setting npm token...');
    execSync(`npm config set //registry.npmjs.org/:_authToken=${NPM_TOKEN}`, {
      stdio: 'inherit',
    });
  }
  
  if (GITHUB_TOKEN) {
    // publish to GitHub packages
    console.log('Setting GitHub token...');
    execSync(`npm config set //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}`, {
      stdio: 'inherit',
    });
  }
}

function createAndPushTags(changesetMap: Map<string, ChangesetEntry>) {
  console.log('Creating and pushing tags...');
  const tagsToCreate: string[] = [];

  changesetMap.forEach((entry) => {
    const tagName = getTagNameForEntry(entry);

    // Check if tag exists on remote
    const tagExists = doesTagExistOnRemote(tagName);
    if (tagExists) {
      console.log(`Tag ${tagName} already exists on remote, skipping...`);
      return;
    }

    console.log(`Creating tag ${tagName}...`);
    execSync(`git tag -a ${tagName} -m "Release ${tagName}"`, {
      stdio: 'inherit',
    });
    tagsToCreate.push(tagName);
  });

  if (tagsToCreate.length === 0) {
    console.log('No new tags to push.');
    return;
  }

  console.log(`Pushing ${tagsToCreate.length} new tags...`);
  execSync('git push --tags', {
    stdio: 'inherit',
  });

  console.log('Tags pushed successfully.');
}

function doesTagExistOnRemote(tagName: string): boolean {
  try {
    // First, fetch all remote tags to ensure we have the latest information
    execSync('git fetch --tags', { stdio: 'pipe' });

    // Check if the tag exists on remote
    execSync(`git ls-remote --tags origin refs/tags/${tagName}`, {
      stdio: 'pipe',
    });
    return true;
// eslint-disable-next-line no-unused-vars
  } catch (error) {
    // If the command exits with a non-zero status, the tag doesn't exist
    return false;
  }
}

function publishPackages(config: ChangesetConfig) {
  console.log('Publishing packages...');

  let hasPublished = false;

  packageMetadata.forEach(async (packageData) => {
    if (packageData.isPrivate) {
      console.log(`Skipping private package: ${packageData.packageName}`);
      return;
    }

    const dirPath = getDirectoryPath(packageData.path);
    console.log(`Publishing package at ${dirPath}...`);

    const pm = await detect();
    if (!pm) {
      throw new Error('No package manager detected');
    }

    const fullPublishCommand = [
      pm.agent,
      'publish',
      '--access',
      config.access,
    ].join(' ');

    try {
      console.log(`Running package manager command: ${fullPublishCommand}`);
      execSync(fullPublishCommand, {
        stdio: 'inherit',
        cwd: dirPath,
      });
      hasPublished = true;
    } catch (error) {
      if (error instanceof Error) {
        // log error if its not a 409
        if (error.message.includes('409 Conflict')) {
            console.warn(
              `Package ${packageData.packageName} already exists, skipping...`,
            );
        } else {
          console.error(
            `Error publishing package ${packageData.packageName}:`,
            error.message,
          );
        }
      }
    }
  });

  console.log('Packages published successfully.');
  setOutput('published', hasPublished.toString());
}

async function handleCreateOrUpdateReleasePR(changesetFiles: string[]) {
  console.log('Attempting to create or update release PR...');

  const changesetMap = getChangeSetMap(changesetFiles);

  if (changesetMap.size === 0) {
    console.log('No changesets found. Skipping...');
    return;
  }

  gitFetch();
  // switch/create the release branch
  switchBranch(RELEASE_BRANCH_NAME);

  if (changesetFiles.length) {
    // delete the changeset files
    deleteFiles(changesetFiles);
  }

  applyNewVersion(changesetMap, true);

  const pm = await detect();

  if (!pm) {
    throw new Error('No package manager detected');
  }

  const rc = resolveCommand(pm.agent, 'install', []);

  if (!rc?.command) {
    throw new Error(`No command found for package manager ${pm.agent}`);
  }

  const fullCommand = [rc.command, ...(rc.args || [])].join(' ');
  console.log(`Running package manager command: ${fullCommand}`);

  execSync(fullCommand, {
    stdio: 'inherit',
  });

  // create or update changelogs
  createOrUpdateChangelog(changesetMap);

  if (hasUnstagedChanges()) {
    commitAllAndPush('Remove changeset files');
  }

  const markdown = generateMarkdown(changesetMap);

  await createOrUpdatePR({
    title: RELEASE_PR_TITLE,
    body: markdown,
    head: RELEASE_BRANCH_NAME,
  }); 
}
