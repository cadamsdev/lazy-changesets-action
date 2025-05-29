import { context, getOctokit } from '@actions/github';
import { GITHUB_TOKEN, DEFAULT_BRANCH } from '../constants';

export const githubApi = getOctokit(GITHUB_TOKEN);

export function getEventData() {
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const prNumber = context.payload.pull_request?.number || 0;
  const isWorkflowDispatch = context.eventName === 'workflow_dispatch';
  return {
    owner,
    repo,
    issue_number: prNumber,
    isWorkflowDispatch,
  };
}

export interface CreatePRConfig {
  title: string;
  body: string;
  head: string;
  base?: string;
}

export async function createOrUpdatePR({
  title,
  body,
  head,
  base = DEFAULT_BRANCH,
}: CreatePRConfig) {
  const eventData = getEventData();

  // Check if a PR already exists for the given head branch
  const existingPRs = await githubApi.rest.pulls.list({
    owner: eventData.owner,
    repo: eventData.repo,
    head: `${eventData.owner}:${head}`,
    base,
  });

  if (existingPRs.data.length > 0) {
    // Update the existing PR
    const existingPR = existingPRs.data[0];
    const { data } = await githubApi.rest.pulls.update({
      owner: eventData.owner,
      repo: eventData.repo,
      pull_number: existingPR.number,
      title,
      body,
    });
    return data;
  } else {
    // Create a new PR
    const { data } = await githubApi.rest.pulls.create({
      owner: eventData.owner,
      repo: eventData.repo,
      title,
      body,
      head,
      base,
    });
    return data;
  }
}

export async function prExists(head: string) {
  const eventData = getEventData();
  const existingPRs = await githubApi.rest.pulls.list({
    owner: eventData.owner,
    repo: eventData.repo,
    head: `${eventData.owner}:${head}`,
    base: DEFAULT_BRANCH,
  });

  return existingPRs.data.length > 0;
}

export interface CreateGitHubReleaseConfig {
  tag_name: string;
  name: string;
  body: string;
}

export async function createGitHubRelease({
  tag_name,
  name,
  body,
}: CreateGitHubReleaseConfig) {
  const eventData = getEventData();
  const { data } = await githubApi.rest.repos.createRelease({
    owner: eventData.owner,
    repo: eventData.repo,
    tag_name,
    name,
    body,
  });

  return data;
}

export async function getPRComments() {
  const eventData = getEventData();
  const { data } = await githubApi.rest.issues.listComments({
    owner: eventData.owner,
    repo: eventData.repo,
    issue_number: eventData.issue_number,
  });

  return data;
}

export async function updatePRComment(commentId: number, markdown: string) {
  const eventData = getEventData();
  await githubApi.rest.issues.updateComment({
    owner: eventData.owner,
    repo: eventData.repo,
    comment_id: commentId,
    body: markdown,
  });
}

export async function createPRComment(markdown: string) {
  const eventData = getEventData();
  await githubApi.rest.issues.createComment({
    owner: eventData.owner,
    repo: eventData.repo,
    issue_number: eventData.issue_number,
    body: markdown,
  });
}

export async function updateOrCreatePRComment(markdown: string) {
  const octokit = getOctokit(GITHUB_TOKEN);
  const { owner, repo } = context.repo;
  const pull_number = context.payload.pull_request?.number;
  
  if (!pull_number) {
    console.error("No pull request number found in context");
    return;
  }
  
  // Get all comments
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: pull_number
  });
  
  // Find comment made by the bot (GitHub Actions)
  const botComment = comments.find(comment => 
    comment?.user?.login === 'github-actions[bot]' && 
    (comment?.body?.includes('### 🦋 Changeset detected') || 
    comment?.body?.includes('### ⚠️ No Changeset found'))
  );
  
  if (botComment) {
    // Update existing comment
    console.log(`Updating existing comment ID: ${botComment.id}`);
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: botComment.id,
      body: markdown
    });
  } else {
    // Create new comment
    console.log('Creating new PR comment');
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pull_number,
      body: markdown
    });
  }
}
