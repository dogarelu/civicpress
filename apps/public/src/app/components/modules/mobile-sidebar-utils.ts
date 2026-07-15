import type { ResolvedSidebar, ResolvedSidebarBlock } from '@civicpress/shared';

export function resolvedSidebarBlockRef(block: ResolvedSidebarBlock): string {
  return block.blockId ?? block.mode;
}

export function findSidebarBlockForRef(
  sidebar: ResolvedSidebar,
  ref: string,
): ResolvedSidebarBlock | null {
  return sidebar.blocks.find((block) => resolvedSidebarBlockRef(block) === ref) ?? null;
}
