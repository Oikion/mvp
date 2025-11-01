import { openAiHelper } from "@/lib/openai";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { getCurrentUser } from "@/lib/get-current-user";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const openai = await openAiHelper(user.id);

    if (!openai) {
      return new Response("No openai key found", { status: 500 });
    }

    const { prompt } = await req.json();

    const response = await openai.completions.create({
      model: "gpt-3.5-turbo-instruct",
      max_tokens: 2000,
      stream: true,
      prompt,
    });

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);
  } catch (error) {
    return new Response("Unauthorized", { status: 401 });
  }
}
