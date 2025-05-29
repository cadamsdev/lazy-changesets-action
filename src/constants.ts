export const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
export const DEFAULT_BRANCH = process.env.DEFAULT_BRANCH || 'main';
export const RELEASE_PR_TITLE = process.env.RELEASE_PR_TITLE || 'Version Packages';
export const RELEASE_BRANCH_NAME =
  process.env.RELEASE_BRANCH_NAME || 'changeset-release/main';
export const CREATE_GITHUB_RELEASES = process.env.CREATE_GITHUB_RELEASES
  ? process.env.CREATE_GITHUB_RELEASES === 'true'
  : true;
export const NPM_TOKEN = process.env.NPM_TOKEN || '';
export const CHANGESET_COMMAND = process.env.CHANGESET_COMMAND || '';
