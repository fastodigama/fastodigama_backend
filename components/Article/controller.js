import { getAppTimeZone, getCurrentDateInTimeZone, shiftDateString } from "../config/timezone.js";

// Dashboard stats: get article counts for today and yesterday
const getDashboardArticleStats = async (req, res) => {
  try {
    const today = getCurrentDateInTimeZone();
    const yesterday = shiftDateString(today, -1);
    const lockedAuthor = await getLockedAuthorForRequest(req);
    const articleScope = buildArticleOwnershipQuery(lockedAuthor);

    const [todayCount, yesterdayCount] = await Promise.all([
      articleModel.countArticlesByDate(today, getAppTimeZone(), articleScope),
      articleModel.countArticlesByDate(yesterday, getAppTimeZone(), articleScope)
    ]);

    res.json({ todayCount, yesterdayCount, timeZone: getAppTimeZone(), today });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

// Dashboard: get articles by date (YYYY-MM-DD)
const getArticlesByDateApi = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "Missing date" });
    const lockedAuthor = await getLockedAuthorForRequest(req);
    const articleScope = buildArticleOwnershipQuery(lockedAuthor);
    const articles = await articleModel.getArticlesByDate(date, getAppTimeZone(), articleScope);
    res.json({ articles, timeZone: getAppTimeZone(), date });
  } catch (err) {
    console.error("Articles by date error:", err);
    res.status(500).json({ error: "Failed to fetch articles" });
  }
};

const DEFAULT_FRONTEND_URL = "https://fastodigama.com";
const DEFAULT_FEED_LIMIT = 20;
const VIEWED_ARTICLES_COOKIE = "fd_article_views";
const VIEWED_ARTICLES_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24;
const MAX_TRACKED_VIEWED_ARTICLES = 200;

const escapeXml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const stripHtml = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const wrapCdata = (value = "") =>
  String(value).replace(/]]>/g, "]]]]><![CDATA[>");

const getFrontendUrl = () =>
  (process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL).replace(/\/+$/, "");

const getApiBaseUrl = (request) =>
  `${request.protocol}://${request.get("host")}`.replace(/\/+$/, "");

const getEffectiveUserAgent = (request) =>
  request.get("X-Forwarded-User-Agent") ||
  request.get("User-Agent") ||
  "";

const getClientIpDetails = (request) => {
  const forwardedForHeader = request.get("X-Forwarded-For") || "";
  const forwardedIps = forwardedForHeader
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);

  const clientIp =
    forwardedIps[0] ||
    request.ip ||
    request.socket?.remoteAddress ||
    "";

  return {
    clientIp,
    forwardedForHeader
  };
};

const getClientCountry = (request) => {
  const country =
    request.get("CF-IPCountry") ||
    request.get("X-Vercel-IP-Country") ||
    request.get("X-Country-Code") ||
    "";

  return country && country !== "XX" ? country : "";
};

const NON_HUMAN_USER_AGENT_RE =
  /bot|crawl|spider|slurp|bingpreview|duckduck|baidu|yandex|headless|lighthouse|pagespeed|curl|wget|python-requests|python\/|axios|postman|insomnia|go-http-client|java\/|libwww-perl|ruby|php|node|undici|vercel|next\.js/i;

const getRequestClassifierSignals = (request) => {
  const rawUserAgent = request.get("User-Agent") || "";
  const forwardedUserAgent = request.get("X-Forwarded-User-Agent") || "";
  const effectiveUserAgent =
    forwardedUserAgent || rawUserAgent || "";
  const accept = request.get("Accept") || "";
  const acceptLanguage = request.get("Accept-Language") || "";
  const secFetchMode = request.get("Sec-Fetch-Mode") || "";
  const secFetchDest = request.get("Sec-Fetch-Dest") || "";
  const secFetchSite = request.get("Sec-Fetch-Site") || "";
  const secChUa = request.get("Sec-CH-UA") || "";
  const secChUaMobile = request.get("Sec-CH-UA-Mobile") || "";
  const secChUaPlatform = request.get("Sec-CH-UA-Platform") || "";

  return {
    rawUserAgent,
    forwardedUserAgent,
    effectiveUserAgent,
    accept,
    acceptLanguage,
    secFetchMode,
    secFetchDest,
    secFetchSite,
    secChUa,
    secChUaMobile,
    secChUaPlatform
  };
};

const isNonHumanFetcher = (request) => {
  const {
    rawUserAgent,
    forwardedUserAgent,
    effectiveUserAgent,
    accept,
    acceptLanguage,
    secFetchMode,
    secFetchDest,
    secFetchSite,
    secChUa,
    secChUaMobile,
    secChUaPlatform
  } = getRequestClassifierSignals(request);

  const rawLooksAutomated = NON_HUMAN_USER_AGENT_RE.test(rawUserAgent);
  const effectiveLooksAutomated =
    effectiveUserAgent && NON_HUMAN_USER_AGENT_RE.test(effectiveUserAgent);
  const browserLikeUserAgent = /mozilla\/5\.0/i.test(effectiveUserAgent);
  const acceptsHtml = /text\/html|application\/xhtml\+xml/i.test(accept);
  const hasBrowserHeaders = Boolean(
    acceptLanguage ||
      secChUa ||
      secChUaMobile ||
      secChUaPlatform ||
      secFetchSite ||
      secFetchMode === "navigate" ||
      secFetchDest === "document"
  );

  if (!rawUserAgent && !forwardedUserAgent) {
    return true;
  }

  if (effectiveLooksAutomated) {
    return true;
  }

  // A proxy may fetch server-side with "node"/"undici" while preserving the
  // original browser UA in X-Forwarded-User-Agent. Treat those as browser views.
  if (rawLooksAutomated && browserLikeUserAgent && (acceptsHtml || hasBrowserHeaders)) {
    return false;
  }

  if (browserLikeUserAgent && (acceptsHtml || hasBrowserHeaders)) {
    return false;
  }

  return rawLooksAutomated || (!acceptsHtml && !hasBrowserHeaders);
};

const shouldCountAsReaderView = (request) => {
  return !isNonHumanFetcher(request);
};

const getViewedArticlesCookie = (request) => {
  const viewedArticlesCookie = request.cookies?.[VIEWED_ARTICLES_COOKIE];

  if (!viewedArticlesCookie || typeof viewedArticlesCookie !== "string") {
    return {};
  }

  try {
    const parsedCookie = JSON.parse(viewedArticlesCookie);
    return parsedCookie && typeof parsedCookie === "object" ? parsedCookie : {};
  } catch (error) {
    return {};
  }
};

const pruneViewedArticles = (viewedArticles) => {
  const entries = Object.entries(viewedArticles)
    .filter(([, viewedAt]) => Number.isFinite(viewedAt))
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TRACKED_VIEWED_ARTICLES);

  return Object.fromEntries(entries);
};

const markArticleAsViewed = (request, response, articleId) => {
  const viewedArticles = getViewedArticlesCookie(request);
  viewedArticles[articleId] = Date.now();

  const prunedViewedArticles = pruneViewedArticles(viewedArticles);
  const isProduction = process.env.NODE_ENV === "production";

  response.cookie(
    VIEWED_ARTICLES_COOKIE,
    JSON.stringify(prunedViewedArticles),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: VIEWED_ARTICLES_COOKIE_MAX_AGE_MS
    }
  );
};

const getFeedImage = (articleObj) => {
  if (!Array.isArray(articleObj.images) || articleObj.images.length === 0) {
    return null;
  }

  const primaryImage = articleObj.images[0];
  if (!primaryImage) {
    return null;
  }

  let imageUrl = primaryImage.url || primaryImage.key || "";
  if (!imageUrl) {
    return null;
  }

  if (!/^https?:\/\//i.test(imageUrl) && process.env.ARTICLE_IMAGE_BASE) {
    const filename = primaryImage.key || imageUrl;
    imageUrl = `${process.env.ARTICLE_IMAGE_BASE}/${encodeURIComponent(filename)}`;
  }

  return {
    url: imageUrl,
    alt: primaryImage.alt || articleObj.title || "Article image"
  };
};

const getFeedItems = async () => {
  const articles = await articleModel.getArticlesPaginated(0, DEFAULT_FEED_LIMIT);

  return articles.map((article) => {
    const articleObj = article.toObject ? article.toObject() : article;
    const frontendUrl = getFrontendUrl();
    const articleUrl = `${frontendUrl}/article/${articleObj.slug}`;
    const htmlContent = marked.parse(String(articleObj.text || ""));
    const plainText = stripHtml(htmlContent);
    const summary =
      plainText.length > 280 ? `${plainText.slice(0, 277).trim()}...` : plainText;

    return {
      title: articleObj.title || "Untitled",
      url: articleUrl,
      author: getArticleAuthorName(articleObj),
      publishedAt: articleObj.createdAt || new Date(),
      updatedAt: articleObj.updatedAt || articleObj.createdAt || new Date(),
      summary,
      htmlContent,
      id: String(articleObj._id || articleUrl),
      image: getFeedImage(articleObj)
    };
  });
};

const normalizeFormFieldArray = (value) => {
  if (typeof value === "undefined") return [];
  return Array.isArray(value) ? value : [value];
};

const buildArticleSources = (sourceTitles, sourceUrls) => {
  const titles = normalizeFormFieldArray(sourceTitles);
  const urls = normalizeFormFieldArray(sourceUrls);
  const maxLength = Math.max(titles.length, urls.length);

  return Array.from({ length: maxLength }, (_, index) => {
    const title = String(titles[index] || "").trim();
    const url = String(urls[index] || "").trim();

    if (!title && !url) {
      return null;
    }

    return { title, url };
  }).filter(Boolean);
};

const buildRssXml = (items, request) => {
  const frontendUrl = getFrontendUrl();
  const apiBaseUrl = getApiBaseUrl(request);
  const feedUrl = `${apiBaseUrl}/rss.xml`;
  const lastUpdated = items.length > 0 ? new Date(items[0].updatedAt) : new Date();
  const rssItems = items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <guid isPermaLink="true">${escapeXml(item.url)}</guid>
      <description>${escapeXml(item.summary)}</description>
${item.image ? `      <media:content url="${escapeXml(item.image.url)}" medium="image">
        <media:title>${escapeXml(item.title)}</media:title>
        <media:text>${escapeXml(item.image.alt)}</media:text>
      </media:content>
` : ""}      <content:encoded><![CDATA[${wrapCdata(item.htmlContent)}]]></content:encoded>
      <author>${escapeXml(item.author)}</author>
      <pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate>
    </item>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>FASTODIGAMA</title>
    <link>${escapeXml(frontendUrl)}</link>
    <description>${escapeXml("Latest articles from FASTODIGAMA")}</description>
    <language>en</language>
    <lastBuildDate>${lastUpdated.toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
${rssItems}
  </channel>
</rss>`;
};

const buildAtomXml = (items, request) => {
  const frontendUrl = getFrontendUrl();
  const apiBaseUrl = getApiBaseUrl(request);
  const feedUrl = `${apiBaseUrl}/atom.xml`;
  const updated = items.length > 0 ? new Date(items[0].updatedAt) : new Date();
  const atomEntries = items
    .map(
      (item) => `  <entry>
    <title>${escapeXml(item.title)}</title>
    <id>${escapeXml(item.url)}</id>
    <link href="${escapeXml(item.url)}" />
    <updated>${new Date(item.updatedAt).toISOString()}</updated>
    <published>${new Date(item.publishedAt).toISOString()}</published>
    <summary>${escapeXml(item.summary)}</summary>
    <author>
      <name>${escapeXml(item.author)}</name>
    </author>
${item.image ? `    <media:content url="${escapeXml(item.image.url)}" medium="image">
      <media:title>${escapeXml(item.title)}</media:title>
      <media:text>${escapeXml(item.image.alt)}</media:text>
    </media:content>
` : ""}    <content type="html"><![CDATA[${wrapCdata(item.htmlContent)}]]></content>
  </entry>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <title>FASTODIGAMA</title>
  <id>${escapeXml(frontendUrl)}</id>
  <link href="${escapeXml(frontendUrl)}" />
  <link href="${escapeXml(feedUrl)}" rel="self" />
  <updated>${updated.toISOString()}</updated>
  <subtitle>${escapeXml("Latest articles from FASTODIGAMA")}</subtitle>
${atomEntries}
</feed>`;
};

const getRssFeed = async (request, response) => {
  try {
    const items = await getFeedItems();
    response.set("Content-Type", "application/rss+xml; charset=utf-8");
    response.send(buildRssXml(items, request));
  } catch (error) {
    console.error("RSS feed error:", error);
    response.status(500).json({ message: "Failed to generate RSS feed" });
  }
};

const getAtomFeed = async (request, response) => {
  try {
    const items = await getFeedItems();
    response.set("Content-Type", "application/atom+xml; charset=utf-8");
    response.send(buildAtomXml(items, request));
  } catch (error) {
    console.error("Atom feed error:", error);
    response.status(500).json({ message: "Failed to generate Atom feed" });
  }
};
// Get single article by slug
const getArticleBySlugApiResponse = async (request, response) => {
 
  try {
    const locale = getRequestedLocale(request);
    const slug = request.params.slug;
    const userAgent = getEffectiveUserAgent(request);
    const rawUserAgent = request.get("User-Agent") || "";
    const { clientIp, forwardedForHeader } = getClientIpDetails(request);
    const clientCountry = getClientCountry(request);
    const shouldCountView = shouldCountAsReaderView(request);
    console.log(
      `[API] Fetching article by slug: ${slug} | User-Agent: ${userAgent}${rawUserAgent && rawUserAgent !== userAgent ? ` | Raw-User-Agent: ${rawUserAgent}` : ""}${clientIp ? ` | Client-IP: ${clientIp}` : ""}${clientCountry ? ` | Country: ${clientCountry}` : ""}${forwardedForHeader ? ` | Forwarded-For: ${forwardedForHeader}` : ""}`
    );
    let article = await articleModel.getArticleBySlug(slug, locale);
    if (!article) {
      console.warn(`[API] Article not found for slug: ${slug}`);
      return response.status(404).json({ message: "Article not found" });
    }
    const articleIdStr = String(article._id);
    const viewedArticles = getViewedArticlesCookie(request);

    if (shouldCountView && !viewedArticles[articleIdStr]) {
      article = await articleModel.incrementArticleViewsById(article._id);
      markArticleAsViewed(request, response, articleIdStr);
    }
    // ===== End cookie-based view counting =====
    // Count comments for this article
    const commentModel = (await import("../Comment/model.js")).default;
    let commentsCount = 0;
    try {
      commentsCount = await commentModel.getCommentsByArticle(article._id).then(comments => comments.length);
    } catch (e) {}
    // Use Like collection for like count and likedByCurrentUser
    const { Like } = await import("../Like/model.js");
    const userId =
      (request.user && request.user._id) ||
      request.body?.userId ||
      request.query?.userId ||
      null;
    const likes = await Like.countDocuments({ articleId: article._id });
    let likedByCurrentUser = false;
    let likedAt = null;
    if (userId) {
      // Find the Like document for this user and article
      const likeDoc = await Like.findOne({ userId, articleId: article._id });
      if (likeDoc) {
        likedByCurrentUser = true;
        likedAt = likeDoc.createdAt;
      }
    }

    // Fetch related articles (same category, excluding current article)
    let relatedArticles = [];
    try {
      relatedArticles = await articleModel.getByCategoryPaginated(
        article.categoryId?._id || article.categoryId,
        0,
        5
      );
      // Exclude the current article
      relatedArticles = relatedArticles.filter(a => String(a._id) !== String(article._id));
      // Map image URLs for related articles and limit fields
      relatedArticles = relatedArticles.map(a => {
        const obj = localizeArticleObject(a, locale);
        return {
          _id: obj._id,
          title: obj.title,
          text: obj.text,
          slug: obj.slug,
          images: obj.images,
          author: obj.author,
          categoryId: obj.categoryId,
          createdAt: obj.createdAt
        };
      });
    } catch (e) {
      relatedArticles = [];
    }

    const articleObj = localizeArticleObject(article, locale);
    response.json({
      article: {
        ...articleObj,
        faqs: Array.isArray(articleObj.faqs) ? articleObj.faqs : [],
        views: article.views || 0,
        commentsCount,
        likes,
        likedByCurrentUser: !!likedByCurrentUser,
        likedAt: likedAt
      },
      relatedArticles,
      lang: locale
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({ message: "Server Error" })
  }
}
// Like an article
const likeArticleApi = async (request, response) => {
  try {
    console.log("[LIKE API] Incoming like request:", {
      params: request.params,
      body: request.body,
      user: request.user
    });
    const locale = getRequestedLocale(request);
    const slug = request.params.slug;
    // Get userId only from request.body
    const userId = request.body && request.body.userId;
    if (!userId) {
      console.warn("[LIKE API] Missing userId in request body");
      return response.status(400).json({ message: "Missing userId" });
    }
    const article = await articleModel.getArticleBySlug(slug, locale);
    if (!article) {
      console.warn(`[LIKE API] Article not found: ${slug}`);
      return response.status(404).json({ message: "Article not found" });
    }
    const articleId = article._id;
    // Save like in Like collection using Mongoose model
    const { Like } = await import("../Like/model.js");
    await Like.findOneAndUpdate(
      { userId, articleId },
      { $setOnInsert: { userId, articleId } },
      { upsert: true, new: true }
    );
    // Get updated like count and likedByCurrentUser
    const likes = await Like.countDocuments({ articleId });
    const likedByCurrentUser = await Like.exists({ userId, articleId });
    console.log(`[LIKE API] User ${userId} liked article ${articleId} (slug: ${slug})`);
    response.status(200).json({ likes, likedByCurrentUser: !!likedByCurrentUser });
  } catch (error) {
    console.error("[LIKE API] Error:", error);
    response.status(500).json({ message: "Server Error" });
  }
};

// Unlike an article
const unlikeArticleApi = async (request, response) => {
  try {
    const locale = getRequestedLocale(request);
    const slug = request.params.slug;
    const userId = request.body.userId;
    if (!userId) return response.status(400).json({ message: "Missing userId" });
    const article = await articleModel.getArticleBySlug(slug, locale);
    if (!article) return response.status(404).json({ message: "Article not found" });
    const articleId = article._id;
    // Remove like from Like collection using Mongoose model
    const { Like } = await import("../Like/model.js");
    await Like.deleteOne({ userId, articleId });
    // Get updated like count and likedByCurrentUser
    const likes = await Like.countDocuments({ articleId });
    const likedByCurrentUser = await Like.exists({ userId, articleId });
    response.status(200).json({ likes, likedByCurrentUser: !!likedByCurrentUser });
  } catch (error) {
    console.error(error);
    response.status(500).json({ message: "Server Error" });
  }
};
import mongoose from "mongoose";
import articleModel, { ArticleModel } from "./model.js";
import categoryModel from "../Category/model.js";
import authorModel from "../Author/model.js";
import userModel from "../User/model.js";
import commentModel from "../Comment/model.js";
import { marked } from "marked";
import multer from "multer";
import { buildArticleUrl, buildLocalizedArticleUrl, queueIndexNowSubmission } from "../config/indexNow.js";
import { s3 } from "../config/r2.js";
import sharp from "sharp";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import {
  isArabicTranslationConfigured,
  translateArticleToArabic
} from "./translationService.js";

const upload = multer({
  storage: multer.memoryStorage(), 
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

const getArticleAuthorName = (article) =>
  article?.authorId?.name || article?.author || "FASTODIGAMA";

const getLockedAuthorForRequest = async (request) => {
  if (request.session?.role !== "author") {
    return null;
  }

  const user = await userModel.getUserByEmail(request.session?.user);
  const linkedAuthor = user?._id
    ? await authorModel.getAuthorByUserId(user._id)
    : await authorModel.getAuthorByEmail(request.session?.user);
  if (linkedAuthor) {
    return {
      _id: linkedAuthor._id,
      name: linkedAuthor.name,
      isLinkedProfile: true
    };
  }

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();

  return {
    _id: null,
    name: fullName || user?.nickname || user?.user || "Author",
    isLinkedProfile: false
  };
};

const buildArticleOwnershipQuery = (lockedAuthor) => {
  if (!lockedAuthor) {
    return {};
  }

  if (lockedAuthor._id) {
    return { authorId: lockedAuthor._id };
  }

  return { author: lockedAuthor.name };
};

const queueArticleIndexNow = (articleRecord, action) => {
  const englishUrl = buildArticleUrl(articleRecord?.slug);
  const arabicUrl = buildLocalizedArticleUrl(articleRecord?.translations?.ar?.slug, "ar");
  const urlList = [englishUrl, arabicUrl].filter(Boolean);

  if (urlList.length === 0) {
    console.warn(
      `[IndexNow] Skipping article ${action}: unable to build public URL for slug="${articleRecord?.slug || ""}"`
    );
    return;
  }

  queueIndexNowSubmission(urlList, `article ${action}`);
};

const getRequestedLocale = (request) =>
  String(request.query?.lang || "").trim().toLowerCase() === "ar" ? "ar" : "en";

const buildPublicImageUrl = (image) => {
  let filename = image?.key || image?.url || image;
  if (!filename) {
    return "";
  }

  filename = String(filename);
  if (filename.startsWith("http")) {
    filename = filename.split("/").pop();
  }

  return `${process.env.ARTICLE_IMAGE_BASE}/${encodeURIComponent(filename)}`;
};

const localizeArticleImages = (articleObj, locale) => {
  const imageAltMap = new Map(
    (articleObj?.translations?.ar?.imageAlts || [])
      .filter((entry) => entry?.key)
      .map((entry) => [String(entry.key), entry.alt || ""])
  );

  return Array.isArray(articleObj?.images)
    ? articleObj.images.map((image) => ({
        ...image,
        url: buildPublicImageUrl(image),
        alt:
          locale === "ar" && imageAltMap.has(String(image.key))
            ? imageAltMap.get(String(image.key))
            : image.alt
      }))
    : [];
};

const localizeArticleObject = (article, locale = "en") => {
  const articleObj = article?.toObject ? article.toObject() : { ...(article || {}) };
  const arabicTranslation = articleObj?.translations?.ar;
  const localizedCategory =
    locale === "ar" &&
    articleObj?.categoryId &&
    typeof articleObj.categoryId === "object" &&
    articleObj.categoryId?.translations?.ar?.name
      ? {
          ...(articleObj.categoryId.toObject ? articleObj.categoryId.toObject() : articleObj.categoryId),
          baseSlug: articleObj.categoryId.slug,
          slug: articleObj.categoryId.translations.ar.slug || articleObj.categoryId.slug,
          name: articleObj.categoryId.translations.ar.name || articleObj.categoryId.name,
        }
      : articleObj.categoryId;
  const hasArabicTranslation = Boolean(
    arabicTranslation &&
      (arabicTranslation.title || arabicTranslation.text || arabicTranslation.translatedAt)
  );

  const localizedFaqs =
    locale === "ar" && Array.isArray(arabicTranslation?.faqs) && arabicTranslation.faqs.length > 0
      ? arabicTranslation.faqs
      : Array.isArray(articleObj.faqs)
        ? articleObj.faqs
        : [];
  const localizedSources =
    locale === "ar" && Array.isArray(arabicTranslation?.sources) && arabicTranslation.sources.length > 0
      ? arabicTranslation.sources
      : Array.isArray(articleObj.sources)
        ? articleObj.sources
        : [];

  return {
    ...articleObj,
    baseSlug: articleObj.slug,
    title: locale === "ar" && arabicTranslation?.title ? arabicTranslation.title : articleObj.title,
    slug: locale === "ar" && arabicTranslation?.slug ? arabicTranslation.slug : articleObj.slug,
    text: locale === "ar" && arabicTranslation?.text ? arabicTranslation.text : articleObj.text,
    categoryId: localizedCategory,
    faqs: localizedFaqs,
    sources: localizedSources,
    images: localizeArticleImages(articleObj, locale),
    locale: locale === "ar" && hasArabicTranslation ? "ar" : "en",
    hasArabicTranslation
  };
};

const buildFrontendSearchConditions = (search) => {
  if (!search) {
    return {};
  }

  return {
    $or: [
      { title: { $regex: search, $options: "i" } },
      { text: { $regex: search, $options: "i" } },
      { "translations.ar.title": { $regex: search, $options: "i" } },
      { "translations.ar.text": { $regex: search, $options: "i" } }
    ]
  };
};

const attachArabicTranslation = async (articleData) => {
  const arabicTranslation = await translateArticleToArabic(articleData);

  return {
    ...articleData,
    translations: {
      ar: arabicTranslation
    }
  };
};


// ===== ARTICLE CONTROLLER =====

// Get all Articles and return as JSON (for frontend API)
const getArticlesApiResponse = async (request, response) => {
  try {
    const locale = getRequestedLocale(request);
    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = request.query.search || "";
    const category = request.query.category || "";
    const lockedAuthor = await getLockedAuthorForRequest(request);
    const ownershipQuery = buildArticleOwnershipQuery(lockedAuthor);
    const searchConditions = buildFrontendSearchConditions(search);
    const categoryCondition = category ? { categoryId: category } : {};
    const articleQuery = {
      ...ownershipQuery,
      ...categoryCondition,
      ...searchConditions
    };

    const totalArticles = await ArticleModel.countDocuments(articleQuery);
    const articles = await ArticleModel.find(articleQuery)
      .populate("categoryId")
      .populate("authorId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalArticles / limit);

    // Ensure all image URLs use CDN domain
    // Count comments for each article
    const commentModel = (await import("../Comment/model.js")).default;
    const { Like } = await import("../Like/model.js");
    const mappedArticles = await Promise.all(articles.map(async article => {
      const localizedArticle = localizeArticleObject(article, locale);
      let commentsCount = 0;
      try {
        commentsCount = await commentModel.getCommentsByArticle(article._id).then(comments => comments.length);
      } catch (e) {}
      // Use Like collection for like count and likedByCurrentUser
      const userId =
        (request.user && request.user._id) ||
        request.body?.userId ||
        request.query?.userId ||
        null;
      const likes = await Like.countDocuments({ articleId: article._id });
      let likedByCurrentUser = false;
      if (userId) {
        likedByCurrentUser = await (await import("../Like/model.js")).isArticleLikedByUser(userId, article._id);
      }
      return {
        ...localizedArticle,
        views: localizedArticle.views || 0,
        commentsCount,
        likes,
        likedByCurrentUser: !!likedByCurrentUser
      };
    }));
    response.json({ articles: mappedArticles, page, totalPages, totalArticles, search, category, lang: locale });

  } catch (error) {
    console.error(error);
    response.status(500).json({ message: "Server Error" });
  }
};


// GET list of all articles // FOR BACKEND ONLY
const getAllArticles = async (request, response) => {
  const page = parseInt(request.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const search = request.query.search || "";
  const category = request.query.category || "";
  const lockedAuthor = await getLockedAuthorForRequest(request);
  const ownershipQuery = buildArticleOwnershipQuery(lockedAuthor);
  const searchConditions = search
    ? {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { text: { $regex: search, $options: "i" } }
        ]
      }
    : {};
  const categoryCondition = category ? { categoryId: category } : {};
  const articleQuery = {
    ...ownershipQuery,
    ...categoryCondition,
    ...searchConditions
  };

  const totalArticles = await ArticleModel.countDocuments(articleQuery);
  const articles = await ArticleModel.find(articleQuery)
    .populate("categoryId")
    .populate("authorId")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalPages = Math.ceil(totalArticles / limit);
  const categories = await categoryModel.getCategories();

  response.render("article/article-list", {
    title: "Article List",
    articles,
    categories,
    currentPath: request.originalUrl.split('?')[0],
    currentPage: page,
    totalPages,
    totalArticles,
    search,
    category,
  });
};

// Get single article by ID
const getArticleByIdApiResponse = async (request, response) => {
  try {
    const locale = getRequestedLocale(request);
    const id = request.params.id;
    const userAgent = getEffectiveUserAgent(request);
    const rawUserAgent = request.get("User-Agent") || "";
    const { clientIp, forwardedForHeader } = getClientIpDetails(request);
    const clientCountry = getClientCountry(request);
    console.log(
      `[API] Fetching article by id: ${id} | User-Agent: ${userAgent}${rawUserAgent && rawUserAgent !== userAgent ? ` | Raw-User-Agent: ${rawUserAgent}` : ""}${clientIp ? ` | Client-IP: ${clientIp}` : ""}${clientCountry ? ` | Country: ${clientCountry}` : ""}${forwardedForHeader ? ` | Forwarded-For: ${forwardedForHeader}` : ""}`
    );
    // Increment views atomically and return the updated document, only if not a bot/crawler
    const isBot = !shouldCountAsReaderView(request);
    let article;
    if (!isBot) {
      article = await articleModel.incrementArticleViewsById(id);
    } else {
      article = await articleModel.getArticleById(id);
    }
    if (!article) {
      return response.status(404).json({message: "Article not found"});
    }
    // Count comments for this article
    const commentModel = (await import("../Comment/model.js")).default;
    let commentsCount = 0;
    try {
      commentsCount = await commentModel.getCommentsByArticle(article._id).then(comments => comments.length);
    } catch (e) {}
    // Use Like collection for like count and likedByCurrentUser
    const { Like } = await import("../Like/model.js");
    const userId =
      (request.user && request.user._id) ||
      request.body?.userId ||
      request.query?.userId ||
      null;
    const likes = await Like.countDocuments({ articleId: article._id });
    let likedByCurrentUser = false;
    let likedAt = null;
    if (userId) {
      // Find the Like document for this user and article
      const likeDoc = await Like.findOne({ userId, articleId: article._id });
      if (likeDoc) {
        likedByCurrentUser = true;
        likedAt = likeDoc.createdAt;
      }
    }
    response.json({
      article: {
        ...localizeArticleObject(article, locale),
        views: article.views || 0,
        commentsCount,
        likes,
        likedByCurrentUser: !!likedByCurrentUser,
        likedAt: likedAt
      },
      lang: locale
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({ message: "Server Error"})
  }
}

// Display a single article in detail view
const buildNestedCommentsForArticleView = async (parentCommentId) => {
  const replies = await commentModel.getCommentReplies(parentCommentId);

  return Promise.all(
    replies.map(async (reply) => ({
      ...(reply.toObject ? reply.toObject() : reply),
      replies: await buildNestedCommentsForArticleView(reply._id),
    }))
  );
};

const viewArticle = async (request, response) => {
  const articleId = request.query.articleId;
  const article = await articleModel.getArticleById(articleId);
  if (!article) {
    return response.redirect("/admin/article");
  }
  await article.populate("categoryId");
  const htmlContent = marked(article.text);
  
  // Fetch comments with unlimited nested replies for this article
  const topLevelComments = await commentModel.getCommentsByArticle(articleId);
  const comments = await Promise.all(
    topLevelComments.map(async (comment) => ({
      ...(comment.toObject ? comment.toObject() : comment),
      replies: await buildNestedCommentsForArticleView(comment._id),
    }))
  );
  
  // Fetch users who liked this article
  const { getUsersWhoLikedArticle } = await import("../Like/model.js");
  let likedUsers = [];
  try {
    likedUsers = await getUsersWhoLikedArticle(articleId);
    likedUsers = likedUsers.map(like => like.userId).filter(Boolean);
  } catch (e) {
    likedUsers = [];
  }
  
  response.render("article/article-view", { 
    title: "view Article", 
    article, 
    htmlContent, 
    comments,
    likedUsers,
    currentPath: request.originalUrl.split('?')[0] 
  });
};

// Show the form to add a new article
const addArticleForm = async (request, response) => {
  const categories = await categoryModel.getCategories();
  const authors = await authorModel.getActiveAuthors();
  const lockedAuthor = await getLockedAuthorForRequest(request);
  response.render("article/article-add", {
    title: "Article Add",
    categories,
    authors,
    lockedAuthor,
    currentPath: request.originalUrl.split('?')[0]
  });
};


// 🌟 UPDATED: Save a new article to the database (with author)
const addNewArticle = async (request, response) => {
  try {
    if (!isArabicTranslationConfigured()) {
      return response.status(500).send("Arabic translation is not configured. Set OPENAI_API_KEY first.");
    }
    // Extracted author, embedVideo, embedVideoPosition from req.body
    const { title, text, categoryId, authorId, author, embedVideo, embedVideoPosition } = request.body; 
    const lockedAuthor = await getLockedAuthorForRequest(request);
    const selectedAuthor = lockedAuthor?._id
      ? await authorModel.getAuthorById(lockedAuthor._id)
      : (authorId ? await authorModel.getAuthorById(authorId) : null);

    // Handle FAQs from form
    let faqQuestions = request.body.faqQuestions;
    let faqAnswers = request.body.faqAnswers;
    let faqs = [];
    // Normalize to arrays
    if (typeof faqQuestions === 'string') faqQuestions = [faqQuestions];
    if (typeof faqAnswers === 'string') faqAnswers = [faqAnswers];
    if (Array.isArray(faqQuestions) && Array.isArray(faqAnswers)) {
      // Pair up questions and answers, ignore empty ones
      faqs = faqQuestions.map((q, i) => {
        const a = faqAnswers[i] || '';
        if (q.trim() || a.trim()) {
          return { question: q.trim(), answer: a.trim() };
        }
        return null;
      }).filter(Boolean);
    }

    const sources = buildArticleSources(
      request.body.sourceTitles,
      request.body.sourceUrls
    );

    const altTexts = request.body.alt 
      ? (Array.isArray(request.body.alt) ? request.body.alt : [request.body.alt]) 
      : [];

    let images = [];

    if (request.files && request.files.length > 0) {
      images = await Promise.all(request.files.map(async (file, index) => {
        // Sanitize slug: remove spaces and special characters
        const projectNameSlug = title.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const fileName = `${projectNameSlug}-${Date.now()}-${index}.webp`;

        const buffer = await sharp(file.buffer)
          .resize(1200, null, { withoutEnlargement: true }) 
          .webp({ quality: 80 }) 
          .toBuffer();

        await s3.send(new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileName,
          Body: buffer,
          ContentType: "image/webp",
        }));

        return {
          url: `${process.env.ARTICLE_IMAGE_BASE}/${encodeURIComponent(fileName)}`,
          key: fileName,
          alt: altTexts[index] || ""
        };
      }));
    }

    const articlePayload = await attachArabicTranslation({
      title,
      text,
      categoryId,
      authorId: selectedAuthor?._id || lockedAuthor?._id || null,
      author: lockedAuthor?.name || selectedAuthor?.name || author,
      images,
      embedVideo,
      embedVideoPosition,
      faqs,
      sources
    });

    // Added author, embedVideo, embedVideoPosition, faqs, sources to the payload sent to the model
    const result = await articleModel.addArticle(articlePayload);
    if (result) {
      queueArticleIndexNow(result, "create");
      return response.redirect("/admin/article");
    }

  } catch (err) {
    console.error("Error adding article with Sharp:", err);
    return response.status(500).send("Failed to process images.");
  }
};

// Delete an article by ID
const deleteArticle = async (request, response) => {
  const existingArticle = await articleModel.getArticleById(request.query.articleId);
  let result = await articleModel.deleteArticleById(request.query.articleId);
  if (result?.deletedCount === 1) {
    queueArticleIndexNow(existingArticle, "delete");
    response.redirect("/admin/article");
  } else {
    response.render("article/article-list", {
      err: "error deleting article",
    });
  }
};

// Show the form to edit an existing article
const editArticleForm = async (request, response) => {
  const articleId = request.query.articleId;
  if (!articleId) {
    return response.redirect("/admin/article");
  }

  const editArticle = await articleModel.getArticleById(articleId);
  if (!editArticle) {
    return response.redirect("/admin/article");
  }

  const categories = await categoryModel.getCategories();
  const authors = await authorModel.getActiveAuthors();
  const lockedAuthor = await getLockedAuthorForRequest(request);
  response.render("article/article-edit", {
    title: "Article Edit",
    editArticle,
    categories,
    authors,
    lockedAuthor,
    currentPath: request.originalUrl.split('?')[0],
  });
};


// 🌟 UPDATED: Update an article in the database (with author)
const editArticle = async (request, response) => {
  try {
    if (!isArabicTranslationConfigured()) {
      return response.status(500).send("Arabic translation is not configured. Set OPENAI_API_KEY first.");
    }
    // Extracted author from req.body
    const { articleId, title, text, categoryId, authorId, author, embedVideo, embedVideoPosition, existingImageKeys, existingImageAlts } = request.body;
    const lockedAuthor = await getLockedAuthorForRequest(request);
    const selectedAuthor = lockedAuthor?._id
      ? await authorModel.getAuthorById(lockedAuthor._id)
      : (authorId ? await authorModel.getAuthorById(authorId) : null);
    
    // Added author, embedVideo, embedVideoPosition to the update payload
    const updateData = {
      title,
      text,
      categoryId,
      authorId: selectedAuthor?._id || lockedAuthor?._id || null,
      author: lockedAuthor?.name || selectedAuthor?.name || author,
      embedVideo,
      embedVideoPosition
    };

    // Handle FAQs from form
    let faqQuestions = request.body.faqQuestions;
    let faqAnswers = request.body.faqAnswers;
    // Normalize to arrays
    if (typeof faqQuestions === 'string') faqQuestions = [faqQuestions];
    if (typeof faqAnswers === 'string') faqAnswers = [faqAnswers];
    if (Array.isArray(faqQuestions) && Array.isArray(faqAnswers)) {
      // Pair up questions and answers, ignore empty ones
      updateData.faqs = faqQuestions.map((q, i) => {
        const a = faqAnswers[i] || '';
        if (q.trim() || a.trim()) {
          return { question: q.trim(), answer: a.trim() };
        }
        return null;
      }).filter(Boolean);
    } else {
      updateData.faqs = [];
    }

    updateData.sources = buildArticleSources(
      request.body.sourceTitles,
      request.body.sourceUrls
    );

    const existingArticle = await articleModel.getArticleById(articleId);
    let currentImages = existingArticle.images || [];

    if (existingImageKeys) {
      const keys = Array.isArray(existingImageKeys) ? existingImageKeys : [existingImageKeys];
      const alts = Array.isArray(existingImageAlts) ? existingImageAlts : [existingImageAlts];

      currentImages = currentImages.map(img => {
        const index = keys.indexOf(img.key);
        if (index !== -1) {
          return { ...img.toObject(), alt: alts[index] };
        }
        return img;
      });
    }

    let newImages = [];
    if (request.files && request.files.length > 0) {
      const newAltTexts = request.body.alt 
        ? (Array.isArray(request.body.alt) ? request.body.alt : [request.body.alt]) 
        : [];

      newImages = await Promise.all(request.files.map(async (file, index) => {
        // Sanitize slug: remove spaces and special characters
        const projectNameSlug = title.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const fileName = `${projectNameSlug}-${Date.now()}-${index}.webp`;

        const buffer = await sharp(file.buffer)
          .resize(1200, null, { withoutEnlargement: true }) 
          .webp({ quality: 80 }) 
          .toBuffer();

        await s3.send(new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileName,
          Body: buffer,
          ContentType: "image/webp",
        }));

        return {
          url: `${process.env.ARTICLE_IMAGE_BASE}/${encodeURIComponent(fileName)}`,
          key: fileName,
          alt: newAltTexts[index] || ""
        };
      }));
    }

    updateData.images = [...currentImages, ...newImages];
    updateData.translations = {
      ar: await translateArticleToArabic(updateData)
    };

    const result = await articleModel.editArticlebyId(articleId, updateData);

    if (result) {
      const updatedArticle = await articleModel.getArticleById(articleId);
      queueArticleIndexNow(updatedArticle, "update");
      return response.redirect("/admin/article");
    }

    return response.render("article/article-list", { err: "Error updating article" });
    
  } catch (error) {
    console.error("Error editing article with Sharp:", error);
    return response.render("article/article-list", { err: "Unexpected error updating article" });
  }
};

// Delete an image from an article
const deleteImage = async (request, response) => {
  try {
    const { articleId, imageKey } = request.body;

    if (!articleId || !imageKey) {
      return response.status(400).json({ error: "Article ID and image key are required" });
    }

    const article = await articleModel.getArticleById(articleId);
    
    if (!article) {
      return response.status(404).json({ error: "Article not found" });
    }


    // Delete image from R2
    try {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: imageKey,
        })
      );
    } catch (deleteErr) {
      console.error("R2 image deletion error:", deleteErr);
      // Continue with DB update even if image deletion fails
    }

    const updatedImages = article.images.filter(img => img.key !== imageKey);

    const result = await articleModel.editArticlebyId(articleId, {
      images: updatedImages
    });

    if (result) {
      return response.json({ 
        success: true, 
        message: "Image deleted successfully"
      });
    }

    return response.status(500).json({ error: "Failed to delete image" });

  } catch (error) {
    console.error("Error deleting image:", error);
    return response.status(500).json({ error: "Server error deleting image" });
  }
};

// Delete a comment from article view (admin only)
const deleteCommentFromArticle = async (request, response) => {
  const { commentId, articleId } = request.query;
  
  try {
    await commentModel.deleteComment(commentId);
    // Redirect back to the article view
    response.redirect(`/admin/article/view?articleId=${articleId}`);
  } catch (error) {
    console.error("Error deleting comment:", error);
    response.redirect(`/admin/article/view?articleId=${articleId}`);
  }
};

export { upload };
export default {
  getAllArticles,
  viewArticle,
  addArticleForm,
  addNewArticle,
  editArticleForm,
  editArticle,
  deleteArticle,
  deleteImage,
  deleteCommentFromArticle,
  getArticlesApiResponse,
  getArticleByIdApiResponse,
  getArticleBySlugApiResponse,
  getRssFeed,
  getAtomFeed,
  likeArticleApi,
  unlikeArticleApi,
  getDashboardArticleStats,
  getArticlesByDateApi
};
