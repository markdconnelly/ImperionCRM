-- Seed: one opportunity per account (placeholder MRR), so the dashboard's Active MRR
-- and Open Pipeline come alive. Managed customers get a 'won' active-contract MRR;
-- prospects get an open deal at a sales stage. All marked source='seed' and meant to
-- be replaced by the Kaseya Quote Manager / Autotask feeds (ADR-0012).
-- Idempotent: inserts a seed opportunity only for accounts that don't already have one.

INSERT INTO opportunity (account_id, name, sales_stage, amount_mrr, source, closed_at)
SELECT a.id,
       v.oppname,
       v.stage::opportunity_sales_stage,
       v.mrr,
       'seed',
       CASE WHEN v.stage = 'won' THEN now() ELSE NULL END
FROM (VALUES
  -- managed customers: active contracts (won) with monthly MRR (placeholder)
  ('Autotask Corporation',                         'Autotask Corporation — Managed Services',     'won',       4800),
  ('Charleston Area Chamber Of Commerce',          'Charleston Chamber — Managed Services',       'won',       1200),
  ('Copper Creek Contractors',                     'Copper Creek — Managed Services',             'won',       2600),
  ('Dr. Kim Le',                                   'Dr. Kim Le — Managed Services',               'won',        850),
  ('Imperion',                                     'Imperion — Internal Managed Services',        'won',       1500),
  ('IPG',                                          'IPG — Managed Services',                      'won',       3600),
  ('JD Byrider',                                   'JD Byrider — Managed Services',               'won',       2200),
  ('JL Allen',                                     'JL Allen — Managed Services',                 'won',       1400),
  ('Kula Group Foundation',                        'Kula Group — Managed Services',               'won',       1800),
  ('Pixo',                                         'Pixo — Managed Services',                     'won',       2900),
  ('Providence Home',                              'Providence Home — Managed Services',          'won',       2100),
  ('Rexdon',                                       'Rexdon — Managed Services',                   'won',       5200),
  ('Seven Silos',                                  'Seven Silos — Managed Services',              'won',       1600),
  ('Sullivan-Parkhill',                            'Sullivan-Parkhill — Managed Services',        'won',       4400),
  ('The Refugee Center',                           'The Refugee Center — Managed Services',       'won',       1300),
  ('The Veteran Broker',                           'The Veteran Broker — Managed Services',       'won',       1100),
  ('Woodlawn Chapel',                              'Woodlawn Chapel — Managed Services',          'won',        950),
  -- prospects / unknown: open deals at various stages (estimated MRR)
  ('Anderson Brothers',                            'Anderson Brothers — New MSP Agreement',       'qualified', 2400),
  ('Leman Paint Works/Aftershock Decals & Design', 'Leman/Aftershock — New MSP Agreement',        'proposal',  1900),
  ('Smith Burger',                                 'Smith Burger — New MSP Agreement',            'lead',      1500),
  ('Suite Greens',                                 'Suite Greens — New MSP Agreement',            'qualified', 2800),
  ('All Creatures Animal Hospital',                'All Creatures — New MSP Agreement',           'lead',      1700),
  ('Schoonover Sewer',                             'Schoonover Sewer — New MSP Agreement',        'lead',      1250)
) AS v(acct, oppname, stage, mrr)
JOIN account a ON a.name = v.acct
WHERE NOT EXISTS (
  SELECT 1 FROM opportunity o WHERE o.account_id = a.id AND o.source = 'seed'
);
