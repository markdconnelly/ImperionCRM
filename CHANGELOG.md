# Changelog

## [0.23.0](https://github.com/markdconnelly/ImperionCRM/compare/imperion-crm-v0.22.0...imperion-crm-v0.23.0) (2026-06-21)


### Features

* **agent:** persist app-wide sidecar conversation across navigation ([#1119](https://github.com/markdconnelly/ImperionCRM/issues/1119)) ([#1122](https://github.com/markdconnelly/ImperionCRM/issues/1122)) ([bbb971b](https://github.com/markdconnelly/ImperionCRM/commit/bbb971bfd84f9a9cf25baa939ab34ad4b75552d4))
* **connections:** saveClientCredential data layer for client-scope credentials ([#957](https://github.com/markdconnelly/ImperionCRM/issues/957)) ([#1057](https://github.com/markdconnelly/ImperionCRM/issues/1057)) ([522f7f6](https://github.com/markdconnelly/ImperionCRM/commit/522f7f6cab65cf938c0b0915e8864dcc0710c9c1))
* **data-plane:** entity_xref golden-record registry — schema ([#1054](https://github.com/markdconnelly/ImperionCRM/issues/1054)) ([#1060](https://github.com/markdconnelly/ImperionCRM/issues/1060)) ([bbeca68](https://github.com/markdconnelly/ImperionCRM/commit/bbeca68ebdb77f20c017c52ec93aa23014331e71))
* **jarvis:** Jarvis landing page (/jarvis) — codex chat, session history, drill-in trace ([#1118](https://github.com/markdconnelly/ImperionCRM/issues/1118)) ([#1121](https://github.com/markdconnelly/ImperionCRM/issues/1121)) ([1f8b75f](https://github.com/markdconnelly/ImperionCRM/commit/1f8b75fe24a4aace8f33effab4abb8897f9f549d))
* **metrics:** governed metric_definition store + seed core metrics ([#1055](https://github.com/markdconnelly/ImperionCRM/issues/1055)) ([#1059](https://github.com/markdconnelly/ImperionCRM/issues/1059)) ([9af8225](https://github.com/markdconnelly/ImperionCRM/commit/9af8225b6fbdcc5b71e7f2e1834c49c9f1f41cdc))
* **pax8:** provider + bronze schema + silver mapping ([#1052](https://github.com/markdconnelly/ImperionCRM/issues/1052)) ([#1061](https://github.com/markdconnelly/ImperionCRM/issues/1061)) ([96ff2d7](https://github.com/markdconnelly/ImperionCRM/commit/96ff2d78f76f67952024cbaf4aaaecb1d3767cd3))
* **schema:** Jarvis ledger + action-plane migration ([#1064](https://github.com/markdconnelly/ImperionCRM/issues/1064)) ([#1117](https://github.com/markdconnelly/ImperionCRM/issues/1117)) ([6b285d8](https://github.com/markdconnelly/ImperionCRM/commit/6b285d8a44bb534e6dab2f1f85ee2c5f93307e36))
* **technician:** operator ticket queue + approval cockpit surface ([#1056](https://github.com/markdconnelly/ImperionCRM/issues/1056)) ([#1062](https://github.com/markdconnelly/ImperionCRM/issues/1062)) ([701cabb](https://github.com/markdconnelly/ImperionCRM/commit/701cabb8b89ca4d2513bebd7e31f8f563a840ac9))
* **unifi:** land unifi_devices bronze table + device merge precedence ([#1053](https://github.com/markdconnelly/ImperionCRM/issues/1053)) ([#1063](https://github.com/markdconnelly/ImperionCRM/issues/1063)) ([039cd5b](https://github.com/markdconnelly/ImperionCRM/commit/039cd5b306db08c150b65c7cb013610eb112bbe2))

## [0.22.0](https://github.com/markdconnelly/ImperionCRM/compare/imperion-crm-v0.21.0...imperion-crm-v0.22.0) (2026-06-21)


### Features

* **agents:** actuation autonomy dial + cockpit queue schema ([#1012](https://github.com/markdconnelly/ImperionCRM/issues/1012)) ([#1017](https://github.com/markdconnelly/ImperionCRM/issues/1017)) ([6906b15](https://github.com/markdconnelly/ImperionCRM/commit/6906b15890e15b5b76c8b12b7831bb2fc76d5559))
* **agents:** agent eval & quality plane — spine schema + ADR-0106 ([#984](https://github.com/markdconnelly/ImperionCRM/issues/984)) ([#985](https://github.com/markdconnelly/ImperionCRM/issues/985)) ([f3baf76](https://github.com/markdconnelly/ImperionCRM/commit/f3baf76ee290c3bf4741919f07a710def05d84ac))
* **agents:** eval CI quality gate vs committed baselines ([#988](https://github.com/markdconnelly/ImperionCRM/issues/988)) ([#989](https://github.com/markdconnelly/ImperionCRM/issues/989)) ([d5342db](https://github.com/markdconnelly/ImperionCRM/commit/d5342dbfa8fc8834d83274814e1652001ebe425f))
* **agents:** eval golden-set seed + read-only eval dashboard ([#986](https://github.com/markdconnelly/ImperionCRM/issues/986)) ([#987](https://github.com/markdconnelly/ImperionCRM/issues/987)) ([a723016](https://github.com/markdconnelly/ImperionCRM/commit/a723016c157127d01a4fabfa16ad73ce91f84b73))
* **agents:** per-agent tool-grants admin UI + backend DELETE grant ([#1005](https://github.com/markdconnelly/ImperionCRM/issues/1005)) ([#1006](https://github.com/markdconnelly/ImperionCRM/issues/1006)) ([9925c66](https://github.com/markdconnelly/ImperionCRM/commit/9925c66d47da7aff7b4adcb67d2fd04894ae0792))
* **auth:** two-axis RLS access spine slice 1 — withIdentity + group_ids ([#974](https://github.com/markdconnelly/ImperionCRM/issues/974)) ([#977](https://github.com/markdconnelly/ImperionCRM/issues/977)) ([64c3f5a](https://github.com/markdconnelly/ImperionCRM/commit/64c3f5abb8e1ae6e2c191a3c9171f2f8fd788d16))
* **connections:** add 'unifi' provider to connection_provider ([#957](https://github.com/markdconnelly/ImperionCRM/issues/957)) ([#958](https://github.com/markdconnelly/ImperionCRM/issues/958)) ([fb3f1b3](https://github.com/markdconnelly/ImperionCRM/commit/fb3f1b3dddeec283cc164690f77b55168bf27fb8))
* **connections:** client UniFi console registration form ([#964](https://github.com/markdconnelly/ImperionCRM/issues/964)) ([#965](https://github.com/markdconnelly/ImperionCRM/issues/965)) ([11a89cb](https://github.com/markdconnelly/ImperionCRM/commit/11a89cbade35ece3b527772fab7c8a8d7d5d71aa))
* **db:** access spine slice 2 — first owner-axis RLS policy on personal_note ([#975](https://github.com/markdconnelly/ImperionCRM/issues/975)) ([#978](https://github.com/markdconnelly/ImperionCRM/issues/978)) ([cb0ad32](https://github.com/markdconnelly/ImperionCRM/commit/cb0ad324d78573d4529dcb80d7e7e3ac3ba0c16d))
* **db:** seed sub-agent agent rows + tool grants ([#993](https://github.com/markdconnelly/ImperionCRM/issues/993)) ([#1002](https://github.com/markdconnelly/ImperionCRM/issues/1002)) ([4767707](https://github.com/markdconnelly/ImperionCRM/commit/476770709563e15a80f3abf43b11792a51201ef2))
* **intune:** managed-apps bronze + device-CI drill section ([#261](https://github.com/markdconnelly/ImperionCRM/issues/261)) ([#952](https://github.com/markdconnelly/ImperionCRM/issues/952)) ([c1c60d2](https://github.com/markdconnelly/ImperionCRM/commit/c1c60d2ff62c215356fd318696961f979b76bc68))
* **schema:** add connection.client_id for per-client m365 app registrations ([#943](https://github.com/markdconnelly/ImperionCRM/issues/943)) ([#951](https://github.com/markdconnelly/ImperionCRM/issues/951)) ([d2c7a61](https://github.com/markdconnelly/ImperionCRM/commit/d2c7a61f5d2e30274328e7d87c0564477f2c3ede))
* **schema:** add connection.provider_config jsonb for non-secret per-connection config ([#962](https://github.com/markdconnelly/ImperionCRM/issues/962)) ([#963](https://github.com/markdconnelly/ImperionCRM/issues/963)) ([6df060a](https://github.com/markdconnelly/ImperionCRM/commit/6df060a91bff319eb9f81a72795c6cee9260421b))
* **schema:** widen connection.auth_method CHECK to include 'api_key' ([#960](https://github.com/markdconnelly/ImperionCRM/issues/960)) ([#961](https://github.com/markdconnelly/ImperionCRM/issues/961)) ([f7b06bd](https://github.com/markdconnelly/ImperionCRM/commit/f7b06bd75ec62572da5b0202116196958d88fb05))
* **settings:** admin UX to register a client tenant's M365 app credential ([#950](https://github.com/markdconnelly/ImperionCRM/issues/950)) ([#959](https://github.com/markdconnelly/ImperionCRM/issues/959)) ([24073fe](https://github.com/markdconnelly/ImperionCRM/commit/24073fe4daaba1870763f3e1cf42e9a8d6f9e23f))


### Bug Fixes

* **db:** preserve numeric(12,2) amount in expense_item_all view ([#947](https://github.com/markdconnelly/ImperionCRM/issues/947)) ([#948](https://github.com/markdconnelly/ImperionCRM/issues/948)) ([8663aa7](https://github.com/markdconnelly/ImperionCRM/commit/8663aa73032a14e5a2c3c0b74d128d64d28bfd63))

## [0.21.0](https://github.com/markdconnelly/ImperionCRM/compare/imperion-crm-v0.20.0...imperion-crm-v0.21.0) (2026-06-20)


### Features

* **account:** credentials panel on the account page — client integrations for this company ([#906](https://github.com/markdconnelly/ImperionCRM/issues/906)) ([#910](https://github.com/markdconnelly/ImperionCRM/issues/910)) ([a1ef2c0](https://github.com/markdconnelly/ImperionCRM/commit/a1ef2c0c30ae09d29a6a2cfa5821c9eaba9a27e1))
* **ci:** extend semantic-layer gate to skill-pointer integrity ([#915](https://github.com/markdconnelly/ImperionCRM/issues/915)) ([#924](https://github.com/markdconnelly/ImperionCRM/issues/924)) ([c7fd03c](https://github.com/markdconnelly/ImperionCRM/commit/c7fd03c09928f13f9e13b71be81ddc859732d28d))
* **cmdb:** cloud CI arm — project silver cloud_asset into the register ([#875](https://github.com/markdconnelly/ImperionCRM/issues/875)) ([#880](https://github.com/markdconnelly/ImperionCRM/issues/880)) ([7a6473c](https://github.com/markdconnelly/ImperionCRM/commit/7a6473cb647feea73888d91459419d86fcd0caf1))
* **cmdb:** cloud-asset as a first-class CI — relationships + criticality ([#653](https://github.com/markdconnelly/ImperionCRM/issues/653)) ([#926](https://github.com/markdconnelly/ImperionCRM/issues/926)) ([4a04e5e](https://github.com/markdconnelly/ImperionCRM/commit/4a04e5ef0eabc5215db81f278741a31da96111b4))
* **cmdb:** converge device inventory and device CIs ([#882](https://github.com/markdconnelly/ImperionCRM/issues/882)) ([#946](https://github.com/markdconnelly/ImperionCRM/issues/946)) ([cd67224](https://github.com/markdconnelly/ImperionCRM/commit/cd67224b234fec73f786cb855874a9d82dd8a152))
* **cmdb:** unify the asset surface into one quick-filter table ([#876](https://github.com/markdconnelly/ImperionCRM/issues/876)) ([#881](https://github.com/markdconnelly/ImperionCRM/issues/881)) ([b799a5f](https://github.com/markdconnelly/ImperionCRM/commit/b799a5f6b9135f4517cf0aeb30747acca4dbfed3))
* **data:** expose numeric revenue split on ReportsRepository ([#844](https://github.com/markdconnelly/ImperionCRM/issues/844)) ([#938](https://github.com/markdconnelly/ImperionCRM/issues/938)) ([65eaac9](https://github.com/markdconnelly/ImperionCRM/commit/65eaac909dd94bdeb0478d09f4dca2fa55a732e8))
* **db:** admit Datto RMM into silver device precedence + BCDR backup-posture merge ([#683](https://github.com/markdconnelly/ImperionCRM/issues/683)) ([#879](https://github.com/markdconnelly/ImperionCRM/issues/879)) ([469fc4f](https://github.com/markdconnelly/ImperionCRM/commit/469fc4ff8e86e05b43415d3eefdd9ad16abb7b42))
* **db:** silver cloud_asset + cloud_provider enum (multi-cloud CMDB) ([#874](https://github.com/markdconnelly/ImperionCRM/issues/874)) ([#878](https://github.com/markdconnelly/ImperionCRM/issues/878)) ([82cdb5e](https://github.com/markdconnelly/ImperionCRM/commit/82cdb5efd3a8151c0e34494fd007e8d7db890c17))
* **db:** website_mileage bronze + expense_item_all view for manual mileage ([#851](https://github.com/markdconnelly/ImperionCRM/issues/851)) ([#855](https://github.com/markdconnelly/ImperionCRM/issues/855)) ([85e4736](https://github.com/markdconnelly/ImperionCRM/commit/85e47363bbce5fa0c02d787cabc33591a33182ea))
* **db:** widen posture_policy.policy_family CHECK to admit 'purview_compliance' ([#687](https://github.com/markdconnelly/ImperionCRM/issues/687)) ([#937](https://github.com/markdconnelly/ImperionCRM/issues/937)) ([3e72aff](https://github.com/markdconnelly/ImperionCRM/commit/3e72aff684cf540de6066443e6cf8ef41e112bde))
* **expense:** Autotask ticket picker — searchable typeahead over silver ticket ([#852](https://github.com/markdconnelly/ImperionCRM/issues/852)) ([#857](https://github.com/markdconnelly/ImperionCRM/issues/857)) ([cd95e19](https://github.com/markdconnelly/ImperionCRM/commit/cd95e19dcc2fcd2e443b1e335c4af43a9360c21a))
* **expense:** manual mileage entry + Autotask ticket link (v1 MileIQ interim) ([#853](https://github.com/markdconnelly/ImperionCRM/issues/853)) ([#859](https://github.com/markdconnelly/ImperionCRM/issues/859)) ([ab22e1c](https://github.com/markdconnelly/ImperionCRM/commit/ab22e1cb6ab103dfc69d70d3468fa19524bbbea6))
* **expense:** out-of-pocket entry GUI + policy memory-jogger ([#487](https://github.com/markdconnelly/ImperionCRM/issues/487)) ([#900](https://github.com/markdconnelly/ImperionCRM/issues/900)) ([3d27f8b](https://github.com/markdconnelly/ImperionCRM/commit/3d27f8b0963d2debe38511937f778f408a64b93e))
* **expense:** receipt upload UI wired to live backend endpoint ([#899](https://github.com/markdconnelly/ImperionCRM/issues/899)) ([#941](https://github.com/markdconnelly/ImperionCRM/issues/941)) ([d8c5aa4](https://github.com/markdconnelly/ImperionCRM/commit/d8c5aa4711f6253a983c69b6831461e8a7d440e6))
* **icm:** enforce stage Inputs OKF grounding markers ([#917](https://github.com/markdconnelly/ImperionCRM/issues/917)) ([#927](https://github.com/markdconnelly/ImperionCRM/issues/927)) ([e9253c0](https://github.com/markdconnelly/ImperionCRM/commit/e9253c0139c1a9e307c199fe03fe9e16abef3d1a))
* **integrations:** MileIQ API client scaffolding + ADR-0099 (v2-ready) ([#854](https://github.com/markdconnelly/ImperionCRM/issues/854)) ([#861](https://github.com/markdconnelly/ImperionCRM/issues/861)) ([24bcaff](https://github.com/markdconnelly/ImperionCRM/commit/24bcaffca5ff6839a420ea9aa53b2c5de4407a25))
* **legal:** public EULA + Privacy Policy pages for QBO production app ([#934](https://github.com/markdconnelly/ImperionCRM/issues/934)) ([#935](https://github.com/markdconnelly/ImperionCRM/issues/935)) ([6b8dd53](https://github.com/markdconnelly/ImperionCRM/commit/6b8dd532833bd792506d903e9f1858d14e8546ce))
* **okf:** backfill entity + archetype routing keys; fix collections_activity drift ([#913](https://github.com/markdconnelly/ImperionCRM/issues/913)) ([#919](https://github.com/markdconnelly/ImperionCRM/issues/919)) ([8e2fd92](https://github.com/markdconnelly/ImperionCRM/commit/8e2fd92a0f7e75ebc3e4c59565774a8ff455c9eb))
* **okf:** source_skill registry — the tool-routing hop OKF points at ([#914](https://github.com/markdconnelly/ImperionCRM/issues/914)) ([#923](https://github.com/markdconnelly/ImperionCRM/issues/923)) ([c455999](https://github.com/markdconnelly/ImperionCRM/commit/c455999d4dd1fac5ae13b9c3470108d19da1702c))
* **okf:** Tier-1 act-path concept files — 6 D/H entities the orchestrator acts through ([#536](https://github.com/markdconnelly/ImperionCRM/issues/536)) ([#922](https://github.com/markdconnelly/ImperionCRM/issues/922)) ([647ebf5](https://github.com/markdconnelly/ImperionCRM/commit/647ebf52364e5b5fb8e469229866cf6d78c2a87e))
* **opportunity:** sales notes + knowledge upload to website bronze ([#429](https://github.com/markdconnelly/ImperionCRM/issues/429)) ([#944](https://github.com/markdconnelly/ImperionCRM/issues/944)) ([d199c0c](https://github.com/markdconnelly/ImperionCRM/commit/d199c0c7ca1f9b2552ae71a2bd969fc55e451c9b))
* **schema:** connection credential-registry fields — client scope + account_id + cert-or-secret ([#904](https://github.com/markdconnelly/ImperionCRM/issues/904)) ([#908](https://github.com/markdconnelly/ImperionCRM/issues/908)) ([28b7e57](https://github.com/markdconnelly/ImperionCRM/commit/28b7e57e613183bb4600b2568f69dcc0abf03e3c))
* **settings:** Credentials catalog — Key Vault credential registry by scope, names only ([#905](https://github.com/markdconnelly/ImperionCRM/issues/905)) ([#909](https://github.com/markdconnelly/ImperionCRM/issues/909)) ([8ac2f13](https://github.com/markdconnelly/ImperionCRM/commit/8ac2f13ccb613b9510c943aa0f37b1eb9fbd010b))
* **settings:** DocuSign "Test connection" button ([#867](https://github.com/markdconnelly/ImperionCRM/issues/867)) ([#868](https://github.com/markdconnelly/ImperionCRM/issues/868)) ([49230cd](https://github.com/markdconnelly/ImperionCRM/commit/49230cd8b07e0de2e5c0ce9eb9e5940710c1888b))
* **settings:** DocuSign company-credential card + admin-consent button ([#862](https://github.com/markdconnelly/ImperionCRM/issues/862)) ([#863](https://github.com/markdconnelly/ImperionCRM/issues/863)) ([09e2236](https://github.com/markdconnelly/ImperionCRM/commit/09e2236445d3bd8155a6bb193ac01d560da1d037))
* **skills:** vendor minimalist-code (ponytail-style) skill ([#886](https://github.com/markdconnelly/ImperionCRM/issues/886)) ([#887](https://github.com/markdconnelly/ImperionCRM/issues/887)) ([5238876](https://github.com/markdconnelly/ImperionCRM/commit/5238876658a79e70867c55b731cc1089d5373d35))


### Bug Fixes

* **cmdb:** allow 'cloud' in change_affected_ci.ci_type CHECK ([#925](https://github.com/markdconnelly/ImperionCRM/issues/925)) ([#936](https://github.com/markdconnelly/ImperionCRM/issues/936)) ([6aca698](https://github.com/markdconnelly/ImperionCRM/commit/6aca698049e75c682d28931467706d11d65a9ec7))
* **cmdb:** cast account.relationship to text in CI union coalesce ([#870](https://github.com/markdconnelly/ImperionCRM/issues/870)) ([#871](https://github.com/markdconnelly/ImperionCRM/issues/871)) ([8954d76](https://github.com/markdconnelly/ImperionCRM/commit/8954d764a6075859104edf5143e2084ea00d3472))
* **db:** grant imperion-localpipeline DML on cloud_asset + contact_enrichment ([#920](https://github.com/markdconnelly/ImperionCRM/issues/920)) ([#921](https://github.com/markdconnelly/ImperionCRM/issues/921)) ([1968313](https://github.com/markdconnelly/ImperionCRM/commit/1968313f76e7b885e95fff7706edf1a887c7637e))
* **expenses:** enforce the hard-violation gate at attestation ([#895](https://github.com/markdconnelly/ImperionCRM/issues/895)) ([#898](https://github.com/markdconnelly/ImperionCRM/issues/898)) ([5adc95d](https://github.com/markdconnelly/ImperionCRM/commit/5adc95daf164525cb189f84029ae2a4aa69ac9ed))
* **oauth:** resolve callback redirect origin from proxy headers ([#931](https://github.com/markdconnelly/ImperionCRM/issues/931)) ([#933](https://github.com/markdconnelly/ImperionCRM/issues/933)) ([5683f98](https://github.com/markdconnelly/ImperionCRM/commit/5683f98316b7aeb2c7e37bf795d7c4fe28fe6a82))
* **security:** harden work-activity read guard + validate SharePoint URLs ([#883](https://github.com/markdconnelly/ImperionCRM/issues/883)) ([#885](https://github.com/markdconnelly/ImperionCRM/issues/885)) ([155a117](https://github.com/markdconnelly/ImperionCRM/commit/155a11734ed470948470c112af8b8eb6d15f1e81))
* **settings:** split DocuSign test-connection error messages by HTTP status ([#942](https://github.com/markdconnelly/ImperionCRM/issues/942)) ([4066146](https://github.com/markdconnelly/ImperionCRM/commit/4066146be5b4d8587a0e7d6af4a45bdfa39957ef))

## [0.20.0](https://github.com/markdconnelly/ImperionCRM/compare/imperion-crm-v0.19.0...imperion-crm-v0.20.0) (2026-06-17)


### Features

* **opt-in:** public SMS/email opt-in & consent capture page ([#217](https://github.com/markdconnelly/ImperionCRM/issues/217)) ([#848](https://github.com/markdconnelly/ImperionCRM/issues/848)) ([ceed90d](https://github.com/markdconnelly/ImperionCRM/commit/ceed90d48c5c44b0d0955024f558af6b0ebf8b46))
* **reporting:** expense analytics report in the BI hub ([#492](https://github.com/markdconnelly/ImperionCRM/issues/492)) ([#846](https://github.com/markdconnelly/ImperionCRM/issues/846)) ([590d9ca](https://github.com/markdconnelly/ImperionCRM/commit/590d9ca82b040c111a07fc67721f779bd3623328))
* **reporting:** finance domain report page ([#832](https://github.com/markdconnelly/ImperionCRM/issues/832)) ([#841](https://github.com/markdconnelly/ImperionCRM/issues/841)) ([7a5a2b2](https://github.com/markdconnelly/ImperionCRM/commit/7a5a2b21fe67b15df07e4fd9205a9522be632a26))
* **reporting:** marketing domain report page ([#828](https://github.com/markdconnelly/ImperionCRM/issues/828)) ([#837](https://github.com/markdconnelly/ImperionCRM/issues/837)) ([b6a624b](https://github.com/markdconnelly/ImperionCRM/commit/b6a624bdf5f72f1f0901484420b13440a0b02539))
* **reporting:** project domain report page ([#830](https://github.com/markdconnelly/ImperionCRM/issues/830)) ([#838](https://github.com/markdconnelly/ImperionCRM/issues/838)) ([5d1a708](https://github.com/markdconnelly/ImperionCRM/commit/5d1a7083e01a9268216ea3f35397e8ceae07e2fb))
* **reporting:** sales domain report page ([#829](https://github.com/markdconnelly/ImperionCRM/issues/829)) ([#840](https://github.com/markdconnelly/ImperionCRM/issues/840)) ([6a0fd67](https://github.com/markdconnelly/ImperionCRM/commit/6a0fd6734becdbeeb68b29d7143baff8aadbc5a8))
* **reporting:** service domain report page ([#831](https://github.com/markdconnelly/ImperionCRM/issues/831)) ([#839](https://github.com/markdconnelly/ImperionCRM/issues/839)) ([580a410](https://github.com/markdconnelly/ImperionCRM/commit/580a4109ea8789f49ff47c1ce45c98e221f32b11))
* **security:** tenant hygiene posture — domains, app regs, role assignments bronze + benchmark ([#260](https://github.com/markdconnelly/ImperionCRM/issues/260)) ([#845](https://github.com/markdconnelly/ImperionCRM/issues/845)) ([1204d67](https://github.com/markdconnelly/ImperionCRM/commit/1204d67dea6c4682d2e1b0a0fed531df77974fe7))
* **settings:** build out tenant-mapping, global connections, assessment templates, SLA overview ([#833](https://github.com/markdconnelly/ImperionCRM/issues/833)) ([#842](https://github.com/markdconnelly/ImperionCRM/issues/842)) ([46c450c](https://github.com/markdconnelly/ImperionCRM/commit/46c450c1768c199989e99be400523180041a482d))

## [0.19.0](https://github.com/markdconnelly/ImperionCRM/compare/imperion-crm-v0.18.0...imperion-crm-v0.19.0) (2026-06-17)


### Features

* **change:** change calendar / scheduling ([#660](https://github.com/markdconnelly/ImperionCRM/issues/660)) ([#827](https://github.com/markdconnelly/ImperionCRM/issues/827)) ([818926c](https://github.com/markdconnelly/ImperionCRM/commit/818926c54e8a04dbf2f15898addf7f0a00b5ab58))
* **change:** change request core — schema + /changes CRUD ([#656](https://github.com/markdconnelly/ImperionCRM/issues/656)) ([#823](https://github.com/markdconnelly/ImperionCRM/issues/823)) ([78224e9](https://github.com/markdconnelly/ImperionCRM/commit/78224e90a7bf034e96ad8f28fad7fcf92b295ca6))
* **change:** CMDB-derived risk + manual override ([#658](https://github.com/markdconnelly/ImperionCRM/issues/658)) ([#825](https://github.com/markdconnelly/ImperionCRM/issues/825)) ([3d9b8a1](https://github.com/markdconnelly/ImperionCRM/commit/3d9b8a19823f96974080b85c3e4f30266b3bc9c1))
* **change:** lightweight approval flow by change type ([#659](https://github.com/markdconnelly/ImperionCRM/issues/659)) ([#826](https://github.com/markdconnelly/ImperionCRM/issues/826)) ([dd1eac4](https://github.com/markdconnelly/ImperionCRM/commit/dd1eac4d72dfdf02bc3caacdc5ac7c0122d947a4))

## [0.18.0](https://github.com/markdconnelly/ImperionCRM/compare/imperion-crm-v0.17.0...imperion-crm-v0.18.0) (2026-06-17)


### Features

* **cmdb:** derived asset lifecycle states ([#649](https://github.com/markdconnelly/ImperionCRM/issues/649)) ([#817](https://github.com/markdconnelly/ImperionCRM/issues/817)) ([62428e6](https://github.com/markdconnelly/ImperionCRM/commit/62428e6cb01426a5b416e1a97451ba20c718d6c4))
* **cmdb:** impact analysis n-hop read-model + panel ([#650](https://github.com/markdconnelly/ImperionCRM/issues/650)) ([#821](https://github.com/markdconnelly/ImperionCRM/issues/821)) ([b7eca04](https://github.com/markdconnelly/ImperionCRM/commit/b7eca04403ba63dd75c8db963091fccbaf5b7e53))
* **icm:** glass-box run viewer + approval queue + autonomy dial ([#278](https://github.com/markdconnelly/ImperionCRM/issues/278)) ([#818](https://github.com/markdconnelly/ImperionCRM/issues/818)) ([b381f84](https://github.com/markdconnelly/ImperionCRM/commit/b381f844a12d04373e16434c884f051a7a79f3fb))
* **marketing:** message-template store + composer ([#731](https://github.com/markdconnelly/ImperionCRM/issues/731)) ([#819](https://github.com/markdconnelly/ImperionCRM/issues/819)) ([ea192dc](https://github.com/markdconnelly/ImperionCRM/commit/ea192dc33caf47327456af7e565c77766e2a40c4))

## [0.17.0](https://github.com/markdconnelly/ImperionCRM/compare/imperion-crm-v0.16.0...imperion-crm-v0.17.0) (2026-06-17)


### Features

* **accounts:** move security-posture-at-a-glance to account detail ([#797](https://github.com/markdconnelly/ImperionCRM/issues/797)) ([#803](https://github.com/markdconnelly/ImperionCRM/issues/803)) ([ef239f9](https://github.com/markdconnelly/ImperionCRM/commit/ef239f963c77610b51b18c4dde915a5c44e5a00b))
* **cmdb:** CI criticality — manual override with derived default ([#648](https://github.com/markdconnelly/ImperionCRM/issues/648)) ([#814](https://github.com/markdconnelly/ImperionCRM/issues/814)) ([d6e1dc7](https://github.com/markdconnelly/ImperionCRM/commit/d6e1dc7307f60c4536c138d69cd9e35b41f8c152))
* **cmdb:** CI relationships — derived + manual edges + dependency graph ([#647](https://github.com/markdconnelly/ImperionCRM/issues/647)) ([#813](https://github.com/markdconnelly/ImperionCRM/issues/813)) ([56e2e08](https://github.com/markdconnelly/ImperionCRM/commit/56e2e08923bed9d551fb13d5deefe9b0928c838b))
* **cmdb:** merge Devices & Assets into CMDB ([#795](https://github.com/markdconnelly/ImperionCRM/issues/795)) ([#801](https://github.com/markdconnelly/ImperionCRM/issues/801)) ([eb00c55](https://github.com/markdconnelly/ImperionCRM/commit/eb00c55883e1f7e57249447525597c914c5bf762))
* **db:** conversation_segment_citation view + localpipeline SELECT grants ([#663](https://github.com/markdconnelly/ImperionCRM/issues/663)) ([#808](https://github.com/markdconnelly/ImperionCRM/issues/808)) ([0a7b2b8](https://github.com/markdconnelly/ImperionCRM/commit/0a7b2b8801cf99826265d945924b3d1e6d7b2805))
* **db:** per-client Azure ARM cloud-resource bronze tables ([#800](https://github.com/markdconnelly/ImperionCRM/issues/800)) ([#809](https://github.com/markdconnelly/ImperionCRM/issues/809)) ([e6bf28e](https://github.com/markdconnelly/ImperionCRM/commit/e6bf28e7a3e42fa8a3e04e1ab4cc2605b68cd645))
* **db:** segment + segment_member CRM contact sets ([#420](https://github.com/markdconnelly/ImperionCRM/issues/420)) ([#805](https://github.com/markdconnelly/ImperionCRM/issues/805)) ([7dc9625](https://github.com/markdconnelly/ImperionCRM/commit/7dc9625f962bf548b1c64ce1bd559407909f0d28))
* **db:** typed Autotask SLA targets on silver ticket + COALESCE into breach view ([#666](https://github.com/markdconnelly/ImperionCRM/issues/666)) ([#810](https://github.com/markdconnelly/ImperionCRM/issues/810)) ([4ae2311](https://github.com/markdconnelly/ImperionCRM/commit/4ae2311423843bbb5ffd02488fc4fee2ef32689b))
* **integrations:** connector catalog GUI ([#416](https://github.com/markdconnelly/ImperionCRM/issues/416)) ([#747](https://github.com/markdconnelly/ImperionCRM/issues/747)) ([7f16733](https://github.com/markdconnelly/ImperionCRM/commit/7f16733972b92298ef56f348774f6f8c832d4cb0))
* **integrations:** connector_instance registry + manifest format ([#414](https://github.com/markdconnelly/ImperionCRM/issues/414)) ([#746](https://github.com/markdconnelly/ImperionCRM/issues/746)) ([67d2cf5](https://github.com/markdconnelly/ImperionCRM/commit/67d2cf5d0932dc3864309fe9c452bf39cec7c4b1))
* **marketing:** segment management — build segments + add/remove contacts ([#421](https://github.com/markdconnelly/ImperionCRM/issues/421)) ([#806](https://github.com/markdconnelly/ImperionCRM/issues/806)) ([bd4d35c](https://github.com/markdconnelly/ImperionCRM/commit/bd4d35cd8d7b2358f86631a7daa68222bbe4bc57))
* **nav:** collapsible grouped sidebar + role-driven hide-entirely menu ([#794](https://github.com/markdconnelly/ImperionCRM/issues/794)) ([#798](https://github.com/markdconnelly/ImperionCRM/issues/798)) ([4285413](https://github.com/markdconnelly/ImperionCRM/commit/42854132277f5693321646dd7878e02ae7474c34))
* **profile:** /profile page (avatar-linked) + move personal connections ([#796](https://github.com/markdconnelly/ImperionCRM/issues/796)) ([#802](https://github.com/markdconnelly/ImperionCRM/issues/802)) ([ecaf9c6](https://github.com/markdconnelly/ImperionCRM/commit/ecaf9c6b8756653818624f61ff5cf3de4b5ff17c))
* **schema:** add m365_call + meta enum values ([#799](https://github.com/markdconnelly/ImperionCRM/issues/799), [#603](https://github.com/markdconnelly/ImperionCRM/issues/603)) ([#807](https://github.com/markdconnelly/ImperionCRM/issues/807)) ([d18c626](https://github.com/markdconnelly/ImperionCRM/commit/d18c6268fa8a364f3754dcc88e2ca7ab58352e5e))


### Bug Fixes

* **docs:** make adr-index --check EOL-agnostic ([#792](https://github.com/markdconnelly/ImperionCRM/issues/792)) ([#793](https://github.com/markdconnelly/ImperionCRM/issues/793)) ([23347d3](https://github.com/markdconnelly/ImperionCRM/commit/23347d3971ae1f10bfc2fac1cbe67cc51ab668c9))


### Performance Improvements

* **reporting:** query-cost guardrails on the report runner ([#413](https://github.com/markdconnelly/ImperionCRM/issues/413)) ([#744](https://github.com/markdconnelly/ImperionCRM/issues/744)) ([ea2fd60](https://github.com/markdconnelly/ImperionCRM/commit/ea2fd6020fe721d6d129f13ed31963e6cefd2cf5))

## [0.16.0](https://github.com/markdconnelly/ImperionCRM/compare/imperion-crm-v0.15.0...imperion-crm-v0.16.0) (2026-06-16)


### Features

* **cmdb:** CI read-model + register surface ([#645](https://github.com/markdconnelly/ImperionCRM/issues/645)) ([#738](https://github.com/markdconnelly/ImperionCRM/issues/738)) ([2bb4e5b](https://github.com/markdconnelly/ImperionCRM/commit/2bb4e5b557dac920a6cf6eb52615b692c0c88e54))
* **pipeline:** dedicated deal/opportunity 360 route hosting conversation panel ([#681](https://github.com/markdconnelly/ImperionCRM/issues/681)) ([#737](https://github.com/markdconnelly/ImperionCRM/issues/737)) ([0820499](https://github.com/markdconnelly/ImperionCRM/commit/082049917a17434500e77a802fc3b5c45ec6a2a5))
* **reporting:** dashboard compose + share over saved reports ([#412](https://github.com/markdconnelly/ImperionCRM/issues/412)) ([#743](https://github.com/markdconnelly/ImperionCRM/issues/743)) ([2c6b408](https://github.com/markdconnelly/ImperionCRM/commit/2c6b40893d115ee62ac1a57dc6642ee470c3db07))
* **reporting:** governed semantic model — reportable objects/fields + RBAC scoping ([#409](https://github.com/markdconnelly/ImperionCRM/issues/409)) ([#740](https://github.com/markdconnelly/ImperionCRM/issues/740)) ([492134a](https://github.com/markdconnelly/ImperionCRM/commit/492134a7c6ff5da6ea754f2ad6580d3c50707587))
* **reporting:** report_definition + dashboard schema + accessors ([#410](https://github.com/markdconnelly/ImperionCRM/issues/410)) ([#741](https://github.com/markdconnelly/ImperionCRM/issues/741)) ([97126a4](https://github.com/markdconnelly/ImperionCRM/commit/97126a491a09441430029772f298e7ee9b70f70c))
* **reporting:** self-serve report builder UI + in-memory executor ([#411](https://github.com/markdconnelly/ImperionCRM/issues/411)) ([#742](https://github.com/markdconnelly/ImperionCRM/issues/742)) ([cb5db88](https://github.com/markdconnelly/ImperionCRM/commit/cb5db881e2114b5bf5d9105aee5b4590868d9cbd))

## [0.15.0](https://github.com/markdconnelly/ImperionCRM/compare/imperion-crm-v0.14.0...imperion-crm-v0.15.0) (2026-06-16)


### Features

* **projects:** board columns read configurable status_def sets ([#613](https://github.com/markdconnelly/ImperionCRM/issues/613)) ([#733](https://github.com/markdconnelly/ImperionCRM/issues/733)) ([9f6a0ca](https://github.com/markdconnelly/ImperionCRM/commit/9f6a0cadce72238ba6f36b9ae45735aa095492b5))
* **projects:** per-status WIP-limit UI + over-limit board highlight ([#616](https://github.com/markdconnelly/ImperionCRM/issues/616)) ([#736](https://github.com/markdconnelly/ImperionCRM/issues/736)) ([0d3f44d](https://github.com/markdconnelly/ImperionCRM/commit/0d3f44d43d5aa73fb642d7e01f7788cbb8339146))
* **reporting:** rollups re-key off status_def.category ([#615](https://github.com/markdconnelly/ImperionCRM/issues/615)) ([#735](https://github.com/markdconnelly/ImperionCRM/issues/735)) ([e075c3f](https://github.com/markdconnelly/ImperionCRM/commit/e075c3f978a3c897c11afd3f5cf37b80de1d99b3))
* **tasks:** intake form field mapping to assignee + custom fields ([#638](https://github.com/markdconnelly/ImperionCRM/issues/638)) ([#732](https://github.com/markdconnelly/ImperionCRM/issues/732)) ([b7686c2](https://github.com/markdconnelly/ImperionCRM/commit/b7686c2b4d8cd43300ad5f61ed68211e5d686183))

## [0.14.0](https://github.com/markdconnelly/ImperionCRM/compare/imperion-crm-v0.13.0...imperion-crm-v0.14.0) (2026-06-16)


### Features

* **projects:** admin status-set CRUD ([#616](https://github.com/markdconnelly/ImperionCRM/issues/616)) ([#730](https://github.com/markdconnelly/ImperionCRM/issues/730)) ([fc19d4b](https://github.com/markdconnelly/ImperionCRM/commit/fc19d4bfe2e1dac5854c8c3d93c5c2bc8968719b))
* **projects:** goal authoring GUI + link management + task-level rollup ([#621](https://github.com/markdconnelly/ImperionCRM/issues/621)) ([#727](https://github.com/markdconnelly/ImperionCRM/issues/727)) ([1e6fd4b](https://github.com/markdconnelly/ImperionCRM/commit/1e6fd4be5f80451ff7d1b4bd04c4878a9378c977))
* **projects:** task checklist templates ([#633](https://github.com/markdconnelly/ImperionCRM/issues/633)) ([#726](https://github.com/markdconnelly/ImperionCRM/issues/726)) ([62ea89b](https://github.com/markdconnelly/ImperionCRM/commit/62ea89bc9dcbd447d45b682e678466291abb57cf))
* **tasks:** in-place intake form editor ([#639](https://github.com/markdconnelly/ImperionCRM/issues/639)) ([#729](https://github.com/markdconnelly/ImperionCRM/issues/729)) ([a535a17](https://github.com/markdconnelly/ImperionCRM/commit/a535a179338eddcbce07411f557e4ea6416a1265))

## [0.13.0](https://github.com/markdconnelly/ImperionCRM/compare/imperion-crm-v0.12.0...imperion-crm-v0.13.0) (2026-06-16)


### Features

* **agents:** agent.yaml workspace manifest schema (CMA agent-object shape) ([#699](https://github.com/markdconnelly/ImperionCRM/issues/699)) ([#713](https://github.com/markdconnelly/ImperionCRM/issues/713)) ([b9a3414](https://github.com/markdconnelly/ImperionCRM/commit/b9a3414b0ab8abcc996180bbf37746f0c2d0f9bf))
* **collections:** /collections aging worklist + dunning panel ([#678](https://github.com/markdconnelly/ImperionCRM/issues/678)) ([#722](https://github.com/markdconnelly/ImperionCRM/issues/722)) ([e59a1e7](https://github.com/markdconnelly/ImperionCRM/commit/e59a1e70cca26fb09d7528e221fa6388abbd6a24))
* **collections:** gated dunning send — approved reminder → employee M365 mailbox ([#679](https://github.com/markdconnelly/ImperionCRM/issues/679)) ([#724](https://github.com/markdconnelly/ImperionCRM/issues/724)) ([f16e8af](https://github.com/markdconnelly/ImperionCRM/commit/f16e8afbf51efad347a4ece31a3612da57f6340d))
* **projects:** in-place edit of project templates ([#634](https://github.com/markdconnelly/ImperionCRM/issues/634)) ([#712](https://github.com/markdconnelly/ImperionCRM/issues/712)) ([da35ea9](https://github.com/markdconnelly/ImperionCRM/commit/da35ea964a23d205f9bef6b876497c2ee5ce3bb7))
* **projects:** timeline/gantt + calendar span view over task.start_at ([#628](https://github.com/markdconnelly/ImperionCRM/issues/628)) ([#703](https://github.com/markdconnelly/ImperionCRM/issues/703)) ([eba9ebe](https://github.com/markdconnelly/ImperionCRM/commit/eba9ebe628311e15f879a38321772cc61e740291))
* **schema:** agent_autopilot_policy autonomy dial ([#721](https://github.com/markdconnelly/ImperionCRM/issues/721)) ([#723](https://github.com/markdconnelly/ImperionCRM/issues/723)) ([e6011ce](https://github.com/markdconnelly/ImperionCRM/commit/e6011ce937e019bbad5b76da725fc074292107f0))
* **schema:** collections_activity dunning overlay ([#677](https://github.com/markdconnelly/ImperionCRM/issues/677)) ([#720](https://github.com/markdconnelly/ImperionCRM/issues/720)) ([d9aaced](https://github.com/markdconnelly/ImperionCRM/commit/d9aaced0bc99a4aad625a4fa7d0c5b1bfc737de8))
* **schema:** silver invoice read-only mirror ([#668](https://github.com/markdconnelly/ImperionCRM/issues/668)) ([#718](https://github.com/markdconnelly/ImperionCRM/issues/718)) ([c541046](https://github.com/markdconnelly/ImperionCRM/commit/c54104649a1d906b326151e45347642bd2b72195))
* **tasks:** custom-field columns + filter on list/board + reporting ([#714](https://github.com/markdconnelly/ImperionCRM/issues/714)) ([#725](https://github.com/markdconnelly/ImperionCRM/issues/725)) ([1b03e3a](https://github.com/markdconnelly/ImperionCRM/commit/1b03e3a7d8921c7de5cc77975c4ed391c3593794))
* **tasks:** kanban C1-F4 remainder — assignee avatars + comment/attachment counts ([#608](https://github.com/markdconnelly/ImperionCRM/issues/608)) ([#711](https://github.com/markdconnelly/ImperionCRM/issues/711)) ([1f6e714](https://github.com/markdconnelly/ImperionCRM/commit/1f6e7146108953efd692ac56549db1ec2bbff41b))
* **tasks:** render + edit custom-field values on tasks/projects ([#614](https://github.com/markdconnelly/ImperionCRM/issues/614)) ([#715](https://github.com/markdconnelly/ImperionCRM/issues/715)) ([c09e568](https://github.com/markdconnelly/ImperionCRM/commit/c09e568983d80a8bd1256e761e7753d7d728c457))

## [0.12.0](https://github.com/markdconnelly/ImperionCRM/compare/imperion-crm-v0.11.0...imperion-crm-v0.12.0) (2026-06-16)


### Features

* **accounts:** DNS posture card + posture-page rows ([#309](https://github.com/markdconnelly/ImperionCRM/issues/309)) ([#578](https://github.com/markdconnelly/ImperionCRM/issues/578)) ([7fec296](https://github.com/markdconnelly/ImperionCRM/commit/7fec296368129cc1db8070ee5f9a6c5c8b8b9b91))
* **conversations:** conversation panel on 360 + timeline ([#379](https://github.com/markdconnelly/ImperionCRM/issues/379)) ([#682](https://github.com/markdconnelly/ImperionCRM/issues/682)) ([4b88b49](https://github.com/markdconnelly/ImperionCRM/commit/4b88b49696da7f8aa07cb79acff7f3762a1a3aff))
* **conversations:** conversational intelligence schema — conversation + segment + insight ([#375](https://github.com/markdconnelly/ImperionCRM/issues/375)) ([#640](https://github.com/markdconnelly/ImperionCRM/issues/640)) ([bec1ea4](https://github.com/markdconnelly/ImperionCRM/commit/bec1ea4c8a35051ef227f1acf53af6a5ff7ca5b6))
* **db:** account tracked-domains registry, DNS posture goes account-keyed ([#334](https://github.com/markdconnelly/ImperionCRM/issues/334)) ([#360](https://github.com/markdconnelly/ImperionCRM/issues/360)) ([ab8bb9f](https://github.com/markdconnelly/ImperionCRM/commit/ab8bb9fc3f151dceffb8965e150d52b57496eb6b))
* **db:** add migration 0088 expense config/comp layer ([#483](https://github.com/markdconnelly/ImperionCRM/issues/483)) ([#498](https://github.com/markdconnelly/ImperionCRM/issues/498)) ([404066c](https://github.com/markdconnelly/ImperionCRM/commit/404066c27e371bec70dcfbab673031d1659dc749))
* **db:** add migration 0089 expense capture + silver ([#484](https://github.com/markdconnelly/ImperionCRM/issues/484)) ([#499](https://github.com/markdconnelly/ImperionCRM/issues/499)) ([210dca4](https://github.com/markdconnelly/ImperionCRM/commit/210dca487bb278c02f11b11639ff0e5ed76d6b00))
* **db:** add migration 0090 expense autotask write-tracking + reconciliation ([#485](https://github.com/markdconnelly/ImperionCRM/issues/485)) ([#500](https://github.com/markdconnelly/ImperionCRM/issues/500)) ([90a2eaf](https://github.com/markdconnelly/ImperionCRM/commit/90a2eaf1b4232fc46f55eca1b990946941b9cfd6))
* **db:** add migration 0091 qbo_bill_payments bronze — time-tracking payment fact ([#519](https://github.com/markdconnelly/ImperionCRM/issues/519)) ([#521](https://github.com/markdconnelly/ImperionCRM/issues/521)) ([166ead8](https://github.com/markdconnelly/ImperionCRM/commit/166ead8c718543037cccd0da87d917cf8fb03e53))
* **db:** bronze-batch-A RMM + security-incident landing tables ([#674](https://github.com/markdconnelly/ImperionCRM/issues/674)) ([#675](https://github.com/markdconnelly/ImperionCRM/issues/675)) ([018bc7b](https://github.com/markdconnelly/ImperionCRM/commit/018bc7b79d52568a92e96c9613b44fb7e3fe90d8))
* **db:** bronze-batch-B — finance/logistics/interaction landing tables ([#688](https://github.com/markdconnelly/ImperionCRM/issues/688)) ([#689](https://github.com/markdconnelly/ImperionCRM/issues/689)) ([4b83709](https://github.com/markdconnelly/ImperionCRM/commit/4b83709cb3f099dcf9c20515079391a9b5d4b70c))
* **db:** chat_session + deflection telemetry schema ([#403](https://github.com/markdconnelly/ImperionCRM/issues/403)) ([#662](https://github.com/markdconnelly/ImperionCRM/issues/662)) ([19f535e](https://github.com/markdconnelly/ImperionCRM/commit/19f535e1119b2c40d03af50afecb2233e65409df))
* **db:** DNS posture bronze migration 0080 + account read ([#308](https://github.com/markdconnelly/ImperionCRM/issues/308)) ([#313](https://github.com/markdconnelly/ImperionCRM/issues/313)) ([ff6f9d9](https://github.com/markdconnelly/ImperionCRM/commit/ff6f9d942c4a8c109d53496691578d5cf0456f49))
* **db:** security-posture bronze drain — sensitivity labels, CSA, EasyDMARC ([#575](https://github.com/markdconnelly/ImperionCRM/issues/575), [#581](https://github.com/markdconnelly/ImperionCRM/issues/581)) ([#629](https://github.com/markdconnelly/ImperionCRM/issues/629)) ([1a59abf](https://github.com/markdconnelly/ImperionCRM/commit/1a59abf0f07e08ec1ed2096c23f299f391d5c18b))
* **db:** SLA breach read-model view over silver ticket ([#404](https://github.com/markdconnelly/ImperionCRM/issues/404)) ([#664](https://github.com/markdconnelly/ImperionCRM/issues/664)) ([06126e3](https://github.com/markdconnelly/ImperionCRM/commit/06126e380c22a98ec98ee221acac7da90ac38946))
* **delivery:** delivery board — provisioned projects + ticket-fire state & controls ([#568](https://github.com/markdconnelly/ImperionCRM/issues/568)) ([#570](https://github.com/markdconnelly/ImperionCRM/issues/570)) ([a2b6e26](https://github.com/markdconnelly/ImperionCRM/commit/a2b6e26f6d99eb884e95de56809928263475f4a1))
* **delivery:** delivery-template data layer ([#451](https://github.com/markdconnelly/ImperionCRM/issues/451)) ([#452](https://github.com/markdconnelly/ImperionCRM/issues/452)) ([1a18d9d](https://github.com/markdconnelly/ImperionCRM/commit/1a18d9dde2b234607d7a66064b457c61c49a7c59))
* **delivery:** delivery-template model + provisioning contract gate ([#449](https://github.com/markdconnelly/ImperionCRM/issues/449)) ([#450](https://github.com/markdconnelly/ImperionCRM/issues/450)) ([5faa3d9](https://github.com/markdconnelly/ImperionCRM/commit/5faa3d90e85b1c26ab82bfc546b3d95bc93060b1))
* **delivery:** instantiate a delivery template into the native intent plane ([#566](https://github.com/markdconnelly/ImperionCRM/issues/566)) ([#567](https://github.com/markdconnelly/ImperionCRM/issues/567)) ([4233104](https://github.com/markdconnelly/ImperionCRM/commit/423310457369f7666c4198f45a450674d7d4d777))
* **delivery:** template-manager GUI ([#453](https://github.com/markdconnelly/ImperionCRM/issues/453)) ([#454](https://github.com/markdconnelly/ImperionCRM/issues/454)) ([631ec86](https://github.com/markdconnelly/ImperionCRM/commit/631ec865104c07fdb50184b9645a6a0662169526))
* **dns:** record-level drift list on posture page ([#576](https://github.com/markdconnelly/ImperionCRM/issues/576)) ([#610](https://github.com/markdconnelly/ImperionCRM/issues/610)) ([554928d](https://github.com/markdconnelly/ImperionCRM/commit/554928dcf9050365ab64a266ada9b7f6b1166bdb))
* **esign:** esign_envelope schema + proposal/contract status mirror ([#391](https://github.com/markdconnelly/ImperionCRM/issues/391)) ([#641](https://github.com/markdconnelly/ImperionCRM/issues/641)) ([f08677f](https://github.com/markdconnelly/ImperionCRM/commit/f08677fbe1e161401bf40ef374124096321d6ef1))
* **expense:** admin expense data layer — feed + lifecycle writes ([#550](https://github.com/markdconnelly/ImperionCRM/issues/550)) ([#551](https://github.com/markdconnelly/ImperionCRM/issues/551)) ([2d469e7](https://github.com/markdconnelly/ImperionCRM/commit/2d469e76a76a1f1db7b924de093b79039e953194))
* **expense:** admin inline correction of submitted reports, audited vs attest ([#488](https://github.com/markdconnelly/ImperionCRM/issues/488)) ([#569](https://github.com/markdconnelly/ImperionCRM/issues/569)) ([0cdb581](https://github.com/markdconnelly/ImperionCRM/commit/0cdb581c9317207d24974e4de24811ba5d6e21c4))
* **expense:** category-mapping admin console ([#489](https://github.com/markdconnelly/ImperionCRM/issues/489)) ([#555](https://github.com/markdconnelly/ImperionCRM/issues/555)) ([01a16f7](https://github.com/markdconnelly/ImperionCRM/commit/01a16f713135e83a5f4360c16808be340f63a783))
* **expense:** employee report-lifecycle data layer — CrmRepository + types ([#546](https://github.com/markdconnelly/ImperionCRM/issues/546)) ([#549](https://github.com/markdconnelly/ImperionCRM/issues/549)) ([f1895d1](https://github.com/markdconnelly/ImperionCRM/commit/f1895d18217c1c4eafd8839365d1307fbe0bb6aa))
* **expense:** item CRUD + reference/read-model data layer ([#486](https://github.com/markdconnelly/ImperionCRM/issues/486)) ([#554](https://github.com/markdconnelly/ImperionCRM/issues/554)) ([31f8a09](https://github.com/markdconnelly/ImperionCRM/commit/31f8a0987879582c5a505f010be4bb56f94e9eeb))
* **expense:** list-first employee expenses surface — monthly reports overview ([#547](https://github.com/markdconnelly/ImperionCRM/issues/547)) ([#552](https://github.com/markdconnelly/ImperionCRM/issues/552)) ([6d80299](https://github.com/markdconnelly/ImperionCRM/commit/6d80299190aee62af18dc89f317e7eb4c62ebc04))
* **expense:** mileage-rate + MileIQ identity-mapping admin ([#490](https://github.com/markdconnelly/ImperionCRM/issues/490)) ([#556](https://github.com/markdconnelly/ImperionCRM/issues/556)) ([079b2fc](https://github.com/markdconnelly/ImperionCRM/commit/079b2fc439ac58b1ce8206cb6eafcea9aff6053a))
* **expense:** re-target QBO payment fact BillPayment-&gt;Purchase for Simple Start ([#526](https://github.com/markdconnelly/ImperionCRM/issues/526)) ([#527](https://github.com/markdconnelly/ImperionCRM/issues/527)) ([412fec6](https://github.com/markdconnelly/ImperionCRM/commit/412fec6e2a22695c265fc23336f125612c937381))
* **expense:** unified admin expense lifecycle page ([#548](https://github.com/markdconnelly/ImperionCRM/issues/548)) ([#553](https://github.com/markdconnelly/ImperionCRM/issues/553)) ([b192e3f](https://github.com/markdconnelly/ImperionCRM/commit/b192e3fa827354769f9c8771d3a7d79476cd2496))
* **expense:** unified Monthly Close surface (time + expense) ([#491](https://github.com/markdconnelly/ImperionCRM/issues/491)) ([#559](https://github.com/markdconnelly/ImperionCRM/issues/559)) ([b8a45e2](https://github.com/markdconnelly/ImperionCRM/commit/b8a45e21f4cf08cec96530a4c315b398325b44b8))
* **forecast:** opportunity forecast fields + quota + forecast_snapshot schema ([#381](https://github.com/markdconnelly/ImperionCRM/issues/381)) ([#642](https://github.com/markdconnelly/ImperionCRM/issues/642)) ([eb4e8e1](https://github.com/markdconnelly/ImperionCRM/commit/eb4e8e17bcb994891c2263818ff8ca78431674b3))
* **journeys:** A/B split + winner selection ([#400](https://github.com/markdconnelly/ImperionCRM/issues/400)) ([#694](https://github.com/markdconnelly/ImperionCRM/issues/694)) ([cbe7075](https://github.com/markdconnelly/ImperionCRM/commit/cbe70757828b6bc30df8a922b54f4aab69583b6d))
* **marketing:** journey builder — steps, delays, branches ([#399](https://github.com/markdconnelly/ImperionCRM/issues/399)) ([#690](https://github.com/markdconnelly/ImperionCRM/issues/690)) ([51f520f](https://github.com/markdconnelly/ImperionCRM/commit/51f520fe42f73ac00d43e52641311ff5b6f17c20))
* **marketing:** journeys as a single object on the workflow engine ([#397](https://github.com/markdconnelly/ImperionCRM/issues/397)) ([#643](https://github.com/markdconnelly/ImperionCRM/issues/643)) ([48a0048](https://github.com/markdconnelly/ImperionCRM/commit/48a00480ccca67baf1c770cd4c377afb80d3614a))
* **marketing:** rule-based lead_score schema + read model + scoring engine ([#401](https://github.com/markdconnelly/ImperionCRM/issues/401)) ([#644](https://github.com/markdconnelly/ImperionCRM/issues/644)) ([b928557](https://github.com/markdconnelly/ImperionCRM/commit/b9285572dbcb75e2eaaa51427e4825bbc13aac0f))
* **posture:** surface sensitivity labels + custom security attributes ([#259](https://github.com/markdconnelly/ImperionCRM/issues/259)) ([#577](https://github.com/markdconnelly/ImperionCRM/issues/577)) ([635a88a](https://github.com/markdconnelly/ImperionCRM/commit/635a88ae31d79e8a31e5c6d4561dc7fd598338b5))
* **projects:** calendar view for tasks ([#342](https://github.com/markdconnelly/ImperionCRM/issues/342)) ([#582](https://github.com/markdconnelly/ImperionCRM/issues/582)) ([d41767f](https://github.com/markdconnelly/ImperionCRM/commit/d41767f4f77a9688323ed7f0d6c53b2003f958fc))
* **projects:** comments & activity feed on work objects ([#330](https://github.com/markdconnelly/ImperionCRM/issues/330)) ([#572](https://github.com/markdconnelly/ImperionCRM/issues/572)) ([5ffcde1](https://github.com/markdconnelly/ImperionCRM/commit/5ffcde127f267dc42578fd5ea27b91f7a3f87673))
* **projects:** editable project/task templates ([#352](https://github.com/markdconnelly/ImperionCRM/issues/352)) ([#632](https://github.com/markdconnelly/ImperionCRM/issues/632)) ([8d69386](https://github.com/markdconnelly/ImperionCRM/commit/8d6938637ec9680a424ba7e9322b36580cc29687))
* **projects:** goals/OKRs object with rollup ([#348](https://github.com/markdconnelly/ImperionCRM/issues/348)) ([#611](https://github.com/markdconnelly/ImperionCRM/issues/611)) ([c7e71bd](https://github.com/markdconnelly/ImperionCRM/commit/c7e71bdde0d0faf76787133252e386da68124060))
* **projects:** hours-based capacity for the workload view ([#591](https://github.com/markdconnelly/ImperionCRM/issues/591)) ([#620](https://github.com/markdconnelly/ImperionCRM/issues/620)) ([b001bc1](https://github.com/markdconnelly/ImperionCRM/commit/b001bc1556ade20c7e260b189704407a3aa555ec))
* **projects:** kanban board view ([#441](https://github.com/markdconnelly/ImperionCRM/issues/441)) ([#442](https://github.com/markdconnelly/ImperionCRM/issues/442)) ([bc2dad7](https://github.com/markdconnelly/ImperionCRM/commit/bc2dad73a3d27a29a3693897bdc05784eafb507d))
* **projects:** multi-view toggle + saved filters ([#344](https://github.com/markdconnelly/ImperionCRM/issues/344)) ([#584](https://github.com/markdconnelly/ImperionCRM/issues/584)) ([39442a9](https://github.com/markdconnelly/ImperionCRM/commit/39442a9c4e5efbd9857693002cd358ab540f7166))
* **projects:** project baselines / planned-vs-actual ([#351](https://github.com/markdconnelly/ImperionCRM/issues/351)) ([#631](https://github.com/markdconnelly/ImperionCRM/issues/631)) ([752483f](https://github.com/markdconnelly/ImperionCRM/commit/752483f246aa969475577f21c3deb89102a96436))
* **projects:** sprints / backlog container with carry-over ([#349](https://github.com/markdconnelly/ImperionCRM/issues/349)) ([#630](https://github.com/markdconnelly/ImperionCRM/issues/630)) ([4ffe921](https://github.com/markdconnelly/ImperionCRM/commit/4ffe9210498682a52748e450d1230e87d4d11811))
* **projects:** timeline / gantt view for project tasks ([#343](https://github.com/markdconnelly/ImperionCRM/issues/343)) ([#588](https://github.com/markdconnelly/ImperionCRM/issues/588)) ([d74425b](https://github.com/markdconnelly/ImperionCRM/commit/d74425bdd419b42a15ed7219cc00863b813004bc))
* **projects:** workload / capacity view ([#347](https://github.com/markdconnelly/ImperionCRM/issues/347)) ([#593](https://github.com/markdconnelly/ImperionCRM/issues/593)) ([4d32180](https://github.com/markdconnelly/ImperionCRM/commit/4d32180141725d52a1a3165bca89672c93bbb3e0))
* **proposals:** signature status + signed-doc link on proposal/contract ([#395](https://github.com/markdconnelly/ImperionCRM/issues/395)) ([#684](https://github.com/markdconnelly/ImperionCRM/issues/684)) ([4f36b3e](https://github.com/markdconnelly/ImperionCRM/commit/4f36b3e469fa270b9a8a42fe7ff981fbc232cc01))
* **reporting:** add Time Efficiency BI section — utilization + labor cost ([#467](https://github.com/markdconnelly/ImperionCRM/issues/467)) ([#516](https://github.com/markdconnelly/ImperionCRM/issues/516)) ([dda68db](https://github.com/markdconnelly/ImperionCRM/commit/dda68db06ad3d5eee08b700f56a940fb24405762))
* **reporting:** agile reporting — burndown / velocity ([#345](https://github.com/markdconnelly/ImperionCRM/issues/345)) ([#693](https://github.com/markdconnelly/ImperionCRM/issues/693)) ([afb8d50](https://github.com/markdconnelly/ImperionCRM/commit/afb8d508e2e5140ee29e4d3ffe5c76d76037de48))
* **reporting:** cross-project portfolio rollup ([#350](https://github.com/markdconnelly/ImperionCRM/issues/350)) ([#594](https://github.com/markdconnelly/ImperionCRM/issues/594)) ([bf92ceb](https://github.com/markdconnelly/ImperionCRM/commit/bf92ceb2811894a5812a19a4641b1fbd37b30c7e))
* **reporting:** forecast view — rollup, weighted, attainment vs quota ([#383](https://github.com/markdconnelly/ImperionCRM/issues/383)) ([#676](https://github.com/markdconnelly/ImperionCRM/issues/676)) ([494480b](https://github.com/markdconnelly/ImperionCRM/commit/494480b8407bd17940d939a6649847645103d6dd))
* **reporting:** forecast-accuracy trend on BI hub ([#384](https://github.com/markdconnelly/ImperionCRM/issues/384)) ([#685](https://github.com/markdconnelly/ImperionCRM/issues/685)) ([c782bac](https://github.com/markdconnelly/ImperionCRM/commit/c782bac85518827c331d82b890beb4d07c301076))
* **schema:** model opportunity as merged silver from 3 bronze sources ([#428](https://github.com/markdconnelly/ImperionCRM/issues/428)) ([#435](https://github.com/markdconnelly/ImperionCRM/issues/435)) ([50e11be](https://github.com/markdconnelly/ImperionCRM/commit/50e11be2e8be30b093f6d6b3b7cecc76110c6cd5))
* **schema:** sale→delivery orchestration tracking tables ([#433](https://github.com/markdconnelly/ImperionCRM/issues/433)) ([#434](https://github.com/markdconnelly/ImperionCRM/issues/434)) ([3a454ff](https://github.com/markdconnelly/ImperionCRM/commit/3a454ff43673703562933317f5e79d9bb34c7674))
* **service-desk:** live chat widget + agent console ([#407](https://github.com/markdconnelly/ImperionCRM/issues/407)) ([#673](https://github.com/markdconnelly/ImperionCRM/issues/673)) ([f18111c](https://github.com/markdconnelly/ImperionCRM/commit/f18111c8463d924a71c8187008c13a5574d51d03))
* **service-desk:** omnichannel inbound queue ([#408](https://github.com/markdconnelly/ImperionCRM/issues/408)) ([#670](https://github.com/markdconnelly/ImperionCRM/issues/670)) ([f4ee53e](https://github.com/markdconnelly/ImperionCRM/commit/f4ee53ec619491c4fccf268de7da71a00122373c))
* **service-desk:** SLA-breach accessor drives omnichannel queue priority ([#671](https://github.com/markdconnelly/ImperionCRM/issues/671)) ([#680](https://github.com/markdconnelly/ImperionCRM/issues/680)) ([d8e94f9](https://github.com/markdconnelly/ImperionCRM/commit/d8e94f9ce433fb6de96683948709caedc28dd8c5))
* **settings:** "Connect QuickBooks" OAuth button + qbo company provider ([#528](https://github.com/markdconnelly/ImperionCRM/issues/528)) ([#529](https://github.com/markdconnelly/ImperionCRM/issues/529)) ([7f57853](https://github.com/markdconnelly/ImperionCRM/commit/7f5785371da7ad6ade828d1228552871c835e7eb))
* **settings:** add meta company-credential provider ([#586](https://github.com/markdconnelly/ImperionCRM/issues/586)) ([#607](https://github.com/markdconnelly/ImperionCRM/issues/607)) ([01630f3](https://github.com/markdconnelly/ImperionCRM/commit/01630f33552f308e778806d48888a02f1c702bcc))
* **settings:** surface verbose QuickBooks connect errors ([#530](https://github.com/markdconnelly/ImperionCRM/issues/530)) ([#534](https://github.com/markdconnelly/ImperionCRM/issues/534)) ([2534c20](https://github.com/markdconnelly/ImperionCRM/commit/2534c20983356d3bd51bcf350ac001de89e82e09))
* **skills:** add imperion-code-review skill ([#456](https://github.com/markdconnelly/ImperionCRM/issues/456)) ([#457](https://github.com/markdconnelly/ImperionCRM/issues/457)) ([94a11c3](https://github.com/markdconnelly/ImperionCRM/commit/94a11c31ec16386eebf8fd512b95982a33af207b))
* **tasks:** [@mentions](https://github.com/mentions) in comments ([#331](https://github.com/markdconnelly/ImperionCRM/issues/331)) ([#583](https://github.com/markdconnelly/ImperionCRM/issues/583)) ([b4414d6](https://github.com/markdconnelly/ImperionCRM/commit/b4414d67fbf1c65ac73bc441d2b1ff8684dc04e1))
* **tasks/projects:** kanban group-by + shared board primitive ([#443](https://github.com/markdconnelly/ImperionCRM/issues/443)) ([#444](https://github.com/markdconnelly/ImperionCRM/issues/444)) ([2e80b0d](https://github.com/markdconnelly/ImperionCRM/commit/2e80b0d98bf917a2de80c5e2126195a0b4e7e762))
* **tasks/projects:** kanban per-column WIP limits ([#445](https://github.com/markdconnelly/ImperionCRM/issues/445)) ([#446](https://github.com/markdconnelly/ImperionCRM/issues/446)) ([25d01cf](https://github.com/markdconnelly/ImperionCRM/commit/25d01cfedf5bf2eba184381fc8f2b94d1837e467))
* **tasks/projects:** kanban swimlanes ([#447](https://github.com/markdconnelly/ImperionCRM/issues/447)) ([#448](https://github.com/markdconnelly/ImperionCRM/issues/448)) ([d171664](https://github.com/markdconnelly/ImperionCRM/commit/d17166498f99334ef92f214d0e0c0c1a5820c536))
* **tasks:** admin-definable custom fields on tasks/projects ([#338](https://github.com/markdconnelly/ImperionCRM/issues/338)) ([#612](https://github.com/markdconnelly/ImperionCRM/issues/612)) ([be376a3](https://github.com/markdconnelly/ImperionCRM/commit/be376a378bea0269791519ea5f07d6afcf454a6e))
* **tasks:** configurable statuses per project type ([#339](https://github.com/markdconnelly/ImperionCRM/issues/339)) ([#617](https://github.com/markdconnelly/ImperionCRM/issues/617)) ([2285c92](https://github.com/markdconnelly/ImperionCRM/commit/2285c92d495e3fd5a2827a9285eacb670feac7f3))
* **tasks:** drag-drop kanban board view ([#341](https://github.com/markdconnelly/ImperionCRM/issues/341)) ([#440](https://github.com/markdconnelly/ImperionCRM/issues/440)) ([d9d6415](https://github.com/markdconnelly/ImperionCRM/commit/d9d64153826ca58834ae03cbf6d0e9b975890180))
* **tasks:** emit task.status_changed activity event on kanban move ([#438](https://github.com/markdconnelly/ImperionCRM/issues/438)) ([#599](https://github.com/markdconnelly/ImperionCRM/issues/599)) ([c8a93a4](https://github.com/markdconnelly/ImperionCRM/commit/c8a93a474e25cade7ebd33e5f8103067557d2f41))
* **tasks:** file attachments on tasks/projects ([#333](https://github.com/markdconnelly/ImperionCRM/issues/333)) ([#595](https://github.com/markdconnelly/ImperionCRM/issues/595)) ([728b6e0](https://github.com/markdconnelly/ImperionCRM/commit/728b6e0ad00592fe98b21749c4a8ab7fac0f9932))
* **tasks:** form → task intake — staff-authenticated intake forms ([#354](https://github.com/markdconnelly/ImperionCRM/issues/354)) ([#637](https://github.com/markdconnelly/ImperionCRM/issues/637)) ([2a3f9c0](https://github.com/markdconnelly/ImperionCRM/commit/2a3f9c094d65c3327087284840fc920db0f72b0a))
* **tasks:** in-app notification bell + work-event dispatch ([#332](https://github.com/markdconnelly/ImperionCRM/issues/332)) ([#600](https://github.com/markdconnelly/ImperionCRM/issues/600)) ([f5f059e](https://github.com/markdconnelly/ImperionCRM/commit/f5f059e5af86d4351b1542720d8a4969eb5f4aaa))
* **tasks:** kanban rich cards — subtask progress, tags, owner ([#439](https://github.com/markdconnelly/ImperionCRM/issues/439)) ([#609](https://github.com/markdconnelly/ImperionCRM/issues/609)) ([6f17ddf](https://github.com/markdconnelly/ImperionCRM/commit/6f17ddf8d47f1fc81bf3270f704a3edda0e8e64a))
* **tasks:** multiple assignees & watchers ([#337](https://github.com/markdconnelly/ImperionCRM/issues/337)) ([#589](https://github.com/markdconnelly/ImperionCRM/issues/589)) ([94e74f0](https://github.com/markdconnelly/ImperionCRM/commit/94e74f0354e9652c4e07276b87dce97881e35a15))
* **tasks:** notification prefs UI + actor attribution on assignment ([#601](https://github.com/markdconnelly/ImperionCRM/issues/601)) ([#704](https://github.com/markdconnelly/ImperionCRM/issues/704)) ([d9a52d4](https://github.com/markdconnelly/ImperionCRM/commit/d9a52d44a7d76abab2811d049ec5a575392c794f))
* **tasks:** recurring tasks — series schedule + spawn-on-completion ([#353](https://github.com/markdconnelly/ImperionCRM/issues/353)) ([#635](https://github.com/markdconnelly/ImperionCRM/issues/635)) ([0c903fb](https://github.com/markdconnelly/ImperionCRM/commit/0c903fbee9a0d2178fa9e33a16f3107063c2531b))
* **tasks:** subtasks / task hierarchy ([#335](https://github.com/markdconnelly/ImperionCRM/issues/335)) ([#574](https://github.com/markdconnelly/ImperionCRM/issues/574)) ([f503a93](https://github.com/markdconnelly/ImperionCRM/commit/f503a9335d675d9349c9f06a6e2048124cfb3cca))
* **tasks:** tags / labels with a global vocabulary ([#340](https://github.com/markdconnelly/ImperionCRM/issues/340)) ([#579](https://github.com/markdconnelly/ImperionCRM/issues/579)) ([b8249ec](https://github.com/markdconnelly/ImperionCRM/commit/b8249ecac48e75a6af14520ca9ecdc4e79ded223))
* **tasks:** task dependencies (blocks / blocked-by) ([#336](https://github.com/markdconnelly/ImperionCRM/issues/336)) ([#587](https://github.com/markdconnelly/ImperionCRM/issues/587)) ([9c5ce58](https://github.com/markdconnelly/ImperionCRM/commit/9c5ce585881e23f8d487dff24eebd8c7d26de050))
* **tasks:** time tracking, estimates & start_at schema+surface ([#346](https://github.com/markdconnelly/ImperionCRM/issues/346), [#580](https://github.com/markdconnelly/ImperionCRM/issues/580)) ([#618](https://github.com/markdconnelly/ImperionCRM/issues/618)) ([2305ec2](https://github.com/markdconnelly/ImperionCRM/commit/2305ec298b5aeb9cb7b8f073f4129b5c66f6bbc7))
* **time-tracking:** admin timesheet approval GUI — queue + review + approve/reopen ([#465](https://github.com/markdconnelly/ImperionCRM/issues/465)) ([#478](https://github.com/markdconnelly/ImperionCRM/issues/478)) ([27cbddb](https://github.com/markdconnelly/ImperionCRM/commit/27cbddb1688900d6700cfd0d739e072785c571db))
* **time-tracking:** data layer for admin timesheet approval + Time Ticket request ([#475](https://github.com/markdconnelly/ImperionCRM/issues/475)) ([#476](https://github.com/markdconnelly/ImperionCRM/issues/476)) ([c5ef624](https://github.com/markdconnelly/ImperionCRM/commit/c5ef624f3482167915d8a587e6158811776831ac))
* **time-tracking:** data layer for weekly timesheet entry + attest ([#472](https://github.com/markdconnelly/ImperionCRM/issues/472)) ([#473](https://github.com/markdconnelly/ImperionCRM/issues/473)) ([bd207cc](https://github.com/markdconnelly/ImperionCRM/commit/bd207cc2fa63df70282237d1169355fd952e6d87))
* **time-tracking:** employee Autotask/QuickBooks mapping confirm UI ([#468](https://github.com/markdconnelly/ImperionCRM/issues/468)) ([#479](https://github.com/markdconnelly/ImperionCRM/issues/479)) ([27eed43](https://github.com/markdconnelly/ImperionCRM/commit/27eed432438ccebbc16ca2aa0299638378f54160))
* **time-tracking:** employee weekly timesheet entry + memory-jogger + attest ([#464](https://github.com/markdconnelly/ImperionCRM/issues/464)) ([#474](https://github.com/markdconnelly/ImperionCRM/issues/474)) ([db481e5](https://github.com/markdconnelly/ImperionCRM/commit/db481e51aa2e0ac9e23e6feaa069b002b8aaa3a6))
* **time-tracking:** employee_profile + effective-dated pay_rate schema ([#461](https://github.com/markdconnelly/ImperionCRM/issues/461)) ([#469](https://github.com/markdconnelly/ImperionCRM/issues/469)) ([3643160](https://github.com/markdconnelly/ImperionCRM/commit/3643160d3a2ac35902a9b7c0565bc2c144873aa0))
* **time-tracking:** list-first employee timesheets — weeks table + active/upcoming + lifecycle ledger ([#538](https://github.com/markdconnelly/ImperionCRM/issues/538)) ([#541](https://github.com/markdconnelly/ImperionCRM/issues/541)) ([9f56df2](https://github.com/markdconnelly/ImperionCRM/commit/9f56df2a9012fcf293fdb152d115a75695ccea52))
* **time-tracking:** payroll-approval (CFO) surface + Paid via QuickBooks match ([#466](https://github.com/markdconnelly/ImperionCRM/issues/466)) ([#517](https://github.com/markdconnelly/ImperionCRM/issues/517)) ([c1b5d1f](https://github.com/markdconnelly/ImperionCRM/commit/c1b5d1f0935f4476f8b21e14df102943b9230521))
* **time-tracking:** time_ticket write-tracking + reconciliation read model ([#463](https://github.com/markdconnelly/ImperionCRM/issues/463)) ([#471](https://github.com/markdconnelly/ImperionCRM/issues/471)) ([1b78707](https://github.com/markdconnelly/ImperionCRM/commit/1b787076b72d5545b3b0fa195407f33f6c4867bc))
* **time-tracking:** timesheet + attendance/allocation bronze + silver time_record ([#462](https://github.com/markdconnelly/ImperionCRM/issues/462)) ([#470](https://github.com/markdconnelly/ImperionCRM/issues/470)) ([77a35b8](https://github.com/markdconnelly/ImperionCRM/commit/77a35b8e3f878528049eb465472b5eb60928b902))
* **time-tracking:** unified admin timesheet feed + filter/sort helper ([#539](https://github.com/markdconnelly/ImperionCRM/issues/539), part 1) ([#542](https://github.com/markdconnelly/ImperionCRM/issues/542)) ([c16ff37](https://github.com/markdconnelly/ImperionCRM/commit/c16ff37210ebce317a2f0e83749713a1b02cbd05))
* **time-tracking:** unified admin timesheet lifecycle page — absorbs approvals + payroll ([#539](https://github.com/markdconnelly/ImperionCRM/issues/539), part 2) ([#543](https://github.com/markdconnelly/ImperionCRM/issues/543)) ([845e260](https://github.com/markdconnelly/ImperionCRM/commit/845e26035ad855bf1e53f1211d06ddd14b26ccbb))
* **timesheets:** admin inline correction of a submitted timesheet ([#477](https://github.com/markdconnelly/ImperionCRM/issues/477)) ([#520](https://github.com/markdconnelly/ImperionCRM/issues/520)) ([874e70f](https://github.com/markdconnelly/ImperionCRM/commit/874e70f0b995e44f749df313d4292791f9f03f55))
* **timesheets:** surface backend reconciliation deviations ([#502](https://github.com/markdconnelly/ImperionCRM/issues/502)) ([#504](https://github.com/markdconnelly/ImperionCRM/issues/504)) ([2fcb81c](https://github.com/markdconnelly/ImperionCRM/commit/2fcb81c9bc151f5d4971cc27989bfc1bf413bdae))


### Bug Fixes

* **data:** optional enrichment reads degrade to empty on schema lag ([#301](https://github.com/markdconnelly/ImperionCRM/issues/301)) ([#302](https://github.com/markdconnelly/ImperionCRM/issues/302)) ([8de82fb](https://github.com/markdconnelly/ImperionCRM/commit/8de82fb0b494868d6730b01a16d632bdb90cf48c))
* **db:** renumber task-time-tracking migration 0104 -&gt; 0105 ([#622](https://github.com/markdconnelly/ImperionCRM/issues/622)) ([#623](https://github.com/markdconnelly/ImperionCRM/issues/623)) ([2507917](https://github.com/markdconnelly/ImperionCRM/commit/2507917e77b0c0760da42560ba66f05f531a2710))
* **db:** resolve 0105 cascade collision — configurable-statuses to 0104 ([#625](https://github.com/markdconnelly/ImperionCRM/issues/625)) ([#626](https://github.com/markdconnelly/ImperionCRM/issues/626)) ([4f4c73a](https://github.com/markdconnelly/ImperionCRM/commit/4f4c73ac0829dbd8db192648376e3df98a5adf8a))
* **settings:** gate poll cadence to pollable providers only ([#531](https://github.com/markdconnelly/ImperionCRM/issues/531)) ([#565](https://github.com/markdconnelly/ImperionCRM/issues/565)) ([3d6fa68](https://github.com/markdconnelly/ImperionCRM/commit/3d6fa68a2b224dadace1af7fd16907e4dc71534b))
* **timesheets:** reset time_ticket write_state on reopen so recorrection re-writes ([#515](https://github.com/markdconnelly/ImperionCRM/issues/515)) ([#518](https://github.com/markdconnelly/ImperionCRM/issues/518)) ([a237e2e](https://github.com/markdconnelly/ImperionCRM/commit/a237e2e9a40b54831fd246dec8df33936f3b5cc6))

## [0.11.0](https://github.com/markdconnelly/ImperionCRM/compare/imperion-crm-v0.10.0...imperion-crm-v0.11.0) (2026-06-13)


### Features

* **dashboard:** cross-domain intelligence strip ([#292](https://github.com/markdconnelly/ImperionCRM/issues/292)) ([#299](https://github.com/markdconnelly/ImperionCRM/issues/299)) ([6171e5e](https://github.com/markdconnelly/ImperionCRM/commit/6171e5ed295200d8c8dfee029ea4884ec41cf174))
* **reporting:** security fleet BI-hub section ([#291](https://github.com/markdconnelly/ImperionCRM/issues/291)) ([#297](https://github.com/markdconnelly/ImperionCRM/issues/297)) ([f6da01a](https://github.com/markdconnelly/ImperionCRM/commit/f6da01ae3fdd3f2d74e98b6e19dfc1690a7f4edb))

## [0.10.0](https://github.com/markdconnelly/ImperionCRM/compare/imperion-crm-v0.9.0...imperion-crm-v0.10.0) (2026-06-13)


### Features

* **entra:** groups + membership bronze feeding the user object ([#257](https://github.com/markdconnelly/ImperionCRM/issues/257)) ([#295](https://github.com/markdconnelly/ImperionCRM/issues/295)) ([fd00582](https://github.com/markdconnelly/ImperionCRM/commit/fd00582f5ad3a8936c84100f9aa97446717e5841))
* **reporting:** marketing & social BI-hub section ([#294](https://github.com/markdconnelly/ImperionCRM/issues/294)) ([48b8b4d](https://github.com/markdconnelly/ImperionCRM/commit/48b8b4de41eb502af31f33e0b941be716d858c1f))
* **reporting:** service desk BI-hub section ([#290](https://github.com/markdconnelly/ImperionCRM/issues/290)) ([#296](https://github.com/markdconnelly/ImperionCRM/issues/296)) ([ee3d491](https://github.com/markdconnelly/ImperionCRM/commit/ee3d491a149fad449f48e90174f21c3f18a76960))
* **sharepoint:** site inventory bronze + drillable sites UI ([#255](https://github.com/markdconnelly/ImperionCRM/issues/255)) ([#286](https://github.com/markdconnelly/ImperionCRM/issues/286)) ([8a71e3a](https://github.com/markdconnelly/ImperionCRM/commit/8a71e3a28292e094abf0ffc44d51ee8ced40d76f))

## [0.9.0](https://github.com/markdconnelly/ImperionCRM/compare/imperion-crm-v0.8.0...imperion-crm-v0.9.0) (2026-06-13)


### Features

* **agents:** adopt ICM as the business-process automation framework ([#273](https://github.com/markdconnelly/ImperionCRM/issues/273)) ([#275](https://github.com/markdconnelly/ImperionCRM/issues/275)) ([d4932bd](https://github.com/markdconnelly/ImperionCRM/commit/d4932bd4e5e8b586784f5eedc5a0e955d35f9d40))
* **agents:** establish agent-skills canon as in-repo plugin marketplace ([#266](https://github.com/markdconnelly/ImperionCRM/issues/266)) ([#268](https://github.com/markdconnelly/ImperionCRM/issues/268)) ([00dfd58](https://github.com/markdconnelly/ImperionCRM/commit/00dfd584247e41f20beebc48f1cf984e404c0a8b))
* **agents:** ICM lead-response workspace - marketing/sales v1 definition ([#274](https://github.com/markdconnelly/ImperionCRM/issues/274)) ([#276](https://github.com/markdconnelly/ImperionCRM/issues/276)) ([5a40485](https://github.com/markdconnelly/ImperionCRM/commit/5a40485796ee50e629a4715a162bf9ebcc05e13d))
* **agents:** migrate three imperion domain skills into the skills plugin ([#267](https://github.com/markdconnelly/ImperionCRM/issues/267)) ([#271](https://github.com/markdconnelly/ImperionCRM/issues/271)) ([5816824](https://github.com/markdconnelly/ImperionCRM/commit/5816824775dfc99390b9dcfa63fa1f278c0303e3))
* **posture:** entra auth methods bronze + MFA coverage badge ([#258](https://github.com/markdconnelly/ImperionCRM/issues/258)) ([#264](https://github.com/markdconnelly/ImperionCRM/issues/264)) ([806502e](https://github.com/markdconnelly/ImperionCRM/commit/806502e990630738121f3fd9b8df6f4cb9a02312))
* **security:** defender incidents/alerts bronze + autotask linkage ([#256](https://github.com/markdconnelly/ImperionCRM/issues/256)) ([#262](https://github.com/markdconnelly/ImperionCRM/issues/262)) ([9cbb3d7](https://github.com/markdconnelly/ImperionCRM/commit/9cbb3d74cdc9b3ee4f692aadb883ffcba7d873cc))

## [0.8.0](https://github.com/markdconnelly/ImperionCRM/compare/imperion-crm-v0.7.0...imperion-crm-v0.8.0) (2026-06-12)


### Features

* **db:** Meta Business Manager bronze + social_metric silver + facebook_dm lead kind ([#253](https://github.com/markdconnelly/ImperionCRM/issues/253)) ([#254](https://github.com/markdconnelly/ImperionCRM/issues/254)) ([5c2424c](https://github.com/markdconnelly/ImperionCRM/commit/5c2424ca1fbad3792b6f7a62cf545d0ff63bcb77))
* **story:** public unauthenticated /story build-story page ([#248](https://github.com/markdconnelly/ImperionCRM/issues/248)) ([#249](https://github.com/markdconnelly/ImperionCRM/issues/249)) ([aae02f4](https://github.com/markdconnelly/ImperionCRM/commit/aae02f470bbaa5c6fc8dbc77fb672408a2f2d86f))

## [0.7.0](https://github.com/markdconnelly/ImperionCRM/compare/imperion-crm-v0.6.0...imperion-crm-v0.7.0) (2026-06-12)


### Features

* **agents:** per-process cost telemetry rollups on the AI Agents page ([#184](https://github.com/markdconnelly/ImperionCRM/issues/184)) ([#211](https://github.com/markdconnelly/ImperionCRM/issues/211)) ([49d573f](https://github.com/markdconnelly/ImperionCRM/commit/49d573fe6a9cd19a9a50912e8fb5f57784ba5b0c))
* **board:** deputy pause flow UI - awaiting_ciso approve/amend/resume ([#185](https://github.com/markdconnelly/ImperionCRM/issues/185)) ([#245](https://github.com/markdconnelly/ImperionCRM/issues/245)) ([b6e1cd8](https://github.com/markdconnelly/ImperionCRM/commit/b6e1cd831a0aa1362a79ec1b2bd2d04ebbde11d1))
* **campaigns:** campaign-send data layer + event picker on the campaign builder ([#237](https://github.com/markdconnelly/ImperionCRM/issues/237)) ([#240](https://github.com/markdconnelly/ImperionCRM/issues/240)) ([273bb77](https://github.com/markdconnelly/ImperionCRM/commit/273bb777551ad066cd8699c21611357b1a2ef0c2))
* **campaigns:** email/SMS composers + scheduling UI + sends on campaign detail ([#239](https://github.com/markdconnelly/ImperionCRM/issues/239)) ([#241](https://github.com/markdconnelly/ImperionCRM/issues/241)) ([51f195a](https://github.com/markdconnelly/ImperionCRM/commit/51f195affc35b4009b1dff7518b61463bb306ded))
* **campaigns:** FB ads builder - typed creative + audience picker ([#111](https://github.com/markdconnelly/ImperionCRM/issues/111)) ([#243](https://github.com/markdconnelly/ImperionCRM/issues/243)) ([ef0d199](https://github.com/markdconnelly/ImperionCRM/commit/ef0d199f726bdda71ff2d88e8656b531005f6aba))
* **comms:** real 1:1 sends from the composer via the backend ([#183](https://github.com/markdconnelly/ImperionCRM/issues/183)) ([#215](https://github.com/markdconnelly/ImperionCRM/issues/215)) ([48877e3](https://github.com/markdconnelly/ImperionCRM/commit/48877e38218e8d9d2ff9f9f560db53053854d10f))
* **db:** migration 0065 - M365 mail/Teams bronze tables ([#182](https://github.com/markdconnelly/ImperionCRM/issues/182)) ([#202](https://github.com/markdconnelly/ImperionCRM/issues/202)) ([488cb29](https://github.com/markdconnelly/ImperionCRM/commit/488cb298919b71e289e7cecdd0d28d2c4dd9e82a))
* **db:** migration 0066 - board_session awaiting_ciso status + paused_at ([#208](https://github.com/markdconnelly/ImperionCRM/issues/208)) ([#221](https://github.com/markdconnelly/ImperionCRM/issues/221)) ([c3ff865](https://github.com/markdconnelly/ImperionCRM/commit/c3ff865d5f200676ba029ab2485dfaa892fbf77d))
* **db:** migration 0068 - knowledge_object draft status + backend write grant ([#214](https://github.com/markdconnelly/ImperionCRM/issues/214)) ([#224](https://github.com/markdconnelly/ImperionCRM/issues/224)) ([be3f089](https://github.com/markdconnelly/ImperionCRM/commit/be3f089751503edb9473e633201b33c8078a1ed5))
* **db:** migration 0069 - intune_managed_devices bronze + grants ([#225](https://github.com/markdconnelly/ImperionCRM/issues/225)) ([#226](https://github.com/markdconnelly/ImperionCRM/issues/226)) ([ffd7026](https://github.com/markdconnelly/ImperionCRM/commit/ffd7026f48202753c4767477b6a6ee66fc0dc38d))
* **db:** migration 0070 - event + event_registration schema ([#228](https://github.com/markdconnelly/ImperionCRM/issues/228)) ([#231](https://github.com/markdconnelly/ImperionCRM/issues/231)) ([6aaac1c](https://github.com/markdconnelly/ImperionCRM/commit/6aaac1c7b3c5adcca19dcb2e91c56971f7165660))
* **db:** migration 0071 - campaign_send + sms/acs channels + executor grants ([#236](https://github.com/markdconnelly/ImperionCRM/issues/236)) ([#238](https://github.com/markdconnelly/ImperionCRM/issues/238)) ([9c046b0](https://github.com/markdconnelly/ImperionCRM/commit/9c046b0b2f2760bed484936bda13666e46a1d7bd))
* **devices:** per-device policy-applied indicator from Intune compliance ([#162](https://github.com/markdconnelly/ImperionCRM/issues/162)) ([#246](https://github.com/markdconnelly/ImperionCRM/issues/246)) ([cafce8e](https://github.com/markdconnelly/ImperionCRM/commit/cafce8e1c5b5d32e4b51a1f92a915cc23afcf676))
* **events:** events data layer + canManageCampaigns predicate ([#229](https://github.com/markdconnelly/ImperionCRM/issues/229)) ([#233](https://github.com/markdconnelly/ImperionCRM/issues/233)) ([34fec5f](https://github.com/markdconnelly/ImperionCRM/commit/34fec5f99f285359cee7ec34b79d009674064d06))
* **events:** events UI - list/detail + webinar/live-event builders ([#232](https://github.com/markdconnelly/ImperionCRM/issues/232)) ([#234](https://github.com/markdconnelly/ImperionCRM/issues/234)) ([837ab89](https://github.com/markdconnelly/ImperionCRM/commit/837ab893dea6b0628794f28b400c12fcfb1fb63e))
* **events:** registration hook + capture resolution + attendance ([#230](https://github.com/markdconnelly/ImperionCRM/issues/230)) ([#235](https://github.com/markdconnelly/ImperionCRM/issues/235)) ([73f02c3](https://github.com/markdconnelly/ImperionCRM/commit/73f02c3fb30324bce92a1676b6269c966db11248))
* **feedback:** file feedback to the app-dev queue, superseding the GitHub coupling ([#100](https://github.com/markdconnelly/ImperionCRM/issues/100)) ([#213](https://github.com/markdconnelly/ImperionCRM/issues/213)) ([caf778b](https://github.com/markdconnelly/ImperionCRM/commit/caf778bd4358d159e866516ca439ae4e6d4e9a80))
* **meetings:** meetings as first-class objects on sales and projects ([#97](https://github.com/markdconnelly/ImperionCRM/issues/97)) ([#209](https://github.com/markdconnelly/ImperionCRM/issues/209)) ([8a083fe](https://github.com/markdconnelly/ImperionCRM/commit/8a083fedecd2d4adcde780b1edaa6c6dfb1c23cc))
* **onboarding:** easy-mode deploy plumbing - linked project tasks close on completion ([#101](https://github.com/markdconnelly/ImperionCRM/issues/101)) ([#216](https://github.com/markdconnelly/ImperionCRM/issues/216)) ([1d7f16b](https://github.com/markdconnelly/ImperionCRM/commit/1d7f16bd5898e1d445d7d105f6b0a01fa52251b6))
* **posture:** business review creation triggers a posture snapshot; Snapshot-now button ([#168](https://github.com/markdconnelly/ImperionCRM/issues/168)) ([#218](https://github.com/markdconnelly/ImperionCRM/issues/218)) ([871c6a5](https://github.com/markdconnelly/ImperionCRM/commit/871c6a55368fb61cf0570ed7e9608984b2e98041))
* **sales:** sales activity page - the Sales Queue read model ([#96](https://github.com/markdconnelly/ImperionCRM/issues/96)) ([#204](https://github.com/markdconnelly/ImperionCRM/issues/204)) ([37e2d28](https://github.com/markdconnelly/ImperionCRM/commit/37e2d28cb4f56b8e23c224cf0b5542ac9328632f))
* **sbr:** business reviews file a ticket in the business-review queue ([#99](https://github.com/markdconnelly/ImperionCRM/issues/99)) ([#212](https://github.com/markdconnelly/ImperionCRM/issues/212)) ([ca3e7e2](https://github.com/markdconnelly/ImperionCRM/commit/ca3e7e28c06ff4a4ce9e6efe80bc0f28ffebda10))
* **tasks:** on-demand Autotask ticket push + ticket history on the task ([#98](https://github.com/markdconnelly/ImperionCRM/issues/98)) ([#222](https://github.com/markdconnelly/ImperionCRM/issues/222)) ([275ee4f](https://github.com/markdconnelly/ImperionCRM/commit/275ee4f9cc84bfa7187a3d99aff09a9ead9c04c7))
* **tickets:** finish shareable saved views - rename + set/clear default ([#92](https://github.com/markdconnelly/ImperionCRM/issues/92)) ([#220](https://github.com/markdconnelly/ImperionCRM/issues/220)) ([8a2af75](https://github.com/markdconnelly/ImperionCRM/commit/8a2af7565574acabe708d981b9aaf7431c57eb8a))
* **tickets:** queue filter on the ticket board + ticket.queue migration ([#219](https://github.com/markdconnelly/ImperionCRM/issues/219)) ([#247](https://github.com/markdconnelly/ImperionCRM/issues/247)) ([5b94441](https://github.com/markdconnelly/ImperionCRM/commit/5b944415bcbc572adef498c55f58248f6fa06f3f))
* **workflows:** auto-enroll campaign/event responders into workflows ([#112](https://github.com/markdconnelly/ImperionCRM/issues/112)) ([#244](https://github.com/markdconnelly/ImperionCRM/issues/244)) ([4d1c451](https://github.com/markdconnelly/ImperionCRM/commit/4d1c451c9972e6d3c83b5a963fa5206db813ca1d))


### Bug Fixes

* **db:** renumber duplicate migration 0066 to 0072 ([#223](https://github.com/markdconnelly/ImperionCRM/issues/223)) ([#242](https://github.com/markdconnelly/ImperionCRM/issues/242)) ([50e334f](https://github.com/markdconnelly/ImperionCRM/commit/50e334ff398d65ec440e27ac90bc343b51cd8bfe))

## [0.6.0](https://github.com/markdconnelly/ImperionCRM/compare/imperion-crm-v0.5.1...imperion-crm-v0.6.0) (2026-06-12)


### Features

* **db:** migration 0064 - posture snapshot tables read-only for the web role ([#167](https://github.com/markdconnelly/ImperionCRM/issues/167)) ([#200](https://github.com/markdconnelly/ImperionCRM/issues/200)) ([d788f68](https://github.com/markdconnelly/ImperionCRM/commit/d788f6843f557d3486b38df5703faa770a07ac8d))


### Bug Fixes

* **comms:** only link http(s) social profile URLs - untrusted schemes render as text ([#191](https://github.com/markdconnelly/ImperionCRM/issues/191)) ([#197](https://github.com/markdconnelly/ImperionCRM/issues/197)) ([d9085be](https://github.com/markdconnelly/ImperionCRM/commit/d9085be18fdf7b67f2ae1e6cab904513f6956d67))
* **data:** refuse mock fallback when a database is configured ([#193](https://github.com/markdconnelly/ImperionCRM/issues/193)) ([#199](https://github.com/markdconnelly/ImperionCRM/issues/199)) ([9de3d6f](https://github.com/markdconnelly/ImperionCRM/commit/9de3d6fa6023315a61fb006c50f4e0be9502480c))
* **gdap:** tenant pinning fails closed when callback omits tenant ([#192](https://github.com/markdconnelly/ImperionCRM/issues/192)) ([#195](https://github.com/markdconnelly/ImperionCRM/issues/195)) ([6b0f34d](https://github.com/markdconnelly/ImperionCRM/commit/6b0f34dce7fdb46ef9539c3360b001d434b681d2))
* **settings:** connectAction validates provider/scope allowlist and fails closed on unresolvable owner ([#194](https://github.com/markdconnelly/ImperionCRM/issues/194)) ([#198](https://github.com/markdconnelly/ImperionCRM/issues/198)) ([d9b6a01](https://github.com/markdconnelly/ImperionCRM/commit/d9b6a0188881bb382fa942b3302cb8673b9358e4))

## [0.5.1](https://github.com/markdconnelly/ImperionCRM/compare/imperion-crm-v0.5.0...imperion-crm-v0.5.1) (2026-06-11)


### Bug Fixes

* **settings:** open the credential form when no credential is actually stored ([#176](https://github.com/markdconnelly/ImperionCRM/issues/176)) ([#177](https://github.com/markdconnelly/ImperionCRM/issues/177)) ([1f70257](https://github.com/markdconnelly/ImperionCRM/commit/1f702578a5a04a494f58d75652aa0cf729bad11d))

## [0.5.0](https://github.com/markdconnelly/ImperionCRM/compare/imperion-crm-v0.4.0...imperion-crm-v0.5.0) (2026-06-11)


### Features

* **db:** migration 0063 - posture_snapshot + posture_snapshot_pillar ([#164](https://github.com/markdconnelly/ImperionCRM/issues/164)) ([#165](https://github.com/markdconnelly/ImperionCRM/issues/165)) ([c5bd706](https://github.com/markdconnelly/ImperionCRM/commit/c5bd7060050d136dd1c95c7b541a3deee29772f8))


### Bug Fixes

* **auth:** resolve group GUIDs arriving in the roles claim ([#169](https://github.com/markdconnelly/ImperionCRM/issues/169)) ([#170](https://github.com/markdconnelly/ImperionCRM/issues/170)) ([c0d5e7c](https://github.com/markdconnelly/ImperionCRM/commit/c0d5e7c04acfbc8304f143b0608955ccd015d819))
* **auth:** restore ADR-0045 fail-closed - revert interim fail-open ([#171](https://github.com/markdconnelly/ImperionCRM/issues/171)) ([#172](https://github.com/markdconnelly/ImperionCRM/issues/172)) ([56e6357](https://github.com/markdconnelly/ImperionCRM/commit/56e63577ca98322e533af597837eac57cc56e55c))
* **settings:** poll cadence no longer snaps back after save ([#91](https://github.com/markdconnelly/ImperionCRM/issues/91)) ([#173](https://github.com/markdconnelly/ImperionCRM/issues/173)) ([0cf68cb](https://github.com/markdconnelly/ImperionCRM/commit/0cf68cbacf74f31edaa744c578a593f9928176c8))

## [0.4.0](https://github.com/markdconnelly/ImperionCRM/compare/imperion-crm-v0.3.0...imperion-crm-v0.4.0) (2026-06-11)


### Features

* **accounts:** company at-a-glance Imperion Secure Score ([#94](https://github.com/markdconnelly/ImperionCRM/issues/94)) ([#163](https://github.com/markdconnelly/ImperionCRM/issues/163)) ([46c24ef](https://github.com/markdconnelly/ImperionCRM/commit/46c24ef286bf59e60718276006621a0c132716b6))
* **accounts:** per-customer security posture overview page ([#159](https://github.com/markdconnelly/ImperionCRM/issues/159)) ([#161](https://github.com/markdconnelly/ImperionCRM/issues/161)) ([1dc7d18](https://github.com/markdconnelly/ImperionCRM/commit/1dc7d1840fcefcf37c69f631cad8c7a82052266f))
* **accounts:** Refresh posture button - account-scoped pipeline refresh ([#155](https://github.com/markdconnelly/ImperionCRM/issues/155)) ([#156](https://github.com/markdconnelly/ImperionCRM/issues/156)) ([a9552fe](https://github.com/markdconnelly/ImperionCRM/commit/a9552feb1f5e700cc504babc71e21e4ab8ab1ed0))
* **data:** account-scoped posture read model ([#158](https://github.com/markdconnelly/ImperionCRM/issues/158)) ([#160](https://github.com/markdconnelly/ImperionCRM/issues/160)) ([ea42f23](https://github.com/markdconnelly/ImperionCRM/commit/ea42f23e86073f1b86b07d634421f53a737d154a))

## [0.3.0](https://github.com/markdconnelly/ImperionCRM/compare/imperion-crm-v0.2.0...imperion-crm-v0.3.0) (2026-06-11)


### Features

* **contracts:** show contract source on the Contracts page ([#146](https://github.com/markdconnelly/ImperionCRM/issues/146)) ([#148](https://github.com/markdconnelly/ImperionCRM/issues/148)) ([2a223f7](https://github.com/markdconnelly/ImperionCRM/commit/2a223f71693482d68b57cffe5f07be5003e5911b))
* **db:** account_tenant migration + tenant-mapping repo methods ([#149](https://github.com/markdconnelly/ImperionCRM/issues/149)) ([#152](https://github.com/markdconnelly/ImperionCRM/issues/152)) ([c05796c](https://github.com/markdconnelly/ImperionCRM/commit/c05796c63789accfb7d20ebd777af1b53bb224a3))
* **db:** posture_policy + tenant_posture silver migration ([#151](https://github.com/markdconnelly/ImperionCRM/issues/151)) ([#153](https://github.com/markdconnelly/ImperionCRM/issues/153)) ([144889a](https://github.com/markdconnelly/ImperionCRM/commit/144889a8c0e7e3c1a5201adef0826a652dab5401))
* **settings:** Tenant Mapping admin surface + unmapped-tenants list ([#150](https://github.com/markdconnelly/ImperionCRM/issues/150)) ([#154](https://github.com/markdconnelly/ImperionCRM/issues/154)) ([5399000](https://github.com/markdconnelly/ImperionCRM/commit/539900067f8a537a08e0c4a4dfd4e9909983200f))


### Bug Fixes

* **auth:** interim unconditional fail-open to admin on claimless token ([#140](https://github.com/markdconnelly/ImperionCRM/issues/140)) ([#141](https://github.com/markdconnelly/ImperionCRM/issues/141)) ([a631689](https://github.com/markdconnelly/ImperionCRM/commit/a63168909252e7be89115b55ab52c3ae418aa93e))

## [0.2.0](https://github.com/markdconnelly/ImperionCRM/compare/imperion-crm-v0.1.0...imperion-crm-v0.2.0) (2026-06-11)


### Features

* **board:** convene-time CISO position + advisor invitees ([#132](https://github.com/markdconnelly/ImperionCRM/issues/132)) ([#135](https://github.com/markdconnelly/ImperionCRM/issues/135)) ([debd8dc](https://github.com/markdconnelly/ImperionCRM/commit/debd8dcb934757f13a18b49bdbd472fa5a5c05c1))
* **board:** display the persisted board packet + CISO position on the session page ([#133](https://github.com/markdconnelly/ImperionCRM/issues/133)) ([#137](https://github.com/markdconnelly/ImperionCRM/issues/137)) ([d630e5a](https://github.com/markdconnelly/ImperionCRM/commit/d630e5aa4e7bdede0267a2bb4db236e20d3988f7))
* **board:** human-CISO ratify/overrule review UI + deputy/advisor labeling ([#134](https://github.com/markdconnelly/ImperionCRM/issues/134)) ([#138](https://github.com/markdconnelly/ImperionCRM/issues/138)) ([51396e9](https://github.com/markdconnelly/ImperionCRM/commit/51396e97624b514331bcfcb07ef4aac32fd7196c))
