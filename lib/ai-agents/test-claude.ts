/**
 * Quick test script to verify Claude integration
 * 
 * Run with: npx tsx lib/ai-agents/test-claude.ts
 */

import { BaseAgent } from "./base-agent";
import { getOrgAgentConfig } from "@/lib/org-settings";

async function testClaude() {
  console.log("🧪 Testing Claude Integration...\n");

  // Test 1: Direct Claude configuration
  console.log("Test 1: Direct Claude Configuration");
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("❌ ANTHROPIC_API_KEY not found in environment");
      return;
    }

    const agent = new BaseAgent({
      userId: "test_user",
      organizationId: "test_org",
      apiKey,
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
    });

    // Override getSystemPrompt for testing
    (agent as any).getSystemPrompt = async () => {
      return "You are a helpful test assistant. Respond briefly.";
    };

    const response = await agent.processMessage("Say hello in one sentence.");

    console.log("✅ Claude Response:", response.content);
    console.log("📊 Tokens:", response.usage);
    console.log("");
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    console.log("");
  }

  // Test 2: Verify tool format conversion
  console.log("Test 2: Tool Format Conversion");
  try {
    const { toolsToClaudeFormat } = await import("@/lib/ai-tools");
    const { getEnabledTools } = await import("@/lib/ai-tools");

    const tools = await getEnabledTools();
    const claudeTools = toolsToClaudeFormat(tools.slice(0, 2)); // Test with first 2 tools

    console.log(`✅ Converted ${tools.length} tools to Claude format`);
    console.log(`📋 Sample tool:`, claudeTools[0]?.name || "No tools available");
    console.log("");
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    console.log("");
  }

  console.log("✨ Test complete!");
}

// Run if executed directly
if (require.main === module) {
  testClaude().catch(console.error);
}

export { testClaude };
