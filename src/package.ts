import { readFileSync, writeFileSync } from "fs";
import { ChangesetEntry } from "./utils/markdown-utils";
import { packageMetadata } from "./utils/changelog-utils";
import semver from 'semver';
import { globSync } from "tinyglobby";
import path from "path";

export function applyNewVersion(
  changesetMap: Map<string, ChangesetEntry>,
  bumpPackageJsonVersion = false,
) {
  // First pass: determine all new versions
  const versionMap = new Map<string, string>();

  changesetMap.forEach((value, key) => {
    const packagePath = packageMetadata.get(key);
    if (!packagePath) {
      console.warn(`No package path found for ${key}`);
      return;
    }

    const packageJsonPath = packagePath.path;
    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
    const version =
      /"version":\s*"(\d+\.\d+\.\d+)"/.exec(packageJsonContent)?.[1] || '';
    const newVersion = semver.inc(version, getSemverForChangesetEntry(value));
    console.log(`Bumping version for ${key} from ${version} to ${newVersion}`);

    versionMap.set(key, newVersion || '');

    const entry = packageMetadata.get(key);
    if (entry) {
      entry.newVersion = newVersion || '';
    }

    if (bumpPackageJsonVersion) {
      // bump the version
      const newContent = packageJsonContent.replace(
        /"version":\s*"\d+\.\d+\.\d+"/,
        `"version": "${newVersion}"`,
      );

      // write the changes back to the file
      writeFileSync(packageJsonPath, newContent, 'utf-8');
    }
  });

  // Second pass: update internal dependencies
  if (bumpPackageJsonVersion) {
    updateInternalDependencies(versionMap);
  }
}

function updateInternalDependencies(versionMap: Map<string, string>): void {
  // For each package.json file
  packageMetadata.forEach((metadata, packageName) => {
    const packageJsonPath = metadata.path;
    let packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
    let updated = false;

    // For each package that was updated
    versionMap.forEach((newVersion, dependencyName) => {
      // Skip updating references to self
      if (dependencyName === packageName) return;

      // Update dependency references in dependencies, devDependencies, and peerDependencies
      const depRegex = new RegExp(
        `("${dependencyName}"\\s*:\\s*)"\\^?\\d+\\.\\d+\\.\\d+"`,
        'g',
      );
      if (depRegex.test(packageJsonContent)) {
        packageJsonContent = packageJsonContent.replace(
          depRegex,
          `$1"^${newVersion}"`,
        );
        updated = true;
        console.log(
          `Updated ${packageName}'s dependency on ${dependencyName} to ^${newVersion}`,
        );
      }
    });

    if (updated) {
      writeFileSync(packageJsonPath, packageJsonContent, 'utf-8');
    }
  });
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
