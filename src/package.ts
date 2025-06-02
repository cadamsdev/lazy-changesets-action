import { readFileSync, writeFileSync } from "fs";
import { ChangesetEntry } from "./utils/markdown-utils";
import { packageMetadata } from "./utils/changelog-utils";
import semver from 'semver';
import { globSync } from "tinyglobby";
import path from "path";
import { ChangesetConfig } from './config';

export function applyNewVersion(
  changesetMap: Map<string, ChangesetEntry>,
  config: ChangesetConfig,
  savePackageJsonChanges = false,
) {
  // First pass: determine all new versions
  const versionMap = new Map<
    string,
    {
      newVersion: string;
      oldVersion: string;
      releaseType: 'major' | 'minor' | 'patch';
    }
  >();

  changesetMap.forEach((value, key) => {
    const packageData = packageMetadata.get(key);
    if (!packageData) {
      console.warn(`No package metadata for ${key}`);
      return;
    } else if (!packageData.path) {
      console.warn(`Could not find path for ${key}`);
      return;
    }

    const packageJsonPath = packageData.path;
    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
    const oldVersion =
      /"version":\s*"(\d+\.\d+\.\d+)"/.exec(packageJsonContent)?.[1] || '';

    const releaseType = getSemverForChangesetEntry(value);
    const newVersion = semver.inc(oldVersion, releaseType);
    console.log(
      `Bumping version for ${key} from ${oldVersion} to ${newVersion}`,
    );

    versionMap.set(key, {
      newVersion: newVersion || '',
      oldVersion,
      releaseType,
    });

    if (packageData) {
      packageData.newVersion = newVersion || '';
    }

    // bump the version
    const newContent = packageJsonContent.replace(
      /"version":\s*"\d+\.\d+\.\d+"/,
      `"version": "${newVersion}"`,
    );

    if (savePackageJsonChanges) {
      // write the changes back to the file
      writeFileSync(packageJsonPath, newContent, 'utf-8');
    }
  });

  // Second pass: update internal dependencies
  const dependencyUpdates = updateInternalDependencies(
    versionMap,
    config,
    savePackageJsonChanges,
  );

  console.log(`Dependency updates ${dependencyUpdates.size} found`);

  dependencyUpdates.forEach((updates, packageName) => {
    const packageData = packageMetadata.get(packageName);
    if (packageData) {
      packageData.dependencyUpdates = updates;
      console.log(
        `Updated ${updates.length} dependencies for package ${packageName}`);
    }
  });
}

function updateInternalDependencies(
  versionMap: Map<
    string,
    {
      newVersion: string;
      oldVersion: string;
      releaseType: 'major' | 'minor' | 'patch';
    }
  >,
  config: ChangesetConfig,
  savePackageJsonChanges = false,
): Map<
  string,
  Array<{ dependencyName: string; oldVersion: string; newVersion: string }>
> {
  const updateStrategy = config?.updateInternalDependencies || 'patch';
  // Track dependency updates for each package
  const dependencyUpdates = new Map<
    string,
    Array<{ dependencyName: string; oldVersion: string; newVersion: string }>
  >();

  if (updateStrategy === 'none') {
    console.log(
      'Skipping internal dependency updates as updateInternalDependencies is set to "none"',
    );
    return dependencyUpdates;
  }

  console.log(
    `Updating internal dependencies using strategy: ${updateStrategy}`,
  );

  // For each package.json file
  packageMetadata.forEach((metadata, packageName) => {
    const packageJsonPath = metadata.path;
    let packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
    let updated = false;
    const updates: Array<{
      dependencyName: string;
      oldVersion: string;
      newVersion: string;
    }> = [];

    // For each package that was updated
    versionMap.forEach((versionInfo, dependencyName) => {
      // Skip updating references to self
      if (dependencyName === packageName) {
        return;
      }

      // Determine if we should update based on the release type and update strategy
      const shouldUpdate = shouldUpdateDependency(
        versionInfo.releaseType,
        updateStrategy,
      );

      if (!shouldUpdate) {
        console.log(
          `Skipping update of ${packageName}'s dependency on ${dependencyName} (${versionInfo.releaseType} change, strategy: ${updateStrategy})`,
        );
        return;
      }

      // Update dependency references in dependencies, devDependencies, and peerDependencies
      const { content, updated: wasUpdated } = updateDependencyVersion(
        packageJsonContent,
        dependencyName,
        versionInfo,
      );

      if (wasUpdated) {
        packageJsonContent = content;
        updated = true;
        // Track this update
        updates.push({
          dependencyName,
          oldVersion: versionInfo.oldVersion,
          newVersion: versionInfo.newVersion,
        });
        console.log(
          `Updated ${packageName}'s dependency on ${dependencyName} from ^${versionInfo.oldVersion} to ^${versionInfo.newVersion}`,
        );
      }
    });

    if (updates.length > 0) {
      dependencyUpdates.set(packageName, updates);
    }

    if (updated && savePackageJsonChanges) {
      writeFileSync(packageJsonPath, packageJsonContent, 'utf-8');
    }
  });

  return dependencyUpdates;
}

/**
 * Updates package.json dependency references with a new version
 * @param packageJsonContent The package.json file content
 * @param dependencyName The name of the dependency to update
 * @param versionInfo Version information including the new version
 * @returns An object with the updated content and whether an update was made
 */
export function updateDependencyVersion(
  packageJsonContent: string,
  dependencyName: string,
  versionInfo: { newVersion: string; oldVersion: string },
): { content: string; updated: boolean } {
  // Updated regex to handle complex version strings, including pre-release versions
  const depRegex = new RegExp(
    `("${dependencyName}"\\s*:\\s*)"(workspace:)?(\\^|~)?([0-9]+\\.[0-9]+\\.[0-9]+(?:[-+][0-9a-zA-Z-.]+)?)"`,
    'g',
  );

  let updated = false;

  if (depRegex.test(packageJsonContent)) {
    const updatedContent = packageJsonContent.replace(
      depRegex,
      (_, prefix, workspacePrefix) => {
        // Preserve the workspace: prefix if it exists
        return `${prefix}"${workspacePrefix || ''}^${versionInfo.newVersion}"`;
      },
    );
    updated = true;
    return { content: updatedContent, updated };
  }

  return { content: packageJsonContent, updated };
}

/**
 * Determines if a dependency should be updated based on the release type and update strategy
 */
function shouldUpdateDependency(
  releaseType: 'major' | 'minor' | 'patch',
  updateStrategy: 'patch' | 'minor' | 'major' | 'none'
): boolean {
  switch (updateStrategy) {
    case 'patch':
      // Update for all changes (patch, minor, major)
      return true;
    case 'minor':
      // Update only for minor and major changes
      return releaseType === 'minor' || releaseType === 'major';
    case 'major':
      // Update only for major changes
      return releaseType === 'major';
    case 'none':
      // Never update
      return false;
    default:
      return true;
  }
}

export function scanDirForPackagePaths(): void {
  console.log('Scanning for package.json files...');

  const packageJsonFiles = globSync({
    patterns: [`**/package.json`, '!**/node_modules/**', '!**/dist/**'],
  });

  packageJsonFiles.forEach((file) => {
    const packageJson = JSON.parse(readFileSync(file, 'utf-8'));
    const packageName = packageJson.name;
    if (!packageName) {
      console.warn(`No package name found in ${file}`);
      return;
    }

    const version = packageJson.version;
    const isRoot = path.dirname(path.resolve(file)) === process.cwd();

    console.log(`Found package: ${packageName} (${version}) at  path=${file}`);
    packageMetadata.set(packageName, {
      path: file,
      version,
      isRoot,
      isPrivate: packageJson.private || false,
      packageName,
    });
  });
}

function getSemverForChangesetEntry(entry: ChangesetEntry) {
  if (entry.breakingChanges.length) {
    return 'major';
  }

  const buckets = Object.keys(entry.buckets);
  if (buckets.includes('feat')) {
    return 'minor';
  }

  return 'patch';
}
