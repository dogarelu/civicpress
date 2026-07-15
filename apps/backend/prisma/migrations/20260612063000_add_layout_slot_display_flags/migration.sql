UPDATE "PageLayout" AS p
SET "config" = jsonb_set(
  p."config",
  '{modules}',
  (
    SELECT jsonb_agg(
      jsonb_set(
        module_elem,
        '{slots}',
        COALESCE(
          (
            SELECT jsonb_agg(
              CASE
                WHEN jsonb_typeof(slot_elem) = 'object' THEN
                  jsonb_build_object(
                    'postId',
                    COALESCE(slot_elem->'postId', 'null'::jsonb),
                    'showDate',
                    COALESCE(slot_elem->'showDate', 'true'::jsonb),
                    'showAuthor',
                    COALESCE(slot_elem->'showAuthor', 'true'::jsonb)
                  )
                ELSE
                  jsonb_build_object(
                    'postId',
                    slot_elem,
                    'showDate',
                    to_jsonb(true),
                    'showAuthor',
                    to_jsonb(true)
                  )
              END
            )
            FROM jsonb_array_elements(COALESCE(module_elem->'slots', '[]'::jsonb)) AS slot(slot_elem)
          ),
          '[]'::jsonb
        ),
        true
      )
    )
    FROM jsonb_array_elements(COALESCE(p."config"->'modules', '[]'::jsonb)) AS module(module_elem)
  ),
  true
)
WHERE jsonb_typeof(p."config"->'modules') = 'array';

UPDATE "PageLayout" AS p
SET "config" = jsonb_set(
  jsonb_set(
    p."config",
    '{sidebar,latestSlots}',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'showDate',
            COALESCE(slot_elem->'showDate', 'true'::jsonb),
            'showAuthor',
            COALESCE(slot_elem->'showAuthor', 'true'::jsonb)
          )
        )
        FROM jsonb_array_elements(COALESCE(p."config"->'sidebar'->'latestSlots', '[]'::jsonb)) AS slot(slot_elem)
      ),
      '[]'::jsonb
    ),
    true
  ),
  '{sidebar,categorySlots}',
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'showDate',
          COALESCE(slot_elem->'showDate', 'true'::jsonb),
          'showAuthor',
          COALESCE(slot_elem->'showAuthor', 'true'::jsonb)
        )
      )
      FROM jsonb_array_elements(COALESCE(p."config"->'sidebar'->'categorySlots', '[]'::jsonb)) AS slot(slot_elem)
    ),
    '[]'::jsonb
  ),
  true
)
WHERE jsonb_typeof(p."config"->'sidebar') = 'object';
