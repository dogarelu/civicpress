import type {
  MobileLayoutModule,
  MobileModuleType,
  MobileTextPosition,
  MobileModuleTypographyPresets,
  ModuleTypography,
} from './schemas.js';
import { normalizeModuleTypography } from './module-typography-utils.js';

export const MOBILE_MODULE_TYPES: MobileModuleType[] = [
  'list-title-left',
  'list-title-right',
  'column',
  'grid-2',
  'slideshow',
  'hero-list',
];

/** Mobile module types that support title on-image / below-image. */
export const MOBILE_TEXT_POSITION_TYPES: MobileModuleType[] = [
  'column',
  'grid-2',
  'slideshow',
  'hero-list',
];

export function supportsMobileTextPosition(type: MobileModuleType): boolean {
  return MOBILE_TEXT_POSITION_TYPES.includes(type);
}

export function defaultMobileTextPosition(type: MobileModuleType): MobileTextPosition {
  if (type === 'slideshow') return 'on-image';
  return 'below-image';
}

export function mobileTextPosition(
  type: MobileModuleType,
  value: MobileTextPosition | null | undefined,
): MobileTextPosition | undefined {
  if (!supportsMobileTextPosition(type)) return undefined;
  return value === 'on-image' || value === 'below-image' ? value : defaultMobileTextPosition(type);
}

export function defaultMobileModuleShowCategory(type: MobileModuleType): boolean {
  return type !== 'slideshow';
}

export function defaultMobileModuleCount(type: MobileModuleType): number {
  switch (type) {
    case 'list-title-left':
    case 'list-title-right':
      return 10;
    case 'column':
      return 5;
    case 'grid-2':
      return 4;
    case 'slideshow':
      return 5;
    case 'hero-list':
      return 5;
  }
}

export function normalizeMobileRowCount(value: number | null | undefined): number {
  const n = Math.floor(Number(value) || 2);
  return Math.max(1, Math.min(20, n));
}

export function normalizeMobileSideCount(value: number | null | undefined): number {
  const n = Math.floor(Number(value) || 4);
  return Math.max(1, Math.min(20, n));
}

/** Total pin/auto-fill slots for a mobile module. */
export function mobileModuleSlotCount(mod: MobileLayoutModule): number {
  switch (mod.type) {
    case 'list-title-left':
    case 'list-title-right':
      return Math.max(1, Math.min(50, mod.options?.count ?? 10));
    case 'column':
      return Math.max(1, Math.min(50, mod.options?.count ?? 5));
    case 'grid-2':
      return normalizeMobileRowCount(mod.options?.rowCount) * 2;
    case 'slideshow':
      return Math.max(1, Math.min(10, mod.options?.count ?? 5));
    case 'hero-list':
      return 1 + normalizeMobileSideCount(mod.options?.sideCount);
  }
}

export function mobileModulePinnedIds(mod: MobileLayoutModule): string[] {
  return mod.slots.map((slot) => slot.postId).filter((id): id is string => !!id);
}

export function normalizeMobileModuleTypographyPresets(
  presets: MobileModuleTypographyPresets | null | undefined,
): MobileModuleTypographyPresets {
  if (!presets) return {};
  const normalized: MobileModuleTypographyPresets = {};
  for (const type of MOBILE_MODULE_TYPES) {
    const typography = normalizeModuleTypography(presets[type]);
    if (typography) normalized[type] = typography;
  }
  return normalized;
}

export function rememberMobileModuleTypographyPreset(
  presets: MobileModuleTypographyPresets,
  type: MobileModuleType,
  typography: ModuleTypography | null,
): MobileModuleTypographyPresets {
  const normalized = normalizeModuleTypography(typography);
  if (!normalized) return presets;
  return { ...presets, [type]: { ...normalized } };
}

export function presetMobileTypographyForType(
  presets: MobileModuleTypographyPresets,
  type: MobileModuleType,
): ModuleTypography | null {
  const preset = presets[type];
  if (!preset) return null;
  return normalizeModuleTypography(preset) ?? null;
}

export function deriveMobileModuleTypographyPresets(
  modules: ReadonlyArray<{
    type: MobileModuleType;
    typography: ModuleTypography | null | undefined;
  }>,
): MobileModuleTypographyPresets {
  const presets: MobileModuleTypographyPresets = {};
  for (const mod of modules) {
    const normalized = normalizeModuleTypography(mod.typography);
    if (normalized) presets[mod.type] = { ...normalized };
  }
  return presets;
}

export function mergeMobileModuleTypographyPresets(
  stored: MobileModuleTypographyPresets | null | undefined,
  derived: MobileModuleTypographyPresets | null | undefined,
): MobileModuleTypographyPresets {
  return {
    ...normalizeMobileModuleTypographyPresets(stored),
    ...normalizeMobileModuleTypographyPresets(derived),
  };
}
