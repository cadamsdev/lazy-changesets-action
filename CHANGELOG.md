# @cadamsdev/lazy-changesets-action-test
## 2.1.0

### 🚀 feat
- Initial release

## 2.0.2

### 🛠️ fix
- Skip publishing a package if it has private: true set in the package.json

## 2.0.1

### 🛠️ fix
- Fix tag name for root package

## 2.0.0

### ⚠️ BREAKING CHANGES
- Removed command inputs

## 1.7.0

### 🚀 feat
- Added "published" output param

## 1.6.0

### 🚀 feat
- Add support for empty changesets

## 1.5.0

### 🚀 feat
- Added support for the "access" config option

.changeset/config.json
```json
{
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": [],
  "access": "public"
}
```

`"access": "restricted"` packages will be published as private, requiring log in to an npm account with access to install.
`"access": "public"`, the packages will be made available on the public registry.
### 🛠️ fix
- Using merge commits

## 1.4.0

### 🚀 feat
- Creates a PR comment notifying the user if the changeset was created.

## 1.3.0

### 🚀 feat
- Auto detect package manager by default.
- Added option `NPM_TOKEN` to publish packages to npm

## 1.2.0

### 🚀 feat
- Add option to skip creating github releases

## 1.1.0

### 🚀 feat
- Add env var `RELEASE_PR_TITLE` to set the title of the release PR.
- Added option `RELEASE_BRANCH_NAME` to change the release branch name.


## 1.0.0

### ⚠️ BREAKING CHANGES
- Fixed some bug
- Removed `text` prop from `ds-button` component.

Before:

```html
<ds-button text="Button"><ds-button>
```

After:

```html
<ds-button>Button</ds-button>
```
### 🛠️ fix
- Fix updating existing changelogs
### 🏠 chore
- test chore
- test chore
### 🤖 ci
- fix checking out branch 123
