import { useState, useEffect } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import {
  MapPin,
  DollarSign,
  Briefcase,
  Calendar,
  GraduationCap,
  Bookmark,
  BookmarkCheck,
  Share2,
  ArrowRight,
  Eye,
  Building2,
  Globe,
  Tag,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendApplicationReceivedEmail,  sendApplicationSubmittedEmail 
 } from "@/services/emailService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import Layout from "@/components/layout/Layout";
import PageLoader from "@/components/layout/PageLoader";
import JobCard from "@/components/jobs/JobCard";
import { useIncrementJobViews, useJob, useJobs } from "@/hooks/useJobs";
import { useApplyForJob, useHasApplied } from "@/hooks/useApplications";
import { useSaveJob, useUnsaveJob, useIsJobSaved } from "@/hooks/useSavedJobs";
import { useAuth } from "@/contexts/AuthContext";
import { useCandidateProfileCompletion } from "@/hooks/useProfileCompletion";
import { useToast } from "@/hooks/use-toast";
import { useSeo } from "@/hooks/useSeo";
import { jobTypes } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { normalizeJobType } from "@/lib/jobType";
import { dispatchFeedbackNudge } from "@/lib/feedbackPrompt";
import { cn } from "@/lib/utils";
import { COLLECTIONS, DATABASE_ID, databases, Query } from "@/lib/appwrite";
import { BRAND_SITE_URL } from "@/lib/brand";
import { trackJobEngagement } from "@/lib/analytics";

const TAG_LINE_REGEX = /\n?\s*Tags:\s*.+$/i;

const resolveApplyLink = (job: any): string | null => {
  if (!job) return null;
  const rawApplyLink = [
    job.apply_link, job.apply_url, job.application_url,
    job.applyLink, job.applicationUrl, job.applyURL,
  ].find((value) => typeof value === "string" && value.trim().length > 0) as string | undefined;
  if (!rawApplyLink) return null;
  return /^https?:\/\//i.test(rawApplyLink) ? rawApplyLink : `https://${rawApplyLink}`;
};

const stripTagsLineFromDescription = (description: string) =>
  description.replace(TAG_LINE_REGEX, "").trim();

const dedupeTags = (values: string[]): string[] => {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  values.forEach((value) => {
    const normalized = value.trim().replace(/^#+/, "");
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    cleaned.push(normalized);
  });
  return cleaned;
};

const extractHashtagTags = (description: string): string[] => {
  const matches = description.match(/#[A-Za-z0-9][A-Za-z0-9._-]*/g) || [];
  return dedupeTags(matches.map((tag) => tag.replace(/^#/, "")));
};

const isRecruiterPostedJob = (job: any): boolean => {
  if (!job) return false;
  const hasPosterId = typeof job.user_id === "string" && job.user_id.trim().length > 0;
  const hasCompanyId = typeof job.company_id === "string" && job.company_id.trim().length > 0;
  return hasPosterId && hasCompanyId;
};


const parseTagSource = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return dedupeTags(value.map((item) => String(item)));
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return dedupeTags(parsed.map((item) => String(item)));
    } catch {
      // Fall back to delimiter parsing when tag JSON is malformed.
    }
    return dedupeTags(raw.split(/[\n,]+/));
  }
  return [];
};

const extractPlainTagsLine = (description: string): string[] => {
  const match = description.match(/(?:^|\n)\s*Tags:\s*(.+)$/i);
  if (!match?.[1]) return [];
  return dedupeTags(match[1].split(/[\s,]+/));
};

const getJobTags = (job: any): string[] => {
  const sourceCandidates = [job?.skills_required, job?.skillsRequired, job?.tags, job?.tag_list, job?.tagList];
  for (const candidate of sourceCandidates) {
    const parsed = parseTagSource(candidate);
    if (parsed.length > 0) return parsed;
  }
  const fromHashtags = extractHashtagTags(job?.description || "");
  if (fromHashtags.length > 0) return fromHashtags;
  return extractPlainTagsLine(job?.description || "");
};

const isMissingJobError = (error: unknown) => {
  if (!error || !(error instanceof Error)) return false;

  const code = Number((error as Error & { code?: number }).code);
  const message = error.message.toLowerCase();

  return (
    code === 404 ||
    message.includes("could not be found") ||
    message.includes("document with the requested id") ||
    message.includes("not found")
  );
};

const JobDetails = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole, profile } = useAuth();
  const { toast } = useToast();
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAuthPromptModal, setShowAuthPromptModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [viewCount, setViewCount] = useState(0);

  const { data: job, isLoading, error: jobError, refetch: refetchJob } = useJob(id || "");
  const { data: relatedJobs = [] } = useJobs(undefined, { enabled: !!job?.$id });
  const { data: hasApplied = false } = useHasApplied(id || "");
  const { data: isSaved = false } = useIsJobSaved(id || "");
  const profileCompletion = useCandidateProfileCompletion();
  const jobErrorMessage = jobError instanceof Error ? jobError.message : "We could not load this job right now.";
  const missingJob = isMissingJobError(jobError);

  const applyForJob = useApplyForJob();
  const saveJob = useSaveJob();
  const unsaveJob = useUnsaveJob();
  const isSaveActionPending = saveJob.isPending || unsaveJob.isPending;
  const { mutateAsync: incrementJobViews } = useIncrementJobViews();
  const requiresSignInForSave = !user;

  const companyName = job?.companies?.name || job?.company || "Company";
  const jobTitle = job?.title ? `${job.title} at ${companyName}` : "Job Details";
  const descriptionSnippet = job?.description
    ? stripTagsLineFromDescription(job.description).replace(/\s+/g, " ").slice(0, 160).trim()
    : "View job details and apply on Hirelypk.";
  const jobUrl = job ? `${BRAND_SITE_URL}/job/${job.$id}` : "";

  const employmentTypeMap: Record<string, string> = {
    "full-time": "FULL_TIME", "part-time": "PART_TIME",
    internship: "INTERN", remote: "OTHER", contract: "CONTRACTOR",
  };

  const normalizedJobType = normalizeJobType(job?.type);
  const hasSalary = job?.salary_min || job?.salary_max;

  const structuredData = job ? {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: stripTagsLineFromDescription(job.description),
    datePosted: new Date(job.posted_date).toISOString(),
    url: jobUrl,
    identifier: {
      "@type": "PropertyValue",
      name: "Hirelypk",
      value: job.$id,
    },
    employmentType: employmentTypeMap[normalizedJobType] || "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: companyName,
      ...(job.companies?.logo_url ? { logo: job.companies.logo_url } : {}),
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location,
        addressCountry: job.currency === "USD" ? "US" : "PK",
      },
    },
    ...(normalizedJobType === "remote" ? { jobLocationType: "TELECOMMUTE" } : {}),
    ...(job.expiry_date ? { validThrough: new Date(job.expiry_date).toISOString() } : {}),
    ...(hasSalary ? {
      baseSalary: {
        "@type": "MonetaryAmount",
        currency: job.currency || "PKR",
        value: {
          "@type": "QuantitativeValue",
          ...(job.salary_min ? { minValue: job.salary_min } : {}),
          ...(job.salary_max ? { maxValue: job.salary_max } : {}),
          unitText: "MONTH",
        },
      },
    } : {}),
  } : undefined;

  useSeo({
    title: jobTitle,
    description: descriptionSnippet,
    canonical: jobUrl || undefined,
    image: job?.companies?.logo_url || undefined,
    imageAlt: job?.companies?.name ? `${job.companies.name} logo` : undefined,
    type: "article",
    structuredData,
  });

  const applyLink = resolveApplyLink(job);
  const hasDirectApplyLink = Boolean(applyLink);
    const showApplyButton = isRecruiterPostedJob(job);

  const handleApplyRedirect = () => {
    if (!applyLink) return;
    if (!user) { setShowAuthPromptModal(true); return; }
    trackJobEngagement("outbound_apply", { jobId: job?.$id, jobTitle: job?.title, company: companyName });
    window.open(applyLink, "_blank", "noopener,noreferrer");
  };

  const handleOpenInAppApply = () => {
    if (!user) {
      setShowAuthPromptModal(true);
      return;
    }

    if (!profileCompletion.isComplete) {
      setShowProfileModal(true);
      return;
    }

    trackJobEngagement("apply_start", { jobId: job?.$id, jobTitle: job?.title, company: companyName });
    setShowApplyModal(true);
  };

  useEffect(() => {
    if (!job?.$id) return;
    const currentViews = Number(job.view_count) || 0;
    setViewCount(currentViews);
    const sessionViewKey = `hirely:viewed-job:${job.$id}`;
    if (typeof window === "undefined" || sessionStorage.getItem(sessionViewKey)) return;
    sessionStorage.setItem(sessionViewKey, "1");
    incrementJobViews({ id: job.$id, currentViews })
      .then((updatedJob) => {
        const updatedViews = Number(updatedJob?.view_count);
        if (!Number.isNaN(updatedViews)) setViewCount(updatedViews);
      })
      .catch(() => {});
  }, [incrementJobViews, job?.$id, job?.view_count]);

 const handleApply = async () => {
  try {
    await applyForJob.mutateAsync({
      jobId: id!,
      coverLetter: coverLetter || undefined,
      resumeUrl: profile?.resume_url || undefined,
    });

    // Send emails in background - don't block the user
  (async () => {
  try {
    const { documents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROFILES,
      [Query.equal("user_id", job.user_id), Query.limit(1)]
    );
    console.log("Recruiter search result:", documents, "searching for user_id:", job.user_id);
    const recruiterProfile = documents[0];
    const recruiterEmail = recruiterProfile?.email;
    const recruiterName = recruiterProfile?.full_name || "Recruiter";

    if (recruiterEmail) {
      await sendApplicationReceivedEmail(
        recruiterEmail,
        recruiterName,
        profile?.full_name || "A Candidate",
        user?.email || "",
        job.title,
        companyName
      );
    } else {
      console.warn("No recruiter email found");
    }
  } catch (e) {
    console.warn("Recruiter notification email failed:", e);
  }

  try {
    if (user?.email) {
      await sendApplicationSubmittedEmail(
        user.email,
        profile?.full_name || "Candidate",
        job.title,
        companyName
      );
    }
  } catch (e) {
    console.warn("Candidate confirmation email failed:", e);
  }
})();

    trackJobEngagement("apply_submit", { jobId: job.$id, jobTitle: job.title, company: companyName });
    toast({ title: "Application submitted", description: "The recruiter will review your application." });
    dispatchFeedbackNudge({ source: "application_submitted", route: location.pathname });
    setShowApplyModal(false);
    setCoverLetter("");
  } catch (error: any) {
    toast({ title: "Application failed", description: error.message || "Failed to submit", variant: "destructive" });
  }
};

  const copyShareMessage = async (shareMessage: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareMessage);
        toast({ title: "Copied to clipboard", description: "Job details ready to share." });
        return true;
      }
    } catch {
      // Clipboard access can be blocked by browser permissions.
    }
    window.prompt("Copy and share this job message:", shareMessage);
    return true;
  };


const handleShareJob = async () => {

    const shareUrl = `${BRAND_SITE_URL}/job/${job.$id}`;

  const cleanedDescription = stripTagsLineFromDescription(job.description)
    .replace(/\s+/g, " ")
    .trim();
  const descriptionPreview =
    cleanedDescription.length > 180
      ? `${cleanedDescription.slice(0, 177).trimEnd()}...`
      : cleanedDescription;

  const hashtags =
    jobTags.length > 0
      ? jobTags.slice(0, 5).map((t) => `#${t.replace(/\s+/g, "")}`).join(" ")
      : null;

  const lines = [
    `New Job: ${job.title} at ${companyName}`,
    ``,
    `Location: ${job.location}`,
    `Type: ${typeConfig.label}`,
    ...(hasSalary ? [`Salary: ${job.currency || "PKR"} ${salaryDisplay}`] : []),
    ...(job.experience_level ? [`Experience: ${job.experience_level}`] : []),
    ``,
    descriptionPreview,
    ``,
    ...(hashtags ? [`${hashtags}`, ``] : []),
    shareUrl,
  ];

  const shareMessage = lines.join("\n");

  if (navigator.share) {
    try {
      await navigator.share({
        title: `${job.title} at ${companyName}`,
        text: shareMessage,
      });
      trackJobEngagement("share", { jobId: job.$id, jobTitle: job.title, company: companyName });
      return;
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
    }
  }

  await copyShareMessage(shareMessage);
  trackJobEngagement("share", { jobId: job.$id, jobTitle: job.title, company: companyName });
};
  const handleSave = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to save jobs", variant: "destructive" });
      navigate("/signin");
      return;
    }
    try {
      if (isSaved) {
        await unsaveJob.mutateAsync(id!);
        toast({ title: "Job removed from saved" });
      } else {
        const result = await saveJob.mutateAsync(id!);
        const alreadySaved = typeof result === "object" && result !== null && "message" in result && (result as any).message === "Already saved";
        toast({ title: alreadySaved ? "Job already saved" : "Job saved!" });
        trackJobEngagement("save", { jobId: job.$id, jobTitle: job.title, company: companyName });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <PageLoader
          message="Loading job details..."
          fullScreen={false}
          className="container mx-auto px-4 py-20"
        />
      </Layout>
    );
  }

  if (jobError && !missingJob) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Unable to load this job</h1>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">{jobErrorMessage}</p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => refetchJob()} className="rounded-xl">Try Again</Button>
            <Link to="/find-jobs"><Button className="rounded-xl">Browse Jobs</Button></Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (!job || missingJob) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Briefcase className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Job not found</h1>
          <p className="text-muted-foreground mb-8">This listing may have been removed or expired.</p>
          <Link to="/find-jobs"><Button className="rounded-xl">Browse Jobs</Button></Link>
        </div>
      </Layout>
    );
  }

  const typeConfig = jobTypes[normalizedJobType] || jobTypes["full-time"];

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return "No Salary Mentioned";
    if (min && max) return `${min.toLocaleString()} - ${max.toLocaleString()}`;
    if (min) return `${min.toLocaleString()}+`;
    return `Up to ${max!.toLocaleString()}`;
  };

  const salaryDisplay = formatSalary(job.salary_min, job.salary_max);
  const jobTags = getJobTags(job);
  const descriptionBody = stripTagsLineFromDescription(job.description);

  const transformedRelatedJobs = relatedJobs
    .filter((j) => j.$id !== job.$id)
    .slice(0, 4)
    .map((j) => ({
      id: j.$id,
      title: j.title,
      company: j.companies?.name || j.company || "Company",
      companyLogo: j.companies?.logo_url || "",
      location: j.location,
      salary: formatSalary(j.salary_min, j.salary_max),
      type: normalizeJobType(j.type),
      featured: j.featured || false,
      postedDate: j.posted_date,
    }));

  const OverviewItem = ({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-3.5">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/8">
        <Icon className="h-4.5 w-4.5 text-primary" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
        <div className="text-sm font-semibold text-foreground">{children}</div>
      </div>
    </div>
  );

  return (
    <Layout>
      {/* Profile Incomplete Modal */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-xl dark:bg-amber-900/40">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-300" />
              </div>
              <DialogTitle>Complete Your Profile First</DialogTitle>
            </div>
            <DialogDescription className="pt-3">
              To apply for jobs, you need to complete your profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Profile Completion</span>
                <span className="text-sm font-semibold text-primary">{profileCompletion.completionPercentage}%</span>
              </div>
              <Progress value={profileCompletion.completionPercentage} className="h-2" />
            </div>
            {profileCompletion.missingFields.length > 0 && (
              <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
                <p className="font-medium mb-2 text-foreground">Missing information:</p>
                <ul className="space-y-1 list-disc list-inside">
                  {profileCompletion.missingFields.map((field) => <li key={field}>{field}</li>)}
                </ul>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowProfileModal(false)} className="rounded-xl">Cancel</Button>
              <Link to="/profile" className="flex-1">
                <Button className="rounded-xl w-full">Complete Profile</Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAuthPromptModal} onOpenChange={setShowAuthPromptModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Sign up to apply</DialogTitle>
            <DialogDescription>
              You can browse and view job details as a guest. To apply, please sign up first.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link to="/signup" className="flex-1" onClick={() => setShowAuthPromptModal(false)}>
              <Button className="rounded-xl w-full">Create Account</Button>
            </Link>
            <Link to="/signin" className="flex-1" onClick={() => setShowAuthPromptModal(false)}>
              <Button variant="outline" className="rounded-xl w-full">Sign In</Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* Breadcrumb */}
      <div className="border-b border-border bg-card py-4">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to="/find-jobs" className="hover:text-foreground transition-colors">Find Jobs</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium truncate max-w-[200px]">{job.title}</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Job Header Card */}
            <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
              {job.featured && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400/60 via-amber-300 to-amber-400/60" />
              )}
              <div className="flex flex-col md:flex-row md:items-start gap-5">
                <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-border/50">
                  {job.companies?.logo_url ? (
                    <img src={job.companies.logo_url}  loading="lazy" alt={job.companies.name} className="w-11 h-11 object-contain" />
                  ) : (
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {job.featured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200/60 text-xs font-medium px-2.5 py-0.5">
                        Featured
                      </span>
                    )}
                    <span className={typeConfig.className}>{typeConfig.label}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 leading-tight">
                    {job.title}
                  </h1>
                  {job.companies ? (
                    <Link to={`/company/${job.company_id}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                      <Globe className="h-3.5 w-3.5" />
                      {job.companies.name}
                    </Link>
                  ) : (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Globe className="h-3.5 w-3.5" />
                      {companyName}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    onClick={handleSave}
                    disabled={isSaveActionPending}
                    className={cn("rounded-xl gap-2 h-10", isSaved && "border-primary/30 bg-primary/5 text-primary")}
                  >
                    {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                    {isSaveActionPending ? "..." : requiresSignInForSave ? "Save" : isSaved ? "Saved" : "Save"}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleShareJob}
                    className="rounded-xl h-10 w-10"
                    aria-label="Share this job"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" />
                    {salaryDisplay}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDistanceToNow(new Date(job.posted_date), { addSuffix: true })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    {viewCount.toLocaleString()} views
                  </span>
                </div>
                <div>
                  {hasApplied ? (
                    <Button disabled className="rounded-xl h-10 px-5 gap-2">
                      Applied
                    </Button>
                  ) : userRole === "employer" ? (
                    <Button disabled className="rounded-xl h-10 px-5">
                      Employers can't apply
                    </Button>
                  ) : showApplyButton ? (
                    <Button
                      className="rounded-xl h-10 px-6 font-semibold shadow-md shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
                      onClick={hasDirectApplyLink ? handleApplyRedirect : handleOpenInAppApply}
                    >
                      Apply Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Mobile Job Overview */}
            <div className="bg-card border border-border rounded-2xl p-6 lg:hidden">
              <h3 className="text-base font-semibold text-foreground mb-5">Job Overview</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <OverviewItem icon={DollarSign} label="Salary">{salaryDisplay}</OverviewItem>
                <OverviewItem icon={MapPin} label="Location">{job.location}</OverviewItem>
                <OverviewItem icon={Briefcase} label="Job Type">{typeConfig.label}</OverviewItem>
                <OverviewItem icon={Calendar} label="Posted">
                  {formatDistanceToNow(new Date(job.posted_date), { addSuffix: true })}
                </OverviewItem>
                {job.experience_level && (
                  <OverviewItem icon={GraduationCap} label="Experience">{job.experience_level}</OverviewItem>
                )}
              </div>
              {jobTags.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2.5 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" /> Skills & Tags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {jobTags.map((tag) => (
                      <span key={tag} className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-foreground">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Job Description */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">Job Description</h2>
              <div className="text-sm text-muted-foreground leading-7 whitespace-pre-line">
                {descriptionBody.split(/(\S+@\S+\.\S+|https?:\/\/\S+)/g).map((part, i) => {
  if (/\S+@\S+\.\S+/.test(part))
    return <a key={i} href={`mailto:${part}`} className="text-primary underline underline-offset-2 hover:opacity-80">{part}</a>;
  if (/^https?:\/\//.test(part))
    return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80">{part}</a>;
  return part;
})}
              </div>
            </div>

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Requirements</h2>
                <ul className="space-y-2.5">
                  {job.requirements.map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Mobile Benefits */}
            {job.benefits && job.benefits.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-6 lg:hidden">
                <h3 className="text-base font-bold text-foreground mb-4">Benefits</h3>
                <div className="flex flex-wrap gap-2">
                  {job.benefits.map((benefit, index) => (
                    <span key={index} className="rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200/60 px-3 py-1.5 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30">
                      {benefit}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Responsibilities */}
            {job.responsibilities && job.responsibilities.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Responsibilities</h2>
                <ul className="space-y-2.5">
                  {job.responsibilities.map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Related Jobs */}
            {transformedRelatedJobs.length > 0 && (
              <div className="mt-4">
                <h2 className="text-xl font-bold text-foreground mb-5">Related Jobs</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {transformedRelatedJobs.map((relatedJob) => (
                    <JobCard key={relatedJob.id} job={relatedJob} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Job Overview */}
            <div className="bg-card border border-border rounded-2xl p-6 hidden lg:block ">
              <h3 className="text-base font-bold text-foreground mb-5">Job Overview</h3>
              <div className="space-y-4">
                <OverviewItem icon={DollarSign} label="Salary">{salaryDisplay}</OverviewItem>
                <OverviewItem icon={MapPin} label="Location">{job.location}</OverviewItem>
                <OverviewItem icon={Briefcase} label="Job Type">{typeConfig.label}</OverviewItem>
                {job.experience_level && (
                  <OverviewItem icon={GraduationCap} label="Experience">{job.experience_level}</OverviewItem>
                )}
                <OverviewItem icon={Calendar} label="Posted">
                  {formatDistanceToNow(new Date(job.posted_date), { addSuffix: true })}
                </OverviewItem>
              </div>

              {jobTags.length > 0 && (
                <div className="mt-5 pt-5 border-t border-border">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" /> Skills & Tags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {jobTags.map((tag) => (
                      <span key={tag} className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-default">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Benefits */}
            {job.benefits && job.benefits.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-6 hidden lg:block">
                <h3 className="text-base font-bold text-foreground mb-4">Benefits</h3>
                <div className="flex flex-wrap gap-2">
                  {job.benefits.map((benefit, index) => (
                    <span key={index} className="rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200/60 px-3 py-1.5 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30">
                      {benefit}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Company Info */}
            {job.companies && (
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="text-base font-bold text-foreground mb-4">About the Company</h3>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center overflow-hidden border border-border/50">
                    {job.companies.logo_url ? (
                      <img src={job.companies.logo_url}  loading="lazy" alt={job.companies.name} className="w-10 h-10 object-contain" />
                    ) : (
                      <Building2 className="h-7 w-7 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{job.companies.name}</h4>
                    {job.companies.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3.5 w-3.5" />{job.companies.location}
                      </p>
                    )}
                  </div>
                </div>
                <Link to={`/company/${job.company_id}`}>
                  <Button variant="outline" className="w-full rounded-xl hover:border-primary/30 hover:text-primary">
                    View Company Profile
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Apply for: {job.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl border border-border">
              <div className="w-11 h-11 bg-card rounded-xl flex items-center justify-center overflow-hidden border border-border/50">
                {job.companies?.logo_url ? (
                  <img src={job.companies.logo_url}  loading="lazy" alt={job.companies?.name} className="w-7 h-7 object-contain" />
                ) : (
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{job.title}</p>
                <p className="text-xs text-muted-foreground">{job.companies?.name}</p>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200/60 rounded-xl dark:bg-emerald-900/20 dark:border-emerald-800/30">
              <p className="text-sm font-semibold text-emerald-800 mb-1 dark:text-emerald-100">Your Profile</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-200">
                {profile?.full_name} · {profile?.title || "Job Seeker"}
              </p>
              {profile?.resume_url && (
                <p className="text-xs text-emerald-600 mt-1.5 dark:text-emerald-300 flex items-center gap-1">
                  Resume attached
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Cover Letter <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <Textarea
                placeholder="Tell the employer why you're a great fit..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                className="min-h-[120px] rounded-xl resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowApplyModal(false)} className="flex-1 rounded-xl">Cancel</Button>
              <Button className="flex-1 rounded-xl" onClick={handleApply} disabled={applyForJob.isPending}>
                {applyForJob.isPending ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default JobDetails;
