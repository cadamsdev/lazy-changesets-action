# @cadamsdev/lazy-changesets-action
## 0.2.0

### 🚀 New Features
- Added outputs for the package versions
- Now updates internal dependencies by default. This behavior can be changed by setting the `updateInternalDependencies` option in the `.changeset/config.json` config file.
- Added support for customizing changeset types.

Example

`.changeset/config.json`
```json
{
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": [],
  "access": "restricted",
  "lazyChangesets": {
    "types": {
      "feat": {
        "displayName": "New Features",
        "emoji": "🚀",
        "sort": 0,
        "releaseType": "minor",
        "promptBreakingChange": true
      },
      "fix": {
        "displayName": "Bug Fixes",
        "emoji": "🐛",
        "sort": 1,
        "promptBreakingChange": true
      },
      "perf": {
        "displayName": "Performance Improvements",
        "emoji": "⚡️",
        "sort": 2,
        "promptBreakingChange": true
      },
      "chore": {
        "displayName": "Chores",
        "emoji": "🏠",
        "sort": 3
      }
    }
  }
}
```

## 0.1.0

### 🚀 feat
- Initial release
