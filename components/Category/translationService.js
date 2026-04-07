import axios from "axios";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

const cleanString = (value = "") => String(value || "").trim();

export function isArabicCategoryTranslationConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function translateCategoryToArabic(categoryName) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to generate Arabic category translations.");
  }

  const model = process.env.OPENAI_TRANSLATION_MODEL || "gpt-4.1-mini";
  const response = await axios.post(
    OPENAI_API_URL,
    {
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Translate English website category names into concise natural Arabic and generate an Arabic URL slug. Return only valid JSON."
        },
        {
          role: "user",
          content: JSON.stringify({
            instruction: "Return JSON with exact shape: { name, slug }",
            category: cleanString(categoryName)
          })
        }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      timeout: 30000
    }
  );

  const raw = String(response.data?.choices?.[0]?.message?.content || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const parsed = JSON.parse(raw);

  return {
    name: cleanString(parsed?.name),
    slug: cleanString(parsed?.slug),
    model
  };
}
