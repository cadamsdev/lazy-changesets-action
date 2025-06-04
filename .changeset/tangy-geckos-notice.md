---
"@cadamsdev/lazy-changesets-action": feat
---

Added support for customizing changeset types.

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
      },
      "docs": {
        "displayName": "Documentation",
        "emoji": "📚",
        "sort": 4
      },
      "style": {
        "displayName": "Styles",
        "emoji": "🎨",
        "sort": 5
      },
      "refactor": {
        "displayName": "Refactoring",
        "emoji": "♻️",
        "sort": 6,
        "promptBreakingChange": true
      },
      "test": {
        "displayName": "Tests",
        "emoji": "✅",
        "sort": 7
      },
      "build": {
        "displayName": "Build",
        "emoji": "📦",
        "sort": 8,
        "promptBreakingChange": true
      },
      "ci": {
        "displayName": "Automation",
        "emoji": "🤖",
        "sort": 9
      },
      "revert": {
        "displayName": "Reverts",
        "emoji": "⏪",
        "sort": 10,
        "promptBreakingChange": true
      }
    }
  }
}
```
