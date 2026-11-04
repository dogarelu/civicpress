/** Consecutive rows-3/4/5 blocks that share a header (e.g. repeatCount). */
export function isSameRowHeader(
  a: { title: string; category?: { id: string } | null },
  b: { title: string; category?: { id: string } | null },
): boolean {
  return a.title === b.title && (a.category?.id ?? null) === (b.category?.id ?? null);
}

type RowWithPosts<TPost> = {
  id: string;
  title: string;
  category?: { id: string } | null;
  posts: TPost[];
};

export type GroupedRows<TRow extends RowWithPosts<unknown>> = {
  key: string;
  header: TRow;
  posts: TRow['posts'];
  lines: TRow['posts'][];
};

/** Split posts into desktop row-lines (3 / 4 / 5). */
export function chunkPosts<T>(posts: T[], size: number): T[][] {
  const n = Math.max(1, size);
  const chunks: T[][] = [];
  for (let i = 0; i < posts.length; i += n) {
    chunks.push(posts.slice(i, i + n));
  }
  return chunks;
}

/**
 * Merge consecutive visible rows that share a header, then split posts
 * into `lineSize` chunks so templates can draw a full-width rule between lines.
 */
export function groupRowsByHeader<TRow extends RowWithPosts<unknown>>(
  rows: TRow[],
  lineSize: number,
): GroupedRows<TRow>[] {
  const groups: GroupedRows<TRow>[] = [];
  for (const row of rows) {
    if (row.posts.length === 0) continue;
    const prev = groups[groups.length - 1];
    if (prev && isSameRowHeader(prev.header, row)) {
      prev.posts = [...prev.posts, ...row.posts] as TRow['posts'];
      prev.lines = chunkPosts(prev.posts, lineSize) as TRow['posts'][];
      prev.key = `${prev.key}+${row.id}`;
    } else {
      const posts = [...row.posts] as TRow['posts'];
      groups.push({
        key: row.id,
        header: row,
        posts,
        lines: chunkPosts(posts, lineSize) as TRow['posts'][],
      });
    }
  }
  return groups;
}
