# Lazy Changesets Action

[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/cadamsdev/lazy-changesets-action/issues) [![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0) ![GitHub Tag](https://img.shields.io/github/v/tag/cadamsdev/lazy-changesets-action)

A GitHub action that helps automate versioning, publishing and creating changelogs for node packages. This tool is heavily inspired by [Changesets](https://github.com/changesets/changesets) and the [Conventional Commits](https://www.conventionalcommits.org/) specification.

If you enjoy the tool, please consider giving it a star ⭐️ on GitHub! Also if you find it useful, consider supporting my work by buying me a coffee. Your support helps me continue to improve and maintain the project.

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/cadamsdev)

## 📚 Table of Contents

- [✨ Features](#-features)
- [🚀 Usage](#-usage)
  - [Release Workflow](#release-workflow)
  - [Pull Request Workflow](#pull-request-workflow)
- [📝 Changeset Types](#-changeset-types)
- [⚙️ Configuration](#-configuration)
  - [Inputs](#inputs)
  - [Output Params](#output-params)
- [🔒 Permissions](#-permissions)
- [❓ F.A.Q](#-faq)
  - [What's the difference between this action and the original Changesets action?](#whats-the-difference-between-this-action-and-the-original-changesets-action)

## ✨ Features

- Bumps versions in package.json based on changesets

- Supports monorepos

- Creates beautiful, readable changelogs

- Publishes packages to npm or GitHub Packages

- Creates GitHub releases

- Customizable

- Supports multiple package managers (npm, pnpm, yarn, bun)

- Supports GitHub Enterprise

## 🚀 Usage

1. Create a new workflow file in your repository's `.github/workflows` directory. For example `release.yml` (You can name it anything you like).
2. Add the following code to the workflow file:

> [!NOTE]
> This workflow creates a pull request for the release if there are changesets, or publishes the changes if the release PR has been merged.

```yaml
name: Release

on:
  push:
    branches:
      - main

permissions:
  contents: write # for pushing commits/tags
  packages: write # for publishing packages
  pull-requests: write # for creating/updating PRs

jobs:
  release:
    if: github.repository_owner == github.event.repository.owner.login
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repo
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Create Release PR or Publish Release
        id: release
        uses: cadamsdev/lazy-changesets-action@348a2bbac69927b034ec53ddb4783db2312c6289 # v0.1.0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

3. Create a new workflow file in your repository's `.github/workflows` directory. For example `pull-request.yml`.

> [!NOTE]
> This workflow comments on the pull request and notifies the user to create a changeset if there are no changesets found in the pull request.

![No Changesets Found](/media/no-changesets-found.png)

4. Add the following code to the workflow file:

```yaml
name: Pull Request

on:
  pull_request:
    branches:
      - main

jobs:
  release:
    if: github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repo
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 22
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build

      - name: Check for changesets
        uses: cadamsdev/lazy-changesets-action@348a2bbac69927b034ec53ddb4783db2312c6289 # v0.1.0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CHANGESET_COMMAND: 'npm run changeset'
```

5. Setup the [lazy-changesets CLI](https://github.com/cadamsdev/lazy-changesets) in your project:

## 📝 Changeset Types

| Type     | Emoji | Description              |
| -------- | :---: | ------------------------ |
| feat     |  🚀   | New features             |
| fix      |  🛠️   | Bug fixes                |
| perf     |  ⚡️  | Performance improvements |
| chore    |  🏠   | Maintenance tasks        |
| docs     |  📚   | Documentation changes    |
| style    |  🎨   | Code style updates       |
| refactor |  ♻️   | Code refactoring         |
| test     |  ✅   | Adding or updating tests |
| build    |  📦   | Build system changes     |
| ci       |  🤖   | Continuous integration   |
| revert   |  ⏪   | Reverting changes        |

## ⚙️ Configuration

### Inputs

| Env Var Name             | Type    | Default Value              | Description                       |
| ------------------------ | ------- | -------------------------- | --------------------------------- |
| `GITHUB_TOKEN`           | string  | `''`                       | GitHub authentication token       |
| `DEFAULT_BRANCH`         | string  | `'main'`                   | Default branch name               |
| `RELEASE_PR_TITLE`       | string  | `'Version Packages'`       | Title for release pull requests   |
| `RELEASE_BRANCH_NAME`    | string  | `'changeset-release/main'` | Name for the release branch       |
| `CREATE_GITHUB_RELEASES` | boolean | `true`                     | Whether to create GitHub releases |
| `NPM_TOKEN`              | string  | `''`                       | npm authentication token          |
| `CHANGESET_COMMAND`      | string  | `''`                       | Command to run changesets         |

examples

```yaml
- name: Create Release PR or Publish Release
  id: release
  uses: cadamsdev/lazy-changesets-action@v0
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    DEFAULT_BRANCH: 'main'
    RELEASE_PR_TITLE: 'My Release PR'
    RELEASE_BRANCH_NAME: 'my-release-branch'
    CREATE_GITHUB_RELEASES: false
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }} # Only required if publishing to npm
    CHANGESET_COMMAND: 'npm run changeset'
```

### Output Params

| Output Name | Description                                                                        |
| ----------- | ---------------------------------------------------------------------------------- |
| `published` | The flag that indicates the packages have been published to npm or GitHub packages |

example

```yaml
- name: Create Release PR or Publish Release
  id: changesets
  uses: cadamsdev/lazy-changesets-action@v0
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

- name: After Publish
  if: steps.changesets.outputs.published == 'true'
  run: |
    echo "Run a script after packages have been published"
```

## 🔒 Permissions

In your github repository, go to **Settings > Actions > General**

1. Set the permissions for the `GITHUB_TOKEN` to `Read and write permissions`. This is required for the action to push changes back to the repository.
2. Check the `Allow GitHub Actions to create and approve pull requests` option. This is required for the action to create pull requests for releases.

![Workflow permissions](/media/workflow-permissions.png)

## ❓ F.A.Q

### What's the difference between this action and the original [Changesets action](https://github.com/changesets/action)?

This action is more opinionated / more batteries included.

- This action doesn't use explicit semver bumps in the changesets (major, minor, patch) but instead uses changeset types (inspired by [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)). This means you don't have to think about what version bump your changes are. You just need to know what type of change you made. This action will automatically determine the version bump based on the changeset type for you.
- This action uses changeset types + emojis (breaking changes, fix, feat, chore etc) in the changelogs and/or github releases instead of categorizing the changes based on the version bumps (major, minor, patch)
- This action will handle updating the lock files (package-lock.json, yarn.lock, pnpm-lock.yaml, bun.lockb) automatically for you.
- This action will install the dependencies and build your packages for you. (It'll determine which package manager you're using and run the appropriate commands)
