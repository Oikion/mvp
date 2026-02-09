const deprecatedToolNames = [
  "draft_birthday_message",
  "draft_property_recommendation",
  "draft_message_response",
  "get_recent_conversations",
  "get_upcoming_birthdays",
] as const;

type DeprecatedToolName = (typeof deprecatedToolNames)[number];

const deprecatedToolSet = new Set<DeprecatedToolName>(deprecatedToolNames);

function isToolDeprecated(toolName: string): boolean {
  return deprecatedToolSet.has(toolName as DeprecatedToolName);
}

function getDeprecatedToolUpdates(): Array<{ name: DeprecatedToolName; isEnabled: false }> {
  return deprecatedToolNames.map((name) => ({ name, isEnabled: false }));
}

export { deprecatedToolNames, getDeprecatedToolUpdates, isToolDeprecated };
