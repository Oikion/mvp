import { describe, it, expect } from "vitest";
import { ACTION_MODULES, ACTION_DESCRIPTIONS } from "@/lib/permissions/action-permissions";

describe("Import permission actions", () => {
  it("should define import module with all 5 actions", () => {
    expect(ACTION_MODULES.import).toBeDefined();
    expect(ACTION_MODULES.import).toHaveLength(5);
    expect(ACTION_MODULES.import).toContain("import:create");
    expect(ACTION_MODULES.import).toContain("import:view_history");
    expect(ACTION_MODULES.import).toContain("import:delete_own");
    expect(ACTION_MODULES.import).toContain("import:delete_any");
    expect(ACTION_MODULES.import).toContain("import:hard_delete");
  });

  it("should have descriptions for all import actions", () => {
    expect(ACTION_DESCRIPTIONS["import:create"]).toBeDefined();
    expect(ACTION_DESCRIPTIONS["import:view_history"]).toBeDefined();
    expect(ACTION_DESCRIPTIONS["import:delete_own"]).toBeDefined();
    expect(ACTION_DESCRIPTIONS["import:delete_any"]).toBeDefined();
    expect(ACTION_DESCRIPTIONS["import:hard_delete"]).toBeDefined();
  });
});
