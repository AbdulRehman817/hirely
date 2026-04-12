import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  databases,
  DATABASE_ID,
  COLLECTIONS,
  ID,
  Query,
  ensureAnonymousSession,
} from "@/lib/appwrite";
import { useAuth } from "@/contexts/AuthContext";
import { Permission, Role } from "appwrite";
import {
  COMPANIES_QUERY_KEY,
  COMPANIES_STALE_TIME,
  Company,
  fetchCompanies,
} from "@/hooks/useCompanies";
import { normalizeJobType, parseJobType } from "../lib/jobType";
const jobViewsEndpoint = import.meta.env.VITE_JOB_VIEWS_ENDPOINT;
const JOB_OWNER_FIELD_CANDIDATES = ["user_id", "userId", "userid"] as const;

const mergeJobsWithCompanies = (jobs: any[], companies?: Company[] | null) => {
  if (!companies?.length) {
    return jobs.map((job) => parseJobData(job));
  }

  const companiesById = new Map(companies.map((company) => [company.$id, company]));

  return jobs.map((job) => {
    const parsedJob = parseJobData(job);
    const company = job.company_id ? companiesById.get(job.company_id) : undefined;

    return {
      ...parsedJob,
      companies: company
        ? {
            $id: company.$id,
            name: company.name,
            logo_url: company.logo_url,
            location: company.location,
            email: company.email ?? null,
          }
        : undefined,
    };
  });
};

const parseStringArrayField = (value: unknown): string[] | null => {
  if (!value) return null;
  if (Array.isArray(value)) return value as string[];
  if (typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.warn("Invalid JSON stored for job field:", value, error);
    return null;
  }
};




const parseFirstArrayLikeField = (sources: unknown[]): string[] | null => {
  for (const source of sources) {
    const parsed = parseArrayField(source);
    if (parsed && parsed.length > 0) return parsed;
  }
  return null;
};


// Helper function to parse JSON strings stored in Appwrite
const parseArrayField = (value: unknown): string[] | null => {
  if (!value) return null;

  const normalize = (items: unknown[]): string[] | null => {
    const cleaned = items
     .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);

    return cleaned.length > 0 ? cleaned : null;
  };

  if (Array.isArray(value)) {
    return normalize(value);
  }

   if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return normalize(parsed);
      }
    } catch {
      // Fall back to delimiter-based parsing for legacy/plain-text formats.
    }

   const splitValues = raw.includes("\n")
      ? raw.split(/\r?\n/)
    : raw.split(",");

    return normalize(splitValues);
  }

  return null;
};

const parseJobData = (job: any): Job => ({
  ...job,
   type: normalizeJobType(job.type),
  requirements: parseFirstArrayLikeField([
    job.requirements,
    job.requirement,
    job.job_requirements,
    job.jobRequirements,
  ]),
  responsibilities: parseFirstArrayLikeField([
    job.responsibilities,
    job.responsibility,
    job.job_responsibilities,
    job.jobResponsibilities,
  ]),
  benefits: parseFirstArrayLikeField([
    job.benefits,
    job.benefit,
    job.job_benefits,
    job.jobBenefits,
  ]),
  skills_required: parseFirstArrayLikeField([
    job.skills_required,
    job.skillsRequired,
    job.tags,
    job.tag_list,
    job.tagList,
  ]),
});


const incrementViewsViaEndpoint = async (id: string): Promise<number | null> => {
  if (!jobViewsEndpoint) {
    return null;
  }

  const response = await fetch(jobViewsEndpoint, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ jobId: id }),
  });

  if (!response.ok) {
    throw new Error(`Views endpoint failed with status ${response.status}`);
  }

  const payload = (await response.json().catch(() => null)) as {
    view_count?: number;
    views?: number;
    data?: { view_count?: number; views?: number };
  } | null;

  const endpointViews =
    payload?.view_count ??
    payload?.views ??
    payload?.data?.view_count ??
    payload?.data?.views;

  return typeof endpointViews === "number" ? endpointViews : null;
};




const normalizeJobStatus = (value: unknown): string => {
  if (typeof value !== "string") return "active";
  return value.trim().toLowerCase();
};

const isPublicJobStatus = (value: unknown) => {
  const status = normalizeJobStatus(value);
  return status === "active" || status === "open" || status === "published";
};

const isUnauthorizedError = (error: any) => {
  const code = Number(error?.code);
  const message = String(error?.message || "").toLowerCase();
  const type = String(error?.type || "").toLowerCase();

  return (
    code === 401 ||
    message.includes("isbignumber is not a function") ||
    message.includes("unauthorized") ||
    message.includes("missing scope") ||
    type.includes("unauthorized")
  );
};

const isNotFoundError = (error: any) => {
  const code = Number(error?.code);
  const message = String(error?.message || "").toLowerCase();
  const type = String(error?.type || "").toLowerCase();

  return (
    code === 404 ||
    message.includes("could not be found") ||
    message.includes("document with the requested id") ||
    message.includes("not found") ||
    type.includes("not_found")
  );
};

const shouldRetryWithAnonymousSession = (error: any) =>
  isUnauthorizedError(error) || isNotFoundError(error);

const extractUnknownAttribute = (error: any) => {
  const code = Number(error?.code || 0);
  const message = String(error?.message || "");

  if (code !== 400 || !message) {
    return null;
  }

  const match =
    message.match(/unknown attribute[:\s"'`]+([\w$-]+)/i) ||
    message.match(/attribute[:\s"'`]+([\w$-]+).*unknown/i) ||
    message.match(/invalid document structure:.*?([\w$-]+).*unknown/i);

  return match?.[1] || null;
};

const guestAccessGuidanceError = (error: any) => {
  const guidance = new Error(
  "Guest access is blocked. In Appwrite, enable Anonymous Sessions and give Jobs read permission to Role.any() or Role.users() (including existing job documents).",
  ) as Error & { code?: number; cause?: unknown };
  guidance.code = Number(error?.code) || 401;
  guidance.cause = error;
  return guidance;
};




export interface Job {
    view_count?: number | null;
  $id: string;
  company_id: string;
  apply_link?: string | null;
  apply_url?: string | null;
  application_url?: string | null;
  user_id: string;
  title: string;
  description: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  currency: "USD" | "PKR" | null;
  type: "full-time" | "part-time" | "internship" | "remote" | "contract";
  experience_level: string | null;
  category: string | null;
  benefits: string[] | null;
  requirements: string[] | null;
  responsibilities: string[] | null;
  skills_required: string[] | null;
  featured: boolean;
  status: "active" | "closed" | "draft";
  posted_date: string;
  company: string | null;
  expiry_date: string | null;
  $createdAt: string;
  $updatedAt: string;
  companies?: {
    $id: string;
    name: string;
    logo_url: string | null;
    location: string | null;
    email?: string | null;
  };
}

const JOBS_BATCH_SIZE = 100;
const JOBS_STALE_TIME = 2 * 60 * 1000;
const JOBS_GC_TIME = 15 * 60 * 1000;
const JOB_QUERY_STALE_TIME = 60 * 1000;

const buildJobsQueryKey = (filters?: {
  type?: string;
  location?: string;
  search?: string;
}) =>
  [
    "jobs",
    filters?.type || "",
    filters?.location || "",
    filters?.search || "",
  ] as const;

const loadCompaniesForJobs = async (queryClient: ReturnType<typeof useQueryClient>) => {
  try {
    return await queryClient.ensureQueryData({
      queryKey: COMPANIES_QUERY_KEY,
      queryFn: fetchCompanies,
      staleTime: COMPANIES_STALE_TIME,
    });
  } catch (error) {
    console.warn(
      "Unable to load company data for jobs. Falling back to job-only data.",
      error
    );
    return null;
  }
};

const fetchAllJobDocuments = async () => {
  const allJobs: any[] = [];
  let offset = 0;

  while (true) {
    const { documents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.JOBS,
      [Query.limit(JOBS_BATCH_SIZE), Query.offset(offset)],
    );

    allJobs.push(...documents);

    if (documents.length < JOBS_BATCH_SIZE) {
      break;
    }

    offset += JOBS_BATCH_SIZE;
  }

  return allJobs;
};

const fetchPublicJobs = async (
  filters?: {
  type?: string;
  location?: string;
  search?: string;
},
  companies?: Company[] | null
) => {
  const jobs = await fetchAllJobDocuments();

  const normalizedTypeFilter = parseJobType(filters?.type);
  const normalizedLocationFilter = String(filters?.location || "")
    .trim()
    .toLowerCase();
  const normalizedSearchFilter = String(filters?.search || "")
    .trim()
    .toLowerCase();

  const filteredJobs = jobs
    .filter((job) => isPublicJobStatus(job.status))
    .filter(
      (job) =>
        !normalizedTypeFilter ||
        normalizeJobType(job.type) === normalizedTypeFilter,
    )
    .filter(
      (job) =>
        !normalizedLocationFilter ||
        String(job.location || "")
          .toLowerCase()
          .includes(normalizedLocationFilter),
    )
    .filter((job) => {
      if (!normalizedSearchFilter) return true;
      const searchableText =
        `${job.title || ""} ${job.description || ""}`.toLowerCase();
      return searchableText.includes(normalizedSearchFilter);
    })
    .sort((a, b) => {
      const bDate = new Date(b.posted_date || b.$createdAt || 0).getTime();
      const aDate = new Date(a.posted_date || a.$createdAt || 0).getTime();
      return bDate - aDate;
    });

  return mergeJobsWithCompanies(filteredJobs, companies);
};

const fetchJobById = async (id: string, companies?: Company[] | null) => {
  const job = await databases.getDocument(DATABASE_ID, COLLECTIONS.JOBS, id);
  return mergeJobsWithCompanies([job], companies)[0];
};

const createJobDocumentWithFallbacks = async (
  createDocument: (documentPayload: Record<string, unknown>) => Promise<any>,
  payload: Record<string, unknown>
) => {
  let currentPayload = { ...payload };
  const removedAttributes = new Set<string>();

  while (true) {
    try {
      return await createDocument(currentPayload);
    } catch (error: any) {
      const unknownAttribute = extractUnknownAttribute(error);
      if (!unknownAttribute || removedAttributes.has(unknownAttribute)) {
        throw error;
      }

      removedAttributes.add(unknownAttribute);

      const currentValue = currentPayload[unknownAttribute];
      if (unknownAttribute === "apply_link" && typeof currentValue === "string" && currentValue.trim()) {
        const { apply_link: _ignoredApplyLink, ...withoutApplyLink } = currentPayload as Record<string, unknown>;
        currentPayload = {
          ...withoutApplyLink,
          application_url: currentValue,
        };
        continue;
      }

      if (unknownAttribute === "application_url" && typeof currentValue === "string" && currentValue.trim()) {
        const { application_url: _ignoredApplicationUrl, ...withoutApplicationUrl } =
          currentPayload as Record<string, unknown>;
        currentPayload = {
          ...withoutApplicationUrl,
          apply_url: currentValue,
        };
        continue;
      }

      const { [unknownAttribute]: _ignoredUnknownAttribute, ...withoutUnknownAttribute } =
        currentPayload as Record<string, unknown>;
      currentPayload = withoutUnknownAttribute;
    }
  }
};

export const useJobs = (
  filters?: { type?: string; location?: string; search?: string },
  options?: { enabled?: boolean }
) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: buildJobsQueryKey(filters),
    queryFn: async () => {
      const loadJobs = async () => {
        const companies = await loadCompaniesForJobs(queryClient);
        return fetchPublicJobs(filters, companies);
      };

      try {
        const jobsWithCompanies = await loadJobs();

        if (user || jobsWithCompanies.length > 0) {
          return jobsWithCompanies;
        }

        try {
          await ensureAnonymousSession();
          const retryJobs = await loadJobs();
          return retryJobs;
        } catch (retryError: any) {
          console.error("useJobs: Empty-result retry failed:", retryError);
          throw guestAccessGuidanceError(retryError);
        }
      } catch (error: any) {
        if (!isUnauthorizedError(error)) {
          console.error("useJobs: Error fetching jobs:", error);
          throw error;
        }

        console.warn("useJobs: Guest access unauthorized. Trying anonymous session fallback.");
        try {
          await ensureAnonymousSession();
          const jobsWithCompanies = await loadJobs();
          return jobsWithCompanies;
        } catch (retryError: any) {
          console.error("useJobs: Guest session fallback failed:", retryError);
          throw guestAccessGuidanceError(retryError);
        }
      }
    },
    enabled: options?.enabled ?? true,
    staleTime: JOBS_STALE_TIME,
    gcTime: JOBS_GC_TIME,
    refetchOnWindowFocus: false,
  });
};

export const useJob = (id: string) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const loadJob = async () => {
        const companies = await loadCompaniesForJobs(queryClient);
        return fetchJobById(id, companies);
      };

      try {
        const job = await loadJob();
        return job;
      } catch (error: any) {
        if (!shouldRetryWithAnonymousSession(error)) {
          console.error("useJob: Error fetching job:", error);
          throw error;
        }

        console.warn("useJob: Initial guest fetch failed. Trying anonymous session fallback.");
        try {
          await ensureAnonymousSession();
          const job = await loadJob();
          return job;
        } catch (retryError: any) {
          console.error("useJob: Guest session fallback failed:", retryError);
          if (isNotFoundError(retryError)) {
            throw retryError;
          }
          throw guestAccessGuidanceError(retryError);
        }
      }
    },
    enabled: !!id,
    staleTime: JOB_QUERY_STALE_TIME,
    gcTime: JOBS_GC_TIME,
    refetchOnWindowFocus: false,
  });
};

export const useIncrementJobViews = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, currentViews = 0 }: { id: string; currentViews?: number }) => {
      const nextViews = Math.max(0, Number(currentViews) || 0) + 1;

      try {
        const updated = await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.JOBS,
          id,
          { view_count: nextViews },
        );

        return parseJobData(updated);
      } catch (error: any) {
        const message = String(error?.message || "").toLowerCase();
        const code = Number(error?.code || 0);
        const unsupportedField =
          code === 400 &&
          (message.includes("unknown") || message.includes("attribute") || message.includes("view_count"));

        if (unsupportedField || isUnauthorizedError(error)) {
          return { view_count: Math.max(0, Number(currentViews) || 0) };
        }

        throw error;
      }
    },
    onSuccess: (_updated, variables) => {
      queryClient.invalidateQueries({ queryKey: ["job", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["my-jobs"] });
    },
  });
};




export const useMyJobs = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["my-jobs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
      const fetchJobsForField = async (field: string) => {
          const results: any[] = [];
          let offset = 0;

          while (true) {
            const { documents } = await databases.listDocuments(DATABASE_ID, COLLECTIONS.JOBS, [
              Query.equal(field, user.id),
              Query.limit(JOBS_BATCH_SIZE),
              Query.offset(offset),
            ]);

            results.push(...documents);
            if (documents.length < JOBS_BATCH_SIZE) break;
            offset += JOBS_BATCH_SIZE;
          }

          return results;
        };

        let ownedJobs: any[] = [];
        for (const ownerField of JOB_OWNER_FIELD_CANDIDATES) {
          try {
            const results = await fetchJobsForField(ownerField);
            if (results.length > 0) {
              ownedJobs = results;
              break;
            }
          } catch (error: any) {
            const code = Number(error?.code || 0);
            if (code >= 400 && code < 500) {
              // Some environments lack indexes/attributes for legacy field names.
              // Ignore query-level failures and fall back to full scan below.
              continue;
            }
            throw error;
          }
        }

        if (ownedJobs.length === 0) {
          const allJobs = await fetchAllJobDocuments();
          ownedJobs = allJobs.filter((job) =>
            JOB_OWNER_FIELD_CANDIDATES.some((field) => String((job as any)[field] || "").trim() === user.id)
          );
        }

        const myJobs = ownedJobs.sort(
          (a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
        );

        const companies = await loadCompaniesForJobs(queryClient);
        const jobsWithCompanies = mergeJobsWithCompanies(myJobs, companies);

        return jobsWithCompanies;
      } catch (error) {
        console.error('Error fetching my jobs:', error);
        throw error;
      }
    },
    enabled: !!user,
    staleTime: JOB_QUERY_STALE_TIME,
    gcTime: JOBS_GC_TIME,
    refetchOnWindowFocus: false,
  });
};

export const useCreateJob = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (job: Omit<Job, "$id" | "user_id" | "$createdAt" | "$updatedAt" | "posted_date" | "featured" | "companies">) => {
      if (!user) throw new Error("You must be signed in to post a job.");

      const payload = {
        ...job,
        user_id: user.id,
        posted_date: new Date().toISOString(),
        featured: false,
      };

      try {
        const createDocument = (documentPayload: Record<string, unknown>) =>
          databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.JOBS,
            ID.unique(),
            documentPayload,
            [
              Permission.read(Role.any()),
              Permission.update(Role.user(user.id)),
              Permission.delete(Role.user(user.id)),
            ]
          );

        const document = await createJobDocumentWithFallbacks(
          createDocument,
          payload as Record<string, unknown>
        );

        // Fetch company data
        if (!document.company_id) {
          return {
            ...document,
            companies: undefined,
          };
        }

        const { documents: companies } = await databases.listDocuments(DATABASE_ID, COLLECTIONS.COMPANIES);
        const company = companies.find((item) => item.$id === document.company_id);

        return {
          ...document,
          companies: company ? {
            id: company.$id,
            name: company.name,
            logo_url: company.logo_url,
            location: company.location,
            email: company.email ?? null,
          } : undefined
        };
      } catch (error) {
        console.error('Error creating job:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["my-jobs"] });
    },
  });
};

export const useUpdateJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Job> & { id: string }) => {
      try {
        const document = await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.JOBS,
          id,
          updates
        );

        // Fetch company data
        if (!document.company_id) {
          return {
            ...document,
            companies: undefined,
          };
        }

        const { documents: companies } = await databases.listDocuments(DATABASE_ID, COLLECTIONS.COMPANIES);
        const company = companies.find((item) => item.$id === document.company_id);

        return {
          ...document,
          companies: company ? {
            id: company.$id,
            name: company.name,
            logo_url: company.logo_url,
            location: company.location,
            email: company.email ?? null,
          } : undefined
        };
      } catch (error) {
        console.error('Error updating job:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["my-jobs"] });
    },
  });
};

export const useDeleteJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.JOBS, id);
      } catch (error) {
        console.error('Error deleting job:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["my-jobs"] });
    },
  });
};
