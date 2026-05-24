import { useEffect } from "react";
import {
  BRAND_DESCRIPTION,
  BRAND_LOGO_PATH,
  BRAND_NAME,
  BRAND_TAGLINE,
  BRAND_SITE_URL,
  toAbsoluteUrl,
} from "@/lib/brand";

const SITE_NAME = BRAND_NAME;
const DEFAULT_TITLE = `${BRAND_NAME} - ${BRAND_TAGLINE}`;
const DEFAULT_DESCRIPTION = BRAND_DESCRIPTION;

export interface SeoConfig {
  title?: string;
  description?: string;
  keywords?: string[] | string;
  image?: string;
  imageAlt?: string;
  canonical?: string;
  type?: string;
  noIndex?: boolean;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const upsertMeta = (attr: "name" | "property", key: string, content?: string) => {
  let meta = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!content) {
    if (meta) meta.remove();
    return;
  }
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attr, key);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
};

const upsertLink = (rel: string, href?: string) => {
  let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!href) {
    if (link) link.remove();
    return;
  }
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", rel);
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
};

const upsertJsonLd = (id: string, data?: SeoConfig["structuredData"]) => {
  if (typeof document === "undefined") return;
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (!data) {
    if (existing) existing.remove();
    return;
  }

  const script = existing ?? document.createElement("script");
  script.id = id;
  script.type = "application/ld+json";
  script.text = JSON.stringify(data);

  if (!existing) {
    document.head.appendChild(script);
  }
};

const resolveAbsoluteUrl = (value?: string) => {
  if (!value) return undefined;
  return /^https?:\/\//i.test(value) ? value : toAbsoluteUrl(value);
};

const normalizeCanonicalPath = (value?: string) => {
  if (!value) return undefined;
  const absoluteUrl = resolveAbsoluteUrl(value);
  if (!absoluteUrl) return undefined;

  try {
    const url = new URL(absoluteUrl);
    url.hash = "";
    return url.toString();
  } catch {
    return absoluteUrl;
  }
};

export const useSeo = ({
  title,
  description,
  keywords,
  image,
  imageAlt,
  canonical,
  type = "website",
  noIndex = false,
  structuredData,
}: SeoConfig) => {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const normalizedTitle = title?.trim();
    const shouldAppendSiteName =
      normalizedTitle &&
      !normalizedTitle.toLowerCase().includes(SITE_NAME.toLowerCase());

    const resolvedTitle = normalizedTitle
      ? shouldAppendSiteName
        ? `${normalizedTitle} | ${SITE_NAME}`
        : normalizedTitle
      : DEFAULT_TITLE;

    const resolvedDescription = description || DEFAULT_DESCRIPTION;
    const resolvedKeywords = Array.isArray(keywords) ? keywords.join(", ") : keywords;
    const resolvedCanonical = normalizeCanonicalPath(canonical);
    const currentPath =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "";
    const resolvedUrl = normalizeCanonicalPath(
      resolvedCanonical || (currentPath ? `${BRAND_SITE_URL}${currentPath}` : BRAND_SITE_URL),
    );
    const resolvedImage =
      resolveAbsoluteUrl(image) ||
      toAbsoluteUrl(BRAND_LOGO_PATH);
    const resolvedImageAlt = imageAlt || `${SITE_NAME} logo`;

    document.title = resolvedTitle;
    upsertMeta("name", "description", resolvedDescription);
    upsertMeta("name", "keywords", resolvedKeywords);
    upsertMeta(
      "name",
      "robots",
      noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large",
    );
    upsertMeta("name", "author", SITE_NAME);

    upsertLink("canonical", resolvedUrl);

    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:locale", "en_US");
    upsertMeta("property", "og:title", resolvedTitle);
    upsertMeta("property", "og:description", resolvedDescription);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:url", resolvedUrl);
    upsertMeta("property", "og:image", resolvedImage);
    upsertMeta("property", "og:image:alt", resolvedImageAlt);

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", resolvedTitle);
    upsertMeta("name", "twitter:description", resolvedDescription);
    upsertMeta("name", "twitter:image", resolvedImage);
    upsertMeta("name", "twitter:image:alt", resolvedImageAlt);

    upsertJsonLd("seo-structured-data", structuredData);
  }, [title, description, keywords, image, imageAlt, canonical, type, noIndex, structuredData]);
};

