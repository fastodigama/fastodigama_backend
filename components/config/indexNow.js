import axios from "axios";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const DEFAULT_SITE_URL = "https://fastodigama.com";
const MAX_RETRIES = 3;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

const normalizeSiteUrl = (value = "") =>
  String(value || DEFAULT_SITE_URL).trim().replace(/\/+$/, "");

const getIndexNowConfig = () => {
  const siteUrl = normalizeSiteUrl(process.env.SITE_URL || process.env.FRONTEND_URL);
  const key = String(process.env.INDEXNOW_KEY || "").trim();

  if (!siteUrl || !key) {
    return null;
  }

  return {
    siteUrl,
    host: new URL(siteUrl).host,
    key,
    keyLocation: `${siteUrl}/${key}.txt`
  };
};

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isRetryableError = (error) => {
  const statusCode = error?.response?.status;
  return !statusCode || RETRYABLE_STATUS_CODES.has(statusCode);
};

const toUniqueUrls = (urlList = []) =>
  [...new Set(urlList.map((url) => String(url || "").trim()).filter(Boolean))];

export const buildArticleUrl = (slug) => {
  return buildLocalizedArticleUrl(slug, "en");
};

export const buildLocalizedArticleUrl = (slug, locale = "en") => {
  const config = getIndexNowConfig();

  if (!config || !slug) {
    return null;
  }

  const normalizedSlug = encodeURIComponent(String(slug).trim());
  return locale === "ar"
    ? `${config.siteUrl}/ar/article/${normalizedSlug}`
    : `${config.siteUrl}/article/${normalizedSlug}`;
};

export const submitIndexNowUrls = async (urlList, context = "unknown") => {
  const config = getIndexNowConfig();
  const uniqueUrls = toUniqueUrls(urlList);

  if (!config) {
    console.warn(
      `[IndexNow] Skipping submission for ${context}: missing SITE_URL or INDEXNOW_KEY configuration`
    );
    return { ok: false, skipped: true };
  }

  if (uniqueUrls.length === 0) {
    console.warn(`[IndexNow] Skipping submission for ${context}: no URLs provided`);
    return { ok: false, skipped: true };
  }

  const payload = {
    host: config.host,
    key: config.key,
    keyLocation: config.keyLocation,
    urlList: uniqueUrls
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await axios.post(INDEXNOW_ENDPOINT, payload, {
        headers: {
          "Content-Type": "application/json; charset=utf-8"
        },
        timeout: 5000,
        validateStatus: (status) => status >= 200 && status < 300
      });

      console.log(
        `[IndexNow] Submission succeeded for ${context} on attempt ${attempt}: ${uniqueUrls.join(", ")} | status=${response.status}`
      );

      return { ok: true, status: response.status };
    } catch (error) {
      const statusCode = error?.response?.status;
      const errorMessage = error?.message || "Unknown error";
      const isLastAttempt = attempt === MAX_RETRIES;

      if (!isLastAttempt && isRetryableError(error)) {
        console.warn(
          `[IndexNow] Submission retry ${attempt}/${MAX_RETRIES} for ${context} failed: ${errorMessage}${statusCode ? ` | status=${statusCode}` : ""}`
        );
        await sleep(attempt * 1000);
        continue;
      }

      console.error(
        `[IndexNow] Submission failed for ${context}: ${errorMessage}${statusCode ? ` | status=${statusCode}` : ""} | urls=${uniqueUrls.join(", ")}`
      );

      return { ok: false, status: statusCode, error: errorMessage };
    }
  }

  return { ok: false };
};

export const queueIndexNowSubmission = (urlList, context) => {
  const uniqueUrls = toUniqueUrls(urlList);

  if (uniqueUrls.length === 0) {
    return;
  }

  setImmediate(() => {
    void submitIndexNowUrls(uniqueUrls, context);
  });
};
