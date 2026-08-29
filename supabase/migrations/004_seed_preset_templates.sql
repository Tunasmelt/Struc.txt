-- Seed the six spec-required preset templates.
-- Note: templates.user_id + real RLS policies (SELECT is_preset OR user_id = auth.uid();
-- INSERT/UPDATE/DELETE restricted to user_id = auth.uid()) were already added in
-- 002_add_user_id_and_rls.sql, so this migration only needs to insert data.
--
-- "fieldlog" from prototype/seed.js is intentionally NOT seeded as a 7th preset —
-- the spec explicitly calls for six presets, and fieldlog is the prototype's example
-- of a user-created custom template, not part of the required set.

INSERT INTO templates (id, name, icon_color, fields, is_preset, user_id)
VALUES
  (
    '00000000-0000-4000-8000-000000000001',
    'Meeting minutes',
    '#C08A2E',
    '[
      {"key":"summary","label":"Summary","type":"longtext","required":true,"order":0},
      {"key":"attendees","label":"Attendees","type":"tags","required":false,"order":1},
      {"key":"key_decisions","label":"Decisions","type":"list","required":false,"order":2},
      {"key":"discussion_points","label":"Discussion","type":"longtext","required":false,"order":3},
      {"key":"action_items","label":"Action items","type":"checklist","required":false,"order":4}
    ]'::jsonb,
    true,
    NULL
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'SOAP note',
    '#3F7F63',
    '[
      {"key":"subjective","label":"Subjective","type":"longtext","required":true,"order":0},
      {"key":"objective","label":"Objective","type":"longtext","required":true,"order":1},
      {"key":"assessment","label":"Assessment","type":"longtext","required":true,"order":2},
      {"key":"plan","label":"Plan","type":"longtext","required":false,"order":3}
    ]'::jsonb,
    true,
    NULL
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    '1:1 notes',
    '#3A6699',
    '[
      {"key":"wins","label":"Wins","type":"longtext","required":false,"order":0},
      {"key":"concerns","label":"Concerns","type":"longtext","required":false,"order":1},
      {"key":"follow_ups","label":"Follow-ups","type":"checklist","required":false,"order":2}
    ]'::jsonb,
    true,
    NULL
  ),
  (
    '00000000-0000-4000-8000-000000000004',
    'Journal entry',
    '#B0574F',
    '[
      {"key":"mood","label":"Mood","type":"text","required":false,"order":0},
      {"key":"entry","label":"Entry","type":"longtext","required":true,"order":1}
    ]'::jsonb,
    true,
    NULL
  ),
  (
    '00000000-0000-4000-8000-000000000005',
    'Lecture notes',
    '#69675E',
    '[
      {"key":"outline","label":"Outline","type":"list","required":false,"order":0},
      {"key":"exam_note","label":"Exam note","type":"longtext","required":false,"order":1}
    ]'::jsonb,
    true,
    NULL
  ),
  (
    '00000000-0000-4000-8000-000000000006',
    'Interview notes',
    '#67589F',
    '[
      {"key":"context","label":"Context","type":"longtext","required":false,"order":0},
      {"key":"pain","label":"Pain","type":"longtext","required":false,"order":1},
      {"key":"quote","label":"Quote","type":"text","required":false,"order":2}
    ]'::jsonb,
    true,
    NULL
  )
ON CONFLICT (id) DO NOTHING;
