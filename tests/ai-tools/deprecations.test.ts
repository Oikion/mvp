import { describe, expect, it } from "vitest";

import {
  deprecatedToolNames,
  getDeprecatedToolUpdates,
  isToolDeprecated,
} from "@/lib/ai-tools/deprecations";

describe("ai-tools deprecations", () => {
  it("lists all deprecated tool names", () => {
    expect(deprecatedToolNames).toEqual(
      expect.arrayContaining([
        "draft_birthday_message",
        "draft_property_recommendation",
        "draft_message_response",
        "get_recent_conversations",
        "get_upcoming_birthdays",
      ])
    );
  });

  it("flags deprecated tools by name", () => {
    expect(isToolDeprecated("draft_message_response")).toBe(true);
    expect(isToolDeprecated("send_message")).toBe(false);
  });

  it("builds update payloads for deprecated tools", () => {
    const updates = getDeprecatedToolUpdates();
    expect(updates).toEqual(
      expect.arrayContaining([
        { name: "draft_birthday_message", isEnabled: false },
        { name: "get_upcoming_birthdays", isEnabled: false },
      ])
    );
  });
});
