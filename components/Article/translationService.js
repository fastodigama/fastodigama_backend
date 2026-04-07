import axios from "axios";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

const cleanString = (value = "") => String(value || "").trim();

const normalizeFaqs = (faqs = []) =>
  Array.isArray(faqs)
    ? faqs.map((faq) => ({
        question: cleanString(faq?.question),
        answer: cleanString(faq?.answer)
      }))
    : [];

const normalizeSources = (sources = []) =>
  Array.isArray(sources)
    ? sources.map((source) => ({
        title: cleanString(source?.title),
        url: cleanString(source?.url)
      }))
    : [];

const normalizeImageAlts = (imageAlts = []) =>
  Array.isArray(imageAlts)
    ? imageAlts.map((imageAlt) => ({
        key: cleanString(imageAlt?.key),
        alt: cleanString(imageAlt?.alt)
      }))
    : [];

const stripCodeFence = (value = "") =>
  String(value)
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

function buildTranslationPrompt(article) {
  const imageAlts = Array.isArray(article.images)
    ? article.images.map((image) => ({
        key: cleanString(image?.key),
        alt: cleanString(image?.alt || article.title)
      }))
    : [];

  return {
    title: cleanString(article.title),
    text: String(article.text || ""),
    faqs: normalizeFaqs(article.faqs),
    sources: normalizeSources(article.sources),
    imageAlts
  };
}

export function isArabicTranslationConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function translateArticleToArabic(article) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to generate Arabic article translations.");
  }

  const translationModel = process.env.OPENAI_TRANSLATION_MODEL || "gpt-4.1-mini";
  const sourcePayload = buildTranslationPrompt(article);

  const response = await axios.post(
    OPENAI_API_URL,
    {
      model: translationModel,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You translate article content from English into natural Modern Standard Arabic. Preserve markdown, HTML, URLs, and overall meaning. Return only valid JSON."
        },
        {
          role: "user",
          content: JSON.stringify({
            instruction:
              "Translate the following article fields into Arabic. Also create an Arabic SEO slug from the translated title. Keep URLs unchanged. Return the exact JSON shape: { slug, title, text, faqs, sources, imageAlts }.",
            article: sourcePayload
          })
        }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      timeout: 60000
    }
  );

  const rawContent =
    response.data?.choices?.[0]?.message?.content ||
    response.data?.choices?.[0]?.text ||
    "";
  const parsed = JSON.parse(stripCodeFence(rawContent));

  return {
    slug: cleanString(parsed?.slug),
    title: cleanString(parsed?.title) || sourcePayload.title,
    text: String(parsed?.text || sourcePayload.text),
    faqs: normalizeFaqs(parsed?.faqs),
    sources: normalizeSources(parsed?.sources).map((source, index) => ({
      title: source.title,
      url: source.url || sourcePayload.sources[index]?.url || ""
    })),
    imageAlts: normalizeImageAlts(parsed?.imageAlts),
    translatedAt: new Date(),
    model: translationModel
  };
}
