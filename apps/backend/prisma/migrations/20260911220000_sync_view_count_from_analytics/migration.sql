-- Article viewCount is now the lifetime AnalyticsPageView count (not GET /posts/:slug hits).
UPDATE "Post" p
SET "viewCount" = COALESCE((
  SELECT COUNT(*)::int FROM "AnalyticsPageView" v WHERE v."postId" = p.id
), 0);
