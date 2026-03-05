import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { getOrgOpenAIKey, getOrgTTSVoice } from "@/lib/org-settings";
import { getSystemSetting } from "@/lib/system-settings";

// Valid voices for OpenAI TTS
const VALID_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type Voice = (typeof VALID_VOICES)[number];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice, speed = 1 } = body;

    // Validate input
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    if (text.length > 4096) {
      return NextResponse.json(
        { error: "Text too long. Maximum 4096 characters." },
        { status: 400 }
      );
    }

    // Get organization ID for org-specific settings
    const organizationId = await getCurrentOrgIdSafe();

    // Get org-specific TTS voice if not provided
    let selectedVoice: Voice = "nova";
    if (voice && VALID_VOICES.includes(voice)) {
      selectedVoice = voice;
    } else if (organizationId) {
      const orgVoice = await getOrgTTSVoice(organizationId);
      if (VALID_VOICES.includes(orgVoice as Voice)) {
        selectedVoice = orgVoice as Voice;
      }
    }

    // Validate speed (0.25 to 4.0)
    const selectedSpeed = Math.max(0.25, Math.min(4, Number(speed) || 1));

    // Get OpenAI API key (org-specific > system settings > environment variable)
    let apiKey: string | null = null;

    if (organizationId) {
      apiKey = await getOrgOpenAIKey(organizationId);
    }

    // Fallback to system/env if no org key
    if (!apiKey) {
      apiKey = await getSystemSetting("openai_api_key", "OPENAI_API_KEY");
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // Generate speech using OpenAI TTS
    const mp3Response = await openai.audio.speech.create({
      model: "tts-1", // Use tts-1 for lower latency, tts-1-hd for higher quality
      voice: selectedVoice,
      input: text,
      speed: selectedSpeed,
      response_format: "mp3",
    });

    // Get the audio buffer
    const audioBuffer = Buffer.from(await mp3Response.arrayBuffer());

    // Return the audio file
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("TTS error:", error);

    if (error?.status === 401) {
      return NextResponse.json(
        { error: "Invalid OpenAI API key" },
        { status: 401 }
      );
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to generate speech" },
      { status: 500 }
    );
  }
}
