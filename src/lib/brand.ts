export const BRAND_NAME = "Hirelypk";
export const BRAND_TAGLINE = "Connecting Talent to Real Job Openings";
export const BRAND_DESCRIPTION =
  "Hirelypk connects job seekers with verified job opportunities and trusted employers.";
export const BRAND_LOGO_PATH = "/logo.png";

export const BRAND_CONTACT_EMAIL = "hirely.contact@gmail.com";
export const BRAND_LINKEDIN_URL = "https://www.linkedin.com/company/hirelypk";
export const BRAND_WHATSAPP_COMMUNITY_URL =
  "https://chat.whatsapp.com/BZ6TwCE0esh89aw3KAnGnx";

const SITE_URL_FALLBACK = "https://www.hirelypk.com";

export const BRAND_SITE_URL = (
  import.meta.env.VITE_SITE_URL || SITE_URL_FALLBACK
).replace(/\/+$/, "");

export const toAbsoluteUrl = (value: string) => {
  if (/^https?:\/\//i.test(value)) return value;
  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return `${BRAND_SITE_URL}${normalizedPath}`;
};
