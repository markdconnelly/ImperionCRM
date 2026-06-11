# Changelog

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
