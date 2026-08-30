import { FEATURE_IDS, type FeatureId } from './features';

export const PROFILE_IDS = ['base', 'cli', 'api', 'web', 'library', 'fullstack'] as const;
export const FRAMEWORK_IDS = ['none'] as const;
export const TESTING_LAYERS = ['unit', 'integration', 'e2e'] as const;
export const QUALITY_PRESETS = ['profile', 'full', 'none'] as const;
export const CI_PROVIDERS = ['github', 'none'] as const;

export type ProfileId = (typeof PROFILE_IDS)[number];
export type FrameworkId = (typeof FRAMEWORK_IDS)[number];
export type TestingLayer = (typeof TESTING_LAYERS)[number];
export type QualityPreset = (typeof QUALITY_PRESETS)[number];
export type CiProvider = (typeof CI_PROVIDERS)[number];

const PROFILE_FEATURES = {
  api: ['vitest', 'cspell', 'case-police', 'dependency-cruiser'],
  base: [],
  cli: ['vitest', 'cspell', 'case-police'],
  fullstack: ['vitest', 'playwright', 'stylelint', 'cspell', 'case-police', 'dependency-cruiser'],
  library: ['vitest', 'cspell', 'case-police', 'dependency-cruiser', 'package-quality'],
  web: ['vitest', 'playwright', 'stylelint', 'cspell', 'case-police', 'dependency-cruiser'],
} as const satisfies Record<ProfileId, readonly FeatureId[]>;

type FeatureSelection = {
  features?: readonly FeatureId[];
  profile?: ProfileId;
  quality?: QualityPreset;
  testing?: readonly TestingLayer[];
};

export function resolveFeatures(selection: FeatureSelection): FeatureId[] {
  const profile = selection.profile ?? 'base';
  const selected = new Set<FeatureId>(PROFILE_FEATURES[profile]);

  if (selection.testing) {
    selected.delete('vitest');
    selected.delete('playwright');
    if (selection.testing.some((layer) => layer === 'unit' || layer === 'integration')) {
      selected.add('vitest');
    }
    if (selection.testing.includes('e2e')) selected.add('playwright');
  }

  if (selection.quality === 'none') {
    for (const feature of ['case-police', 'cspell', 'dependency-cruiser', 'stylelint'] as const) {
      selected.delete(feature);
    }
  }
  if (selection.quality === 'full') {
    selected.add('case-police');
    selected.add('cspell');
    selected.add('dependency-cruiser');
    if (profile === 'web' || profile === 'fullstack') selected.add('stylelint');
  }

  for (const feature of selection.features ?? []) selected.add(feature);
  return FEATURE_IDS.filter((feature) => selected.has(feature));
}

export function isProfileId(value: string): value is ProfileId {
  return PROFILE_IDS.some((profile) => profile === value);
}

export function isFrameworkId(value: string): value is FrameworkId {
  return FRAMEWORK_IDS.some((framework) => framework === value);
}

export function isTestingLayer(value: string): value is TestingLayer {
  return TESTING_LAYERS.some((layer) => layer === value);
}

export function isQualityPreset(value: string): value is QualityPreset {
  return QUALITY_PRESETS.some((preset) => preset === value);
}

export function isCiProvider(value: string): value is CiProvider {
  return CI_PROVIDERS.some((provider) => provider === value);
}
