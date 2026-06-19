import { describe, it, expect } from "vitest";
import {
  stripSqlComments,
  migrationTouchesEntity,
  evaluateGate,
  evaluateSkillRule,
  CONCEPTS_DIR,
  SOURCE_SKILL_CONCEPT,
  ESCAPE_HATCH_LABEL,
} from "./semantic-layer-gate.mjs";

const skillManifest = (name) => `plugins/imperion-skills/skills/${name}/SKILL.md`;

// The concept-bearing silver entities the gate guards (subset used in fixtures).
const ENTITIES = ["expense_item", "expense_report", "time_record", "timesheet"];

const concept = (e) => `${CONCEPTS_DIR}/${e}.md`;

describe("stripSqlComments", () => {
  it("removes line and block comments so prose never triggers a match", () => {
    const sql = `-- CREATE TABLE expense_item example in a comment\n/* CREATE TABLE time_record */\nSELECT 1;`;
    const out = stripSqlComments(sql);
    expect(migrationTouchesEntity(out, "expense_item")).toBe(false);
    expect(migrationTouchesEntity(out, "time_record")).toBe(false);
  });
});

describe("migrationTouchesEntity", () => {
  it("matches CREATE TABLE on the exact silver entity", () => {
    expect(migrationTouchesEntity("CREATE TABLE expense_item (id uuid);", "expense_item")).toBe(true);
  });
  it("matches CREATE TABLE IF NOT EXISTS", () => {
    expect(migrationTouchesEntity("create table if not exists time_record (x int);", "time_record")).toBe(true);
  });
  it("matches ALTER TABLE and DROP TABLE", () => {
    expect(migrationTouchesEntity("ALTER TABLE timesheet ADD COLUMN x int;", "timesheet")).toBe(true);
    expect(migrationTouchesEntity("DROP TABLE IF EXISTS expense_report;", "expense_report")).toBe(true);
  });
  it("matches CREATE OR REPLACE VIEW and MATERIALIZED VIEW", () => {
    expect(migrationTouchesEntity("CREATE OR REPLACE VIEW time_record AS SELECT 1;", "time_record")).toBe(true);
    expect(migrationTouchesEntity("create materialized view timesheet as select 1;", "timesheet")).toBe(true);
  });
  it("does NOT match a bronze feed that ends with the entity name", () => {
    expect(migrationTouchesEntity("CREATE TABLE website_expense_item (id uuid);", "expense_item")).toBe(false);
  });
  it("does NOT match a view/derived table that prefixes the entity name", () => {
    expect(migrationTouchesEntity("CREATE VIEW expense_item_all AS SELECT 1;", "expense_item")).toBe(false);
  });
  it("does NOT match a mere foreign-key reference to the entity", () => {
    const sql = "CREATE TABLE receipt_attachment (item_id uuid REFERENCES expense_item(id));";
    expect(migrationTouchesEntity(sql, "expense_item")).toBe(false);
  });
});

describe("evaluateGate", () => {
  const base = { conceptEntities: ENTITIES, hasEscapeHatch: false };

  it("passes when no migration is in the change set", () => {
    const r = evaluateGate({ ...base, changedFiles: ["src/app/page.tsx"], migrationSql: {} });
    expect(r.ok).toBe(true);
    expect(r.touched).toEqual([]);
  });

  it("passes when a silver migration ships with its concept file", () => {
    const mig = "db/migrations/0099_expense_tweak.sql";
    const r = evaluateGate({
      ...base,
      changedFiles: [mig, concept("expense_item")],
      migrationSql: { [mig]: "ALTER TABLE expense_item ADD COLUMN note text;" },
    });
    expect(r.ok).toBe(true);
    expect(r.touched).toEqual(["expense_item"]);
  });

  it("FAILS when a silver migration forgets its concept file", () => {
    const mig = "db/migrations/0099_expense_tweak.sql";
    const r = evaluateGate({
      ...base,
      changedFiles: [mig],
      migrationSql: { [mig]: "ALTER TABLE expense_item ADD COLUMN note text;" },
    });
    expect(r.ok).toBe(false);
    expect(r.missing).toEqual([{ entity: "expense_item", file: concept("expense_item") }]);
    expect(r.message).toContain("expense_item");
    expect(r.message).toContain(ESCAPE_HATCH_LABEL);
  });

  it("flags every touched entity independently across multiple migrations", () => {
    const m1 = "db/migrations/0099_a.sql";
    const m2 = "db/migrations/0100_b.sql";
    const r = evaluateGate({
      ...base,
      changedFiles: [m1, m2, concept("time_record")], // only one of two synced
      migrationSql: {
        [m1]: "CREATE TABLE time_record (id uuid);",
        [m2]: "ALTER TABLE timesheet ADD COLUMN x int;",
      },
    });
    expect(r.ok).toBe(false);
    expect(r.touched).toEqual(["time_record", "timesheet"]);
    expect(r.missing).toEqual([{ entity: "timesheet", file: concept("timesheet") }]);
  });

  it("the escape-hatch label turns a failure into a pass", () => {
    const mig = "db/migrations/0099_expense_tweak.sql";
    const r = evaluateGate({
      ...base,
      hasEscapeHatch: true,
      changedFiles: [mig],
      migrationSql: { [mig]: "ALTER TABLE expense_item ADD COLUMN note text;" },
    });
    expect(r.ok).toBe(true);
    expect(r.message).toContain(ESCAPE_HATCH_LABEL);
  });

  it("ignores bronze-only migrations (no concept-bearing silver entity touched)", () => {
    const mig = "db/migrations/0099_meta_bronze.sql";
    const r = evaluateGate({
      ...base,
      changedFiles: [mig],
      migrationSql: { [mig]: "CREATE TABLE meta_insights (id uuid);" },
    });
    expect(r.ok).toBe(true);
    expect(r.touched).toEqual([]);
  });
});

describe("evaluateSkillRule (ADR-0104 skill-pointer rule)", () => {
  it("passes when no skill was removed", () => {
    const r = evaluateSkillRule({
      removedFiles: ["src/foo.ts"],
      changedFiles: ["src/foo.ts"],
      hasEscapeHatch: false,
    });
    expect(r.ok).toBe(true);
    expect(r.removedSkills).toEqual([]);
  });

  it("passes when a skill is only edited (manifest still present, not deleted)", () => {
    const r = evaluateSkillRule({
      removedFiles: [],
      changedFiles: [skillManifest("imperion-msp-sources")],
      hasEscapeHatch: false,
    });
    expect(r.ok).toBe(true);
    expect(r.removedSkills).toEqual([]);
  });

  it("fails when a skill manifest is removed and source_skill is not touched", () => {
    const r = evaluateSkillRule({
      removedFiles: [skillManifest("imperion-msp-sources")],
      changedFiles: [skillManifest("imperion-msp-sources")],
      hasEscapeHatch: false,
    });
    expect(r.ok).toBe(false);
    expect(r.removedSkills).toEqual(["imperion-msp-sources"]);
    expect(r.message).toContain(SOURCE_SKILL_CONCEPT);
  });

  it("passes when a removed skill is accompanied by a source_skill update", () => {
    const r = evaluateSkillRule({
      removedFiles: [skillManifest("imperion-msp-sources")],
      changedFiles: [skillManifest("imperion-msp-sources"), SOURCE_SKILL_CONCEPT],
      hasEscapeHatch: false,
    });
    expect(r.ok).toBe(true);
  });

  it("passes a removed skill under the escape hatch", () => {
    const r = evaluateSkillRule({
      removedFiles: [skillManifest("foo")],
      changedFiles: [],
      hasEscapeHatch: true,
    });
    expect(r.ok).toBe(true);
    expect(r.message).toContain(ESCAPE_HATCH_LABEL);
  });
});
