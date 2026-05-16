import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Permission, Role } from "appwrite";
import {
  BUCKETS,
  COLLECTIONS,
  DATABASE_ID,
  ID,
  Query,
  databases,
  storage,
} from "@/lib/appwrite";
import { useAuth } from "@/contexts/AuthContext";
import { sendApplicationReceivedEmail, sendApplicationSubmittedEmail } from "@/services/emailService";

export interface JobApplication {
  $id: string;
  job_id: string;
  user_id: string;
  cover_letter: string | null;
  resume_url: string | null;
  status: "pending" | "reviewed" | "shortlisted" | "rejected" | "hired";
  applied_at: string;
  $createdAt?: string;
  $updatedAt: string;
  jobs?: {
    id: string;
    title: string;
    location: string;
    type: string;
    salary_min: number | null;
    salary_max: number | null;
    companies?: {
      id: string;
      name: string;
      logo_url: string | null;
    };
  };
  profiles?: {
    $id: string;
    email?: string | null;
    full_name: string;
    avatar_url: string | null;
    title: string | null;
    location: string | null;
    skills: string[] | null;
    experience_years: number | null;
    phone: string | null;
    linkedin_url: string | null;
    github_url: string | null;
    website: string | null;
    resume_url?: string | null;
  };
}

export interface ApplicationStats {
  total: number;
  pending: number;
  reviewed: number;
  shortlisted: number;
  rejected: number;
  hired: number;
}

const APPLICATION_BATCH_SIZE = 100;
const USER_FIELD_CANDIDATES = ["user_id", "userId", "userid"] as const;
const JOB_FIELD_CANDIDATES = ["job_id", "jobId", "jobid"] as const;
const COMPANY_FIELD_CANDIDATES = ["company_id", "companyId", "companyid"] as const;

const isValidAppwriteId = (id: string | null | undefined): boolean => {
  if (!id) return false;
  const trimmed = String(id || "").trim();
  return trimmed.length > 0 && /^[a-zA-Z0-9_-]+$/.test(trimmed);
};

const uniqueStrings = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));

const pickFirstString = (source: Record<string, any>, keys: readonly string[]) =>
  uniqueStrings(keys.map((key) => source?.[key]))[0] || "";

const getApplicationUserId = (application: Record<string, any>) =>
  pickFirstString(application, USER_FIELD_CANDIDATES);

const getApplicationJobId = (application: Record<string, any>) =>
  pickFirstString(application, JOB_FIELD_CANDIDATES);

const getJobOwnerId = (job: Record<string, any>) => pickFirstString(job, USER_FIELD_CANDIDATES);

const getJobCompanyId = (job: Record<string, any>) => pickFirstString(job, COMPANY_FIELD_CANDIDATES);

const sortApplicationsByDate = (applications: JobApplication[]) =>
  [...applications].sort((left, right) => {
    const rightDate = new Date(right.applied_at || right.$createdAt || 0).getTime();
    const leftDate = new Date(left.applied_at || left.$createdAt || 0).getTime();
    return rightDate - leftDate;
  });

const mergePermissions = (...groups: Array<string[] | undefined>) =>
  Array.from(new Set(groups.flatMap((group) => group || []).filter(Boolean)));

const buildNotificationPermissions = (userId: string) => {
  return [Permission.read(Role.users())];
};

const buildApplicationPermissions = (candidateUserId: string, recruiterUserId: string) => {
  const permissions: string[] = [];
  permissions.push(Permission.read(Role.users()));
  if (isValidAppwriteId(candidateUserId)) {
    try {
      const candidateId = String(candidateUserId).trim();
      permissions.push(Permission.read(Role.user(candidateId)));
      permissions.push(Permission.update(Role.user(candidateId)));
      permissions.push(Permission.delete(Role.user(candidateId)));
    } catch (e) {
      console.warn("Failed to add candidate permissions:", e);
    }
  }
  console.log("Application permissions:", permissions);
  return permissions;
};

const buildProfilePermissions = (candidateUserId: string, recruiterUserId?: string | null) => {
  const permissions: string[] = [];
  permissions.push(Permission.read(Role.users()));
  if (isValidAppwriteId(candidateUserId)) {
    try {
      const candidateId = String(candidateUserId).trim();
      permissions.push(Permission.read(Role.user(candidateId)));
      permissions.push(Permission.update(Role.user(candidateId)));
      permissions.push(Permission.delete(Role.user(candidateId)));
    } catch (e) {
      console.warn("Failed to add candidate profile permissions:", e);
    }
  }
  return permissions;
};

const buildResumePermissions = (candidateUserId: string, recruiterUserId?: string | null) => {
  const permissions: string[] = [];
  permissions.push(Permission.read(Role.users()));
  if (isValidAppwriteId(candidateUserId)) {
    try {
      const candidateId = String(candidateUserId).trim();
      permissions.push(Permission.read(Role.user(candidateId)));
      permissions.push(Permission.update(Role.user(candidateId)));
      permissions.push(Permission.delete(Role.user(candidateId)));
    } catch (e) {
      console.warn("Failed to add candidate resume permissions:", e);
    }
  }
  return permissions;
};

const fetchAllAccessibleApplications = async (): Promise<JobApplication[]> => {
  const results: JobApplication[] = [];
  let offset = 0;
  while (true) {
    const { documents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.JOB_APPLICATIONS,
      [Query.limit(APPLICATION_BATCH_SIZE), Query.offset(offset)]
    );
    results.push(...(documents as unknown as JobApplication[]));
    if (documents.length < APPLICATION_BATCH_SIZE) break;
    offset += APPLICATION_BATCH_SIZE;
  }
  return results;
};

const fetchAllAccessibleProfiles = async () => {
  const results: any[] = [];
  let offset = 0;
  while (true) {
    const { documents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROFILES,
      [Query.limit(APPLICATION_BATCH_SIZE), Query.offset(offset)]
    );
    results.push(...documents);
    if (documents.length < APPLICATION_BATCH_SIZE) break;
    offset += APPLICATION_BATCH_SIZE;
  }
  return results;
};

const fetchProfileDocumentByUserId = async (userId: string) => {
  if (!userId) return null;
  try {
    const { documents } = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
      Query.equal("user_id", userId),
    ]);
    return documents[0] ?? null;
  } catch {
    const documents = await fetchAllAccessibleProfiles();
    return (
      documents.find((document) =>
        USER_FIELD_CANDIDATES.some((field) => String((document as any)?.[field] || "").trim() === userId)
      ) ?? null
    );
  }
};

const fetchCompanyDocumentById = async (companyId: string) => {
  if (!companyId) return null;
  try {
    return await databases.getDocument(DATABASE_ID, COLLECTIONS.COMPANIES, companyId);
  } catch {
    return null;
  }
};

const getCompanyNameForJob = async (job: Record<string, any>) => {
  const companyId = getJobCompanyId(job);
  if (!companyId) return "your company";
  const company = await fetchCompanyDocumentById(companyId);
  return company?.name || "your company";
};

// ✅ FIXED: Query by user_id field instead of document ID
const getRecruiterProfile = async (recruiterId: string) => {
  if (!recruiterId) return null;

  try {
    // First try: query by user_id field
    const { documents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROFILES,
      [Query.equal("user_id", recruiterId), Query.limit(1)]
    );

    if (documents.length > 0) {
      console.log("✅ Recruiter profile found:", documents[0]);
      console.log("✅ Recruiter email:", documents[0]?.email);
      return documents[0];
    }

    // Second try: scan all profiles as fallback
    console.warn("Recruiter not found via query, trying full scan...");
    const allProfiles = await fetchAllAccessibleProfiles();
    const found = allProfiles.find((doc) =>
      USER_FIELD_CANDIDATES.some(
        (field) => String((doc as any)?.[field] || "").trim() === recruiterId
      )
    );

    if (found) {
      console.log("✅ Recruiter profile found via scan:", found);
      console.log("✅ Recruiter email:", found?.email);
    } else {
      console.warn("❌ Recruiter profile not found for ID:", recruiterId);
    }

    return found ?? null;
  } catch (error) {
    console.error("Error fetching recruiter profile:", error);
    return null;
  }
};

const hydrateApplicationWithJobData = async (
  application: JobApplication,
  jobCache: Map<string, any>,
  companyCache: Map<string, any>
): Promise<JobApplication> => {
  const jobId = getApplicationJobId(application);
  const applicantUserId = getApplicationUserId(application);
  if (!jobId) return application;

  try {
    let job = jobCache.get(jobId);
    if (!job) {
      job = await databases.getDocument(DATABASE_ID, COLLECTIONS.JOBS, jobId);
      jobCache.set(jobId, job);
    }

    const companyId = getJobCompanyId(job);
    let company = companyId ? companyCache.get(companyId) : null;
    if (companyId && !company) {
      company = await fetchCompanyDocumentById(companyId);
      if (company) companyCache.set(companyId, company);
    }

    return {
      ...application,
      user_id: applicantUserId || application.user_id,
      job_id: jobId,
      jobs: {
        id: job.$id,
        title: job.title,
        location: job.location,
        type: job.type,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        companies: company
          ? { id: company.$id, name: company.name, logo_url: company.logo_url || null }
          : undefined,
      },
    };
  } catch (error) {
    console.error("useMyApplications: Error hydrating job data for application:", application.$id, error);
    return application;
  }
};

const hydrateApplicationWithProfileData = async (
  application: JobApplication,
  profileCache: Map<string, any>
): Promise<JobApplication> => {
  const applicantUserId = getApplicationUserId(application);
  const jobId = getApplicationJobId(application);
  if (!applicantUserId) return application;

  try {
    let profileDocument = profileCache.get(applicantUserId);
    if (profileDocument === undefined) {
      profileDocument = await fetchProfileDocumentByUserId(applicantUserId);
      profileCache.set(applicantUserId, profileDocument || null);
    }

    if (!profileDocument) {
      return { ...application, job_id: jobId || application.job_id, user_id: applicantUserId };
    }

    return {
      ...application,
      job_id: jobId || application.job_id,
      user_id: applicantUserId,
      profiles: {
        $id: profileDocument.$id,
        email: profileDocument.email || null,
        full_name: profileDocument.full_name || "Applicant",
        avatar_url: profileDocument.avatar_url || null,
        title: profileDocument.title || null,
        location: profileDocument.location || null,
        skills: Array.isArray(profileDocument.skills) ? profileDocument.skills : null,
        experience_years: profileDocument.experience_years ?? null,
        phone: profileDocument.phone || null,
        linkedin_url: profileDocument.linkedin_url || null,
        github_url: profileDocument.github_url || null,
        website: profileDocument.website || null,
        resume_url: profileDocument.resume_url || null,
      },
    };
  } catch (error) {
    console.error("useJobApplications: Error hydrating applicant profile:", application.$id, error);
    return { ...application, job_id: jobId || application.job_id, user_id: applicantUserId };
  }
};

const buildApplicationStats = (applications: JobApplication[]): ApplicationStats => ({
  total: applications.length,
  pending: applications.filter((a) => a.status === "pending").length,
  reviewed: applications.filter((a) => a.status === "reviewed").length,
  shortlisted: applications.filter((a) => a.status === "shortlisted").length,
  rejected: applications.filter((a) => a.status === "rejected").length,
  hired: applications.filter((a) => a.status === "hired").length,
});

const grantRecruiterReadAccessToProfile = async (
  candidateUserId: string,
  recruiterUserId: string
) => {
  if (!candidateUserId || !recruiterUserId || candidateUserId === recruiterUserId) return;
  try {
    const profileDocument = await fetchProfileDocumentByUserId(candidateUserId);
    if (!profileDocument) return;
    const permissions = mergePermissions(
      profileDocument.$permissions,
      buildProfilePermissions(candidateUserId, recruiterUserId)
    );
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, profileDocument.$id, {}, permissions);
  } catch (error) {
    console.warn("Unable to grant recruiter read access to the applicant profile.", error);
  }
};

const grantRecruiterReadAccessToResume = async (
  candidateUserId: string,
  recruiterUserId: string,
  resumeFileId?: string | null
) => {
  const trimmedResumeFileId = String(resumeFileId || "").trim();
  if (
    !candidateUserId ||
    !recruiterUserId ||
    candidateUserId === recruiterUserId ||
    !trimmedResumeFileId ||
    trimmedResumeFileId.startsWith("http")
  ) return;

  try {
    const resumeFile = await storage.getFile(BUCKETS.RESUMES, trimmedResumeFileId);
    const permissions = mergePermissions(
      resumeFile.$permissions,
      buildResumePermissions(candidateUserId, recruiterUserId)
    );
    await storage.updateFile(BUCKETS.RESUMES, trimmedResumeFileId, resumeFile.name, permissions);
  } catch (error) {
    console.warn("Unable to grant recruiter read access to the applicant resume.", error);
  }
};

export const useMyApplications = () => {
  const { user } = useAuth();

  return useQuery<JobApplication[]>({
    queryKey: ["my-applications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const allApplications = await fetchAllAccessibleApplications();
        const myApplications = allApplications.filter(
          (application) => getApplicationUserId(application as Record<string, any>) === user.id
        );
        const companyCache = new Map<string, any>();
        const jobCache = new Map<string, any>();
        const hydratedApplications = await Promise.all(
          myApplications.map((application) =>
            hydrateApplicationWithJobData(application, jobCache, companyCache)
          )
        );
        return sortApplicationsByDate(hydratedApplications);
      } catch (error) {
        console.error("useMyApplications: Error fetching applications:", error);
        throw error;
      }
    },
    enabled: !!user,
  });
};

export const useMyApplicationStats = () => {
  const query = useMyApplications();
  return { ...query, data: buildApplicationStats(query.data || []) };
};

export const useJobApplications = (jobId?: string) => {
  const { user } = useAuth();

  return useQuery<JobApplication[]>({
    queryKey: ["job-applications", jobId],
    queryFn: async () => {
      if (!jobId || !user) return [];
      try {
        const allApplications = await fetchAllAccessibleApplications();
        const matchingApplications = allApplications.filter(
          (application) => getApplicationJobId(application as Record<string, any>) === jobId
        );
        const profileCache = new Map<string, any>();
        const hydratedApplications = await Promise.all(
          matchingApplications.map((application) =>
            hydrateApplicationWithProfileData(application, profileCache)
          )
        );
        return sortApplicationsByDate(hydratedApplications);
      } catch (error) {
        console.error("useJobApplications: Error fetching job applications:", error);
        throw error;
      }
    },
    enabled: !!jobId && !!user,
  });
};

export const useEmployerApplications = (jobIds?: string[]) => {
  const { user } = useAuth();

  return useQuery<JobApplication[]>({
    queryKey: ["employer-applications", user?.id, ...(jobIds || [])],
    queryFn: async () => {
      if (!user || !jobIds?.length) return [];
      try {
        const ownedJobIds = new Set(uniqueStrings(jobIds));
        const allApplications = await fetchAllAccessibleApplications();
        const matchingApplications = allApplications.filter((application) =>
          ownedJobIds.has(getApplicationJobId(application as Record<string, any>))
        );
        const profileCache = new Map<string, any>();
        const hydratedApplications = await Promise.all(
          matchingApplications.map((application) =>
            hydrateApplicationWithProfileData(application, profileCache)
          )
        );
        return sortApplicationsByDate(hydratedApplications);
      } catch (error) {
        console.error("useEmployerApplications: Error fetching employer applications:", error);
        throw error;
      }
    },
    enabled: !!user && !!jobIds?.length,
  });
};

export const useApplyForJob = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      jobId,
      coverLetter,
      resumeUrl,
    }: {
      jobId: string;
      coverLetter?: string;
      resumeUrl?: string;
    }) => {
      if (!user) throw new Error("You must be signed in to apply.");
      if (profile?.role === "employer") throw new Error("Recruiters cannot apply for jobs.");

      try {
        const job = await databases.getDocument(DATABASE_ID, COLLECTIONS.JOBS, jobId);
        const recruiterUserId = String(getJobOwnerId(job as Record<string, any>) || "").trim();

        console.log("Job found:", { jobId, recruiterUserId, fullJob: job });

        if (!recruiterUserId) {
          console.warn("No recruiter ID found for job");
        }

        if (String(job.status || "").toLowerCase() !== "active") {
          throw new Error("This job is no longer accepting applications.");
        }

        const allAccessibleApplications = await fetchAllAccessibleApplications();
        const alreadyApplied = allAccessibleApplications.some(
          (application) =>
            getApplicationUserId(application as Record<string, any>) === user.id &&
            getApplicationJobId(application as Record<string, any>) === jobId
        );

        if (alreadyApplied) throw new Error("You have already applied for this job.");

        const resolvedResumeUrl = resumeUrl || profile?.resume_url || null;
        const application = await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.JOB_APPLICATIONS,
          ID.unique(),
          {
            user_id: user.id,
            job_id: jobId,
            cover_letter: coverLetter || null,
            resume_url: resolvedResumeUrl,
            status: "pending",
            applied_at: new Date().toISOString(),
          },
          buildApplicationPermissions(user.id, recruiterUserId)
        );

        const applicantName = profile?.full_name || user.email || "A candidate";
        const companyName = await getCompanyNameForJob(job as Record<string, any>);

        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.NOTIFICATIONS,
          ID.unique(),
          {
            user_id: recruiterUserId,
            type: "application_received",
            title: "New application received",
            message: `${applicantName} applied for ${job.title} at ${companyName}.`,
            job_id: jobId,
            application_id: application.$id,
            is_read: false,
          },
          buildNotificationPermissions(recruiterUserId)
        );

        // ✅ Send recruiter email with full fallback chain
        (async () => {
          try {
            const recruiterProfile = await getRecruiterProfile(recruiterUserId);

            // Fallback chain: profile email → company email → nothing
            const recruiterEmail =
              recruiterProfile?.email ||
              (job as any)?.companies?.email ||
              null;

            const recruiterName = recruiterProfile?.full_name || "Recruiter";

            console.log("📧 Recruiter email to use:", recruiterEmail);
            console.log("📧 Recruiter profile:", recruiterProfile);

            if (recruiterEmail) {
              await sendApplicationReceivedEmail(
                recruiterEmail,
                recruiterName,
                applicantName,
                user.email || "N/A",
                job.title,
                companyName
              );
              console.log("✅ Recruiter notified at:", recruiterEmail);
            } else {
              console.warn("❌ No recruiter email found. Profile:", recruiterProfile, "Job:", job);
            }
          } catch (e) {
            console.error("Recruiter email failed:", e);
          }
        })();

        // ✅ Send candidate confirmation email
        sendApplicationSubmittedEmail(
          user.email || "",
          applicantName,
          job.title,
          companyName
        ).catch(console.error);

        await Promise.allSettled([
          grantRecruiterReadAccessToProfile(user.id, recruiterUserId),
          grantRecruiterReadAccessToResume(user.id, recruiterUserId, resolvedResumeUrl),
        ]);

        return application as JobApplication;
      } catch (error) {
        console.error("useApplyForJob: Error applying for job:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      queryClient.invalidateQueries({ queryKey: ["employer-applications"] });
      queryClient.invalidateQueries({ queryKey: ["has-applied"] });
    },
  });
};

export const useHasApplied = (jobId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["has-applied", jobId, user?.id],
    queryFn: async () => {
      if (!jobId || !user) return false;
      try {
        const allApplications = await fetchAllAccessibleApplications();
        return allApplications.some(
          (application) =>
            getApplicationUserId(application as Record<string, any>) === user.id &&
            getApplicationJobId(application as Record<string, any>) === jobId
        );
      } catch (error) {
        console.error("useHasApplied: Error checking application status:", error);
        return false;
      }
    },
    enabled: !!jobId && !!user,
  });
};

export const useUpdateApplicationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: JobApplication["status"] }) => {
      try {
        return await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.JOB_APPLICATIONS,
          id,
          { status }
        );
      } catch (error) {
        console.error("useUpdateApplicationStatus: Error updating application status:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      queryClient.invalidateQueries({ queryKey: ["employer-applications"] });
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
    },
  });
};