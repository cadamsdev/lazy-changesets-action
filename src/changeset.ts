export interface ChangesetType {
  displayName: string;
  emoji: string;
  sort: number;
  releaseType?: 'major' | 'minor' | 'patch';
  promptBreakingChange?: boolean;
}

export interface LazyChangeset {
  types: {
    [key: string]: ChangesetType;
  };
}

export interface ChangesetConfig {
  access: 'restricted' | 'public';
  baseBranch: string;
  updateInternalDependencies: 'patch' | 'minor' | 'major' | 'none';
  lazyChangesets: LazyChangeset;
}
