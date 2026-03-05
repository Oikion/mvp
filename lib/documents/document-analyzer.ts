/**
 * Document Analyzer
 * 
 * AI-powered document analysis, summarization, and Q&A
 */

import OpenAI from "openai";
import { getOrgOpenAIKey, getOrgOpenAIModel } from "@/lib/org-settings";
import { getSystemSetting } from "@/lib/system-settings";
import { prepareDocumentContext, chunkText } from "./text-extractor";

export interface DocumentAnalysis {
  summary: string;
  keyPoints: string[];
  documentType: string;
  entities: {
    people: string[];
    organizations: string[];
    locations: string[];
    dates: string[];
    amounts: string[];
  };
  metadata: {
    wordCount: number;
    language: string;
  };
}

export interface ChatWithDocumentResult {
  answer: string;
  confidence: "high" | "medium" | "low";
  relevantExcerpts: string[];
}

/**
 * Analyze a document and extract key information
 */
export async function analyzeDocument(
  documentText: string,
  documentName: string,
  organizationId: string,
  analysisType: "summary" | "extraction" | "full" = "summary"
): Promise<DocumentAnalysis> {
  let apiKey = await getOrgOpenAIKey(organizationId);
  const modelName = await getOrgOpenAIModel(organizationId);

  if (!apiKey) {
    apiKey = await getSystemSetting("openai_api_key", "OPENAI_API_KEY");
  }

  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const openai = new OpenAI({ apiKey });

  // Prepare document text for context
  const contextText = prepareDocumentContext(documentText);
  const wordCount = documentText.split(/\s+/).length;

  const systemPrompt = `You are a document analysis assistant specializing in real estate documents.
Analyze the following document and provide structured insights.

Analysis type: ${analysisType}
${analysisType === "summary" ? "Focus on providing a concise summary." : ""}
${analysisType === "extraction" ? "Focus on extracting entities and key data points." : ""}
${analysisType === "full" ? "Provide comprehensive analysis including summary, key points, and entity extraction." : ""}

Return a JSON object with this structure:
{
  "summary": "2-3 sentence summary of the document",
  "keyPoints": ["key point 1", "key point 2", ...],
  "documentType": "contract/agreement/report/listing/correspondence/other",
  "entities": {
    "people": ["names mentioned"],
    "organizations": ["companies/agencies mentioned"],
    "locations": ["addresses/areas mentioned"],
    "dates": ["important dates"],
    "amounts": ["monetary amounts mentioned"]
  },
  "language": "detected language (el/en/other)"
}

Be thorough but concise. Focus on real estate relevant information.`;

  try {
    const completion = await openai.chat.completions.create({
      model: modelName || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Document: "${documentName}"\n\nContent:\n${contextText}` },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(content);

    return {
      summary: parsed.summary || "No summary available",
      keyPoints: parsed.keyPoints || [],
      documentType: parsed.documentType || "other",
      entities: {
        people: parsed.entities?.people || [],
        organizations: parsed.entities?.organizations || [],
        locations: parsed.entities?.locations || [],
        dates: parsed.entities?.dates || [],
        amounts: parsed.entities?.amounts || [],
      },
      metadata: {
        wordCount,
        language: parsed.language || "unknown",
      },
    };
  } catch (error) {
    console.error("Error analyzing document:", error);
    throw error;
  }
}

/**
 * Answer questions about a document
 */
export async function chatWithDocument(
  documentText: string,
  documentName: string,
  question: string,
  organizationId: string,
  previousContext?: string
): Promise<ChatWithDocumentResult> {
  let apiKey = await getOrgOpenAIKey(organizationId);
  const modelName = await getOrgOpenAIModel(organizationId);

  if (!apiKey) {
    apiKey = await getSystemSetting("openai_api_key", "OPENAI_API_KEY");
  }

  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const openai = new OpenAI({ apiKey });

  // Prepare document text
  const contextText = prepareDocumentContext(documentText);

  const systemPrompt = `You are a helpful assistant answering questions about a document.
Your answers should be based ONLY on the document content provided.
If the answer is not in the document, say so clearly.

Document name: ${documentName}

Return a JSON response:
{
  "answer": "your answer to the question",
  "confidence": "high/medium/low (based on how clearly the document addresses the question)",
  "relevantExcerpts": ["relevant text from document that supports your answer"]
}

Be accurate and cite specific parts of the document when possible.`;

  try {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Document content:\n${contextText}` },
    ];

    if (previousContext) {
      messages.push({
        role: "assistant",
        content: `Previous conversation context: ${previousContext}`,
      });
    }

    messages.push({ role: "user", content: `Question: ${question}` });

    const completion = await openai.chat.completions.create({
      model: modelName || "gpt-4o-mini",
      messages,
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(content);

    return {
      answer: parsed.answer || "Unable to answer the question.",
      confidence: parsed.confidence || "low",
      relevantExcerpts: parsed.relevantExcerpts || [],
    };
  } catch (error) {
    console.error("Error chatting with document:", error);
    throw error;
  }
}

/**
 * Generate a document summary suitable for context in other operations
 */
export async function generateQuickSummary(
  documentText: string,
  organizationId: string
): Promise<string> {
  let apiKey = await getOrgOpenAIKey(organizationId);
  const modelName = await getOrgOpenAIModel(organizationId);

  if (!apiKey) {
    apiKey = await getSystemSetting("openai_api_key", "OPENAI_API_KEY");
  }

  if (!apiKey) {
    // Fallback to first N characters if no API key
    return documentText.substring(0, 500) + "...";
  }

  const openai = new OpenAI({ apiKey });

  const contextText = prepareDocumentContext(documentText, 4000);

  try {
    const completion = await openai.chat.completions.create({
      model: modelName || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Summarize this document in 2-3 sentences. Focus on the main purpose and key information.",
        },
        { role: "user", content: contextText },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    return completion.choices[0]?.message?.content || "No summary available.";
  } catch (error) {
    console.error("Error generating quick summary:", error);
    return documentText.substring(0, 500) + "...";
  }
}
