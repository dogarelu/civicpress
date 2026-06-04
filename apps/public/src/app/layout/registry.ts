import type { Type } from '@angular/core';

export type TemplateSlot = 'home' | 'category';

export interface TemplateDef<TOptions = unknown> {
  id: string;
  slot: TemplateSlot;
  name: string;
  thumbnail: string;
  defaultOptions: TOptions;
  component: () => Promise<{ default: Type<unknown> }>;
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'home-magazine',
    slot: 'home',
    name: 'Home — Magazine',
    thumbnail: '/assets/templates/home-magazine.png',
    defaultOptions: { featuredCount: 10 },
    component: () => import('./templates/home-magazine.component'),
  },
  {
    id: 'cat-list',
    slot: 'category',
    name: 'Category — List',
    thumbnail: '/assets/templates/cat-list.png',
    defaultOptions: { perPage: 15 },
    component: () => import('./templates/cat-list.component'),
  },
];

export function resolveTemplate(slot: TemplateSlot, id?: string | null): TemplateDef {
  const match = id ? TEMPLATES.find((t) => t.slot === slot && t.id === id) : undefined;
  const fallback = TEMPLATES.find((t) => t.slot === slot);
  const resolved = match ?? fallback;
  if (!resolved) throw new Error(`No template found for slot '${slot}'`);
  if (!match && id) {
    console.warn(`[CivicPress] Unknown template id '${id}' for slot '${slot}', using default.`);
  }
  return resolved;
}
