-- Seed the initial editable questionnaires (ADR-0023): the discovery call's eight
-- captures and the assessment's detailed evidence questions. These are starting
-- defaults — they can be edited/extended in-app, or superseded by a new template
-- version. Idempotent: templates and questions are inserted only if absent. The six
-- summary scorecard RATINGS remain columns on `assessment` (ADR-0022); these questions
-- capture the granular evidence behind them, so nothing is duplicated.

BEGIN;

-- ── Discovery template v1 ───────────────────────────────────────────────────
INSERT INTO question_template (kind, version, title)
SELECT 'discovery', 1, 'Discovery — The AI Inflection Point (v1)'
WHERE NOT EXISTS (SELECT 1 FROM question_template WHERE kind = 'discovery' AND version = 1);

INSERT INTO question (template_id, key, prompt, response_type, options, ordinal, required)
SELECT qt.id, v.key, v.prompt, v.rt::question_response_type, v.opts::jsonb, v.ord, v.req
FROM (VALUES
  ('goals',                'Top business goals over the next 12 months',                       'longtext',      NULL,                                  1, true),
  ('priorities',           'Top 2–3 non-negotiables, and what pushed security up the list',    'longtext',      NULL,                                  2, true),
  ('downtime_cost_per_day','Estimated cost of one day of downtime',                            'currency',      NULL,                                  3, true),
  ('fraud_risk_exposure',  'How money moves; impersonation / BEC exposure',                    'longtext',      NULL,                                  4, true),
  ('insurance_compliance', 'Cyber-insurance, attested controls, compliance/customer pressure', 'longtext',      NULL,                                  5, true),
  ('ai_usage_shadow_ai',   'Sanctioned AI tools, shadow AI, data-governance/AI policy',        'longtext',      NULL,                                  6, true),
  ('decision_urgency',     'Decision maker(s), driving event, and urgency',                    'longtext',      NULL,                                  7, true),
  ('budget_readiness',     'Budget posture for security & IT',                                 'single_select', '["allocated","flexible","none_yet"]', 8, true)
) AS v(key, prompt, rt, opts, ord, req)
CROSS JOIN (SELECT id FROM question_template WHERE kind = 'discovery' AND version = 1) qt
WHERE NOT EXISTS (
  SELECT 1 FROM question q WHERE q.template_id = qt.id AND q.key = v.key
);

-- ── Assessment template v1 (detailed evidence behind the six dimensions) ─────
INSERT INTO question_template (kind, version, title)
SELECT 'assessment', 1, 'AI Security Readiness — evidence (v1)'
WHERE NOT EXISTS (SELECT 1 FROM question_template WHERE kind = 'assessment' AND version = 1);

INSERT INTO question (template_id, key, prompt, response_type, dimension, ordinal, required)
SELECT qt.id, v.key, v.prompt, v.rt::question_response_type, v.dim, v.ord, v.req
FROM (VALUES
  ('local_admin_count',     'How many users have local administrator rights?',                  'number',  'identity', 1, false),
  ('mfa_phishing_resistant','Is MFA phishing-resistant (not just a code or push)?',              'boolean', 'identity', 2, false),
  ('offboarding_access',    'If terminated today, could they still access systems tomorrow?',    'boolean', 'identity', 3, false),
  ('patching_consistent',   'Is patching consistent and current across the fleet?',              'boolean', 'endpoint', 4, false),
  ('flat_network',          'Could one foothold reach everything (flat network)?',               'boolean', 'network',  5, false),
  ('m365_locked_down',      'Are Microsoft 365 sharing & permissions locked down?',              'boolean', 'email',    6, false),
  ('backups_isolated',      'Are backups isolated from ransomware and is restore tested?',       'boolean', 'backup',   7, false),
  ('ir_plan_tested',        'Is there a written, tested incident-response plan?',                'boolean', 'incident', 8, false),
  ('insurance_audit_proof', 'Would cyber-insurance survive a claim audit of attested controls?', 'boolean', 'incident', 9, false)
) AS v(key, prompt, rt, dim, ord, req)
CROSS JOIN (SELECT id FROM question_template WHERE kind = 'assessment' AND version = 1) qt
WHERE NOT EXISTS (
  SELECT 1 FROM question q WHERE q.template_id = qt.id AND q.key = v.key
);

COMMIT;
