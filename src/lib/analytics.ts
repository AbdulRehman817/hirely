type AnalyticsParams = Record<string, string | number | boolean | undefined | null>;

declare global {
  interface Window {
    gtag?: (command: "event", eventName: string, params?: AnalyticsParams) => void;
  }
}

export const trackEvent = (eventName: string, params: AnalyticsParams = {}) => {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, params);
};

export const trackJobSearch = (params: {
  searchTerm?: string;
  location?: string;
  source: "home" | "find_jobs";
}) => {
  trackEvent("job_search", {
    search_term: params.searchTerm?.trim() || undefined,
    location: params.location?.trim() || undefined,
    source: params.source,
  });
};

export const trackJobEngagement = (
  action: "share" | "save" | "apply_start" | "apply_submit" | "outbound_apply",
  params: {
    jobId?: string;
    jobTitle?: string;
    company?: string;
  } = {},
) => {
  trackEvent(`job_${action}`, {
    job_id: params.jobId,
    job_title: params.jobTitle,
    company: params.company,
  });
};
