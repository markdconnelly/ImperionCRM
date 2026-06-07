-- Seed: Imperion's accounts (initial import). Idempotent via ON CONFLICT (name).
-- Mapping: Type -> relationship; Customer+Active -> lifecycle_stage managed_active;
-- Prospect -> prospect; Partner/Inactive -> dormant; blank type -> prospect/unknown.
-- The "Microsoft 365" managed-platform marker is captured later via the integration
-- identity map (Phase 2), not here.

INSERT INTO account (name, relationship, is_active, lifecycle_stage) VALUES
  ('All Creatures Animal Hospital',                      NULL,         true,  'prospect'),
  ('Anderson Brothers',                                  'prospect',   true,  'prospect'),
  ('Autotask Corporation',                               'customer',   true,  'managed_active'),
  ('Charleston Area Chamber Of Commerce',                'customer',   true,  'managed_active'),
  ('Copper Creek Contractors',                           'customer',   true,  'managed_active'),
  ('Dr. Kim Le',                                         'customer',   true,  'managed_active'),
  ('IL DOGE',                                            'partner',    false, 'dormant'),
  ('Imperion',                                           'customer',   true,  'managed_active'),
  ('IPG',                                                'customer',   true,  'managed_active'),
  ('JD Byrider',                                         'customer',   true,  'managed_active'),
  ('JL Allen',                                           'customer',   true,  'managed_active'),
  ('Kula Group Foundation',                              'customer',   true,  'managed_active'),
  ('Leman Paint Works/Aftershock Decals & Design',       'prospect',   true,  'prospect'),
  ('Pixo',                                               'customer',   true,  'managed_active'),
  ('Providence Home',                                    'customer',   true,  'managed_active'),
  ('Rexdon',                                             'customer',   true,  'managed_active'),
  ('Schoonover Sewer',                                   NULL,         true,  'prospect'),
  ('Seven Silos',                                        'customer',   true,  'managed_active'),
  ('Smith Burger',                                       'prospect',   true,  'prospect'),
  ('Suite Greens',                                       'prospect',   true,  'prospect'),
  ('Sullivan-Parkhill',                                  'customer',   true,  'managed_active'),
  ('The Refugee Center',                                 'customer',   true,  'managed_active'),
  ('The Veteran Broker',                                 'customer',   true,  'managed_active'),
  ('Woodlawn Chapel',                                    'customer',   true,  'managed_active')
ON CONFLICT (name) DO NOTHING;
