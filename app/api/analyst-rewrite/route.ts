import { NextResponse } from "next/server";
import { buildRewritePrompt, heuristicRewrite, parseAnalystInput } from "@/lib/analyst-cleaner";

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = typeof body?.input === "string" ? body.input.trim() : "";

    if (!input) {
      return NextResponse.json({ error: "Input is required." }, { status: 400 });
    }

    const messages = parseAnalystInput(input);

    if (!process.env.OPENAI_API_KEY) {
      const fallback = heuristicRewrite(input);

      return NextResponse.json({
        cleanedText: fallback.cleanedText,
        cleanedMessages: fallback.cleanedMessages,
        scoredLines: fallback.scoredLines,
        engine: "heuristic",
        parsedMessages: fallback.parsedMessages
      });
    }

    const aiResult = await rewriteWithOpenAI(messages.length > 0 ? messages : [{ text: input }]);

    return NextResponse.json({
      cleanedText: aiResult.cleanedText,
      engine: "openai",
      parsedMessages: messages.length || 1,
      model: DEFAULT_MODEL
    });
  } catch (error) {
    const fallbackMessage = error instanceof Error ? error.message : "Rewrite failed.";

    return NextResponse.json(
      {
        error: fallbackMessage
      },
      { status: 500 }
    );
  }
}

async function rewriteWithOpenAI(
  messages: Array<{
    text: string;
  }>
) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      input: buildRewritePrompt(messages)
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI rewrite failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const cleanedText = extractOutputText(payload);

  if (!cleanedText) {
    throw new Error("OpenAI rewrite returned an empty response.");
  }

  return { cleanedText };
}

function extractOutputText(payload: unknown) {
  if (payload && typeof payload === "object" && "output_text" in payload && typeof payload.output_text === "string") {
    return payload.output_text.trim();
  }

  if (!payload || typeof payload !== "object" || !("output" in payload) || !Array.isArray(payload.output)) {
    return "";
  }

  return payload.output
    .flatMap((item) => {
      if (!item || typeof item !== "object" || !("content" in item) || !Array.isArray(item.content)) {
        return [];
      }

      return item.content;
    })
    .map((content) => {
      if (!content || typeof content !== "object") {
        return "";
      }

      if ("text" in content && typeof content.text === "string") {
        return content.text;
      }

      return "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}
