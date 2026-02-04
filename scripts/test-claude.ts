#!/usr/bin/env tsx
/**
 * Quick test to verify Claude integration is working
 * 
 * Usage: pnpm tsx scripts/test-claude.ts
 */

import { BaseAgent } from "@/lib/ai-agents";

async function testClaude() {
  console.log("🧪 Testing Claude Integration...\n");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
    console.log("💡 Make sure it's set in .env.local");
    process.exit(1);
  }

  console.log("✅ API Key found\n");

  try {
    // Create a simple test agent
    class TestAgent extends BaseAgent {
      protected async getSystemPrompt(): Promise<string> {
        return "You are a helpful test assistant. Keep responses brief and friendly.";
      }
    }

    const agent = new TestAgent({
      userId: "test_user",
      organizationId: "test_org",
      apiKey,
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
    });

    console.log("📤 Sending test message to Claude...");
    const response = await agent.processMessage(
      "Say hello and confirm you're Claude. Keep it to one sentence."
    );

    console.log("\n✅ Success! Claude Response:");
    console.log("─".repeat(50));
    console.log(response.content);
    console.log("─".repeat(50));
    console.log("\n📊 Token Usage:");
    console.log(`   Input: ${response.usage?.promptTokens || 0} tokens`);
    console.log(`   Output: ${response.usage?.completionTokens || 0} tokens`);

    if (response.toolCalls && response.toolCalls.length > 0) {
      console.log(`\n🔧 Tool Calls: ${response.toolCalls.length}`);
    }

    console.log("\n✨ Claude integration is working correctly!");
  } catch (error) {
    console.error("\n❌ Error testing Claude:");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testClaude().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
