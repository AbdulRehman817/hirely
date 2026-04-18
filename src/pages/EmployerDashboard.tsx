import { useState, useEffect } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import {
  Briefcase,
  Users,
  Building2,
  User,
  MapPin,
  Trash2,
  Plus,
  XCircle,
  UserCheck,
  Clock,
  ChevronRight,
  Award,
  Mail,
  Phone,
  ExternalLink,
  Download,
  Linkedin,
  Github,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAvatarUrl } from "@/lib/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Layout from "@/components/layout/Layout";
import PageLoader from "@/components/layout/PageLoader";
import ProfileCompletionBanner from "@/components/profile/ProfileCompletionBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useMyJobs, useDeleteJob, useUpdateJob } from "@/hooks/useJobs";
import { useMyCompanies } from "@/hooks/useCompanies";
import { useEmployerApplications, useUpdateApplicationStatus } from "@/hooks/useApplications";
import { useCreateNotification } from "@/hooks/useNotifications";
import { useEmployerProfileCompletion } from "@/hooks/useProfileCompletion";
import { sendShortlistedEmail, sendRejectedEmail, sendHiredEmail } from "@/services/emailService";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { storage, BUCKETS } from "@/lib/appwrite";

const EmployerDashboard = () => {
  const { user, profile, loading, userRole } = useAuth();
  const { data: jobs = [] } = useMyJobs();
  const { data: companies = [] } = useMyCompanies();
  
  const deleteJob = useDeleteJob();
  const updateJob = useUpdateJob();
  const updateApplicationStatus = useUpdateApplicationStatus();
  const createNotification = useCreateNotification();
  const profileCompletion = useEmployerProfileCompletion();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") || "overview";
  const defaultTab = ["overview", "jobs", "applications"].includes(rawTab) ? rawTab : "overview";
  const jobIds = jobs.map((job) => job.$id);
  const [selectedJobForApps, setSelectedJobForApps] = useState<string | null>(null);
  const [applicantDetail, setApplicantDetail] = useState<any>(null);
  const requestedJobId = searchParams.get("job");
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "shortlist" | "reject" | "hire" | null;
    applicationId: string;
    userId: string;
    jobId: string;
    jobTitle: string;
    companyName: string;
    applicantName: string;
    applicantEmail: string;
  }>({ open: false, type: null, applicationId: "", userId: "", jobId: "", jobTitle: "", companyName: "", applicantName: "", applicantEmail: "" });

  const { data: allApplications = [] } = useEmployerApplications(jobIds);

  useEffect(() => {
    if (jobs.length === 0) return;

    if (requestedJobId) {
      const targetJob = jobs.find((job) => job.$id === requestedJobId);
      if (targetJob && selectedJobForApps !== requestedJobId) {
        setSelectedJobForApps(requestedJobId);
        return;
      }
    }

    const hasSelectedJob = selectedJobForApps && jobs.some((job) => job.$id === selectedJobForApps);
    if (!hasSelectedJob) {
      setSelectedJobForApps(jobs[0].$id);
    }
  }, [jobs, requestedJobId, selectedJobForApps]);

  if (loading) {
    return (
      <Layout>
        <PageLoader fullScreen={false} className="container mx-auto px-4 py-16" />
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (userRole === "candidate") {
    return <Navigate to="/profile" replace />;
  }

  const selectedJob = jobs.find(j => j.$id === selectedJobForApps);
  const selectedJobApplications = selectedJobForApps
    ? allApplications.filter((application) => application.job_id === selectedJobForApps)
    : [];
  const applicationCountsByJob = allApplications.reduce<Record<string, number>>((accumulator, application) => {
    const jobId = application.job_id;
    if (!jobId) {
      return accumulator;
    }

    accumulator[jobId] = (accumulator[jobId] || 0) + 1;
    return accumulator;
  }, {});
  const activeJobs = jobs.filter(j => j.status === "active").length;
  const totalApplicants = allApplications.length;
  const pendingApplicants = allApplications.filter(a => a.status === "pending").length;
  const hiredApplicants = allApplications.filter(a => a.status === "hired").length;

  const stats = [
    { label: "Active Jobs", value: activeJobs, icon: Briefcase, color: "bg-primary/10 text-primary dark:bg-primary/20", subtext: `${jobs.length} total` },
    { label: "Applicants", value: totalApplicants, icon: Users, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300", subtext: `${pendingApplicants} pending` },
    { label: "Hired", value: hiredApplicants, icon: Award, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300", subtext: "Candidates" },
    { label: "Companies", value: companies.length, icon: Building2, color: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300", subtext: "Registered" },
  ];

  const handleDeleteJob = async (jobId: string) => {
    if (confirm("Are you sure you want to delete this job?")) {
      try {
        await deleteJob.mutateAsync(jobId);
        toast({ title: "Job deleted", description: "The job has been removed." });
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    }
  };

  const openConfirmDialog = async (
    type: "shortlist" | "reject" | "hire",
    application: any
  ) => {
    const job = jobs.find(j => j.$id === application.job_id);
    const company = companies.find((item) => item.$id === job?.company_id) || companies[0];
    
    const applicantEmail = application.profiles?.email || "";
    
    setConfirmDialog({
      open: true,
      type,
      applicationId: application.$id,
      userId: application.user_id,
      jobId: application.job_id,
      jobTitle: job?.title || "Job",
      companyName: company?.name || "Company",
      applicantName: application.profiles?.full_name || "Applicant",
      applicantEmail,
    });
  };

  const handleUpdateStatus = async () => {
    const { type, applicationId, userId, jobId, jobTitle, companyName, applicantName, applicantEmail } = confirmDialog;
    if (!type) return;

    try {
      const newStatus = type === "shortlist" ? "shortlisted" : type === "hire" ? "hired" : "rejected";
      await updateApplicationStatus.mutateAsync({ id: applicationId, status: newStatus });
      
      // Create notification with proper messages
      const notificationMessages = {
        shortlist: {
          title: "🎯 You've been Shortlisted!",
          message: `Congratulations! You have been shortlisted for the position of ${jobTitle} at ${companyName}.\n\nThe recruiter has reviewed your profile and may contact you soon. Please keep an eye on your notifications and messages for further updates.`,
          type: "shortlisted" as const,
        },
        reject: {
          title: "Application Update",
          message: `Your application for ${jobTitle} at ${companyName} was not selected at this time.\n\nThank you for your interest, and we encourage you to apply for other opportunities.`,
          type: "rejected" as const,
        },
        hire: {
          title: "🎉 Congratulations! You're Hired!",
          message: `We're excited to inform you that you have been selected and hired for the position of ${jobTitle} at ${companyName}.\n\nThe recruiter will contact you shortly with further details regarding joining, documents, and next steps. Congratulations and welcome aboard!`,
          type: "hired" as const,
        },
      };

      const config = notificationMessages[type];
      await createNotification.mutateAsync({
        user_id: userId,
        type: config.type,
        title: config.title,
        message: config.message,
        job_id: jobId,
        application_id: applicationId,
      });

      // Send email to job seeker (fire and forget)
      if (applicantEmail) {
        if (type === "shortlist") {
          sendShortlistedEmail(applicantEmail, applicantName, jobTitle, companyName, jobId).catch(console.error);
        } else if (type === "reject") {
          sendRejectedEmail(applicantEmail, applicantName, jobTitle, companyName).catch(console.error);
        } else if (type === "hire") {
          sendHiredEmail(applicantEmail, applicantName, jobTitle, companyName).catch(console.error);
        }
      }

      // If hired, close the job (remove from listings)
      if (type === "hire") {
        await updateJob.mutateAsync({ id: jobId, status: "closed" });
      }

      toast({
        title: type === "shortlist" ? "Candidate shortlisted" : type === "hire" ? "Candidate hired!" : "Application rejected",
        description: "The candidate has been notified.",
      });
      setConfirmDialog({ ...confirmDialog, open: false });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const viewApplicantDetails = async (application: any) => {
    setApplicantDetail(application);
    // Get signed URL for resume if exists
    if (application.profiles?.resume_url || application.resume_url) {
      try {
        const resumeFileId = application.resume_url || application.profiles?.resume_url;
        if (resumeFileId) {
          if (resumeFileId.startsWith("http")) {
            setResumeUrl(resumeFileId);
          } else {
            const fileUrl = storage.getFileView(BUCKETS.RESUMES, resumeFileId);
            setResumeUrl(fileUrl.toString());
          }
        } else {
          setResumeUrl(null);
        }
      } catch (error) {
        console.error('Error getting resume URL:', error);
        setResumeUrl(null);
      }
    } else {
      setResumeUrl(null);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return { bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800/60" };
      case "draft":
        return { bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800/60" };
      case "closed":
        return { bg: "bg-red-50 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800/60" };
      default:
        return { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
    }
  };

  const getAppStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return { bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800/60", icon: Clock, label: "Applied" };
      case "shortlisted":
        return { bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800/60", icon: UserCheck, label: "Shortlisted" };
      case "rejected":
        return { bg: "bg-red-50 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800/60", icon: XCircle, label: "Rejected" };
      case "hired":
        return { bg: "bg-green-50 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800/60", icon: Award, label: "Hired" };
      default:
        return { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", icon: Clock, label: status };
    }
  };

  const isActionDisabled = (status: string) => status === "hired" || status === "rejected";

  const dialogConfig = {
    shortlist: {
      title: "Shortlist Candidate",
      description: `Are you sure you want to shortlist ${confirmDialog.applicantName} for "${confirmDialog.jobTitle}"?\n\nThey will receive a notification informing them they've been shortlisted.`,
      buttonText: "Shortlist",
      buttonClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
      icon: UserCheck,
    },
    reject: {
      title: "Reject Application",
      description: `Are you sure you want to reject ${confirmDialog.applicantName}'s application for "${confirmDialog.jobTitle}"?\n\nThey will receive a notification. This action cannot be undone.`,
      buttonText: "Reject",
      buttonClass: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
      icon: XCircle,
    },
    hire: {
      title: "🎉 Hire Candidate",
      description: `Congratulations! You're about to hire ${confirmDialog.applicantName} for "${confirmDialog.jobTitle}"!\n\nThey will receive a notification with this exciting news. The job will be closed and removed from active listings.`,
      buttonText: "Confirm Hire",
      buttonClass: "bg-green-600 hover:bg-green-700 text-white",
      icon: Award,
    },
  };

  return (
    <Layout hideFooter>
      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ ...confirmDialog, open: false })}>
        <DialogContent>
          {confirmDialog.type && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = dialogConfig[confirmDialog.type].icon;
                    return <Icon className="h-6 w-6 text-primary" />;
                  })()}
                  <DialogTitle>{dialogConfig[confirmDialog.type].title}</DialogTitle>
                </div>
                <DialogDescription className="pt-2 whitespace-pre-line">
                  {dialogConfig[confirmDialog.type].description}
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
                  Cancel
                </Button>
                <Button
                  className={dialogConfig[confirmDialog.type].buttonClass}
                  onClick={handleUpdateStatus}
                  disabled={updateApplicationStatus.isPending}
                >
                  {updateApplicationStatus.isPending ? "Processing..." : dialogConfig[confirmDialog.type].buttonText}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Applicant Detail Dialog */}
      <Dialog open={!!applicantDetail} onOpenChange={(open) => !open && setApplicantDetail(null)}>
        <DialogContent className="max-w-2xl">
          {applicantDetail && (
            <>
              <DialogHeader>
                <DialogTitle>Applicant Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                {/* Profile Info */}
                <div className="flex items-start gap-4">
                 <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {getAvatarUrl(applicantDetail.profiles?.avatar_url) ? (
                      <img  loading="lazy"
                        src={getAvatarUrl(applicantDetail.profiles?.avatar_url) ?? ""}
                        alt={applicantDetail.profiles?.full_name || "Applicant"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-8 w-8 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{applicantDetail.profiles?.full_name || "Applicant"}</h3>
                    <p className="text-muted-foreground">{applicantDetail.profiles?.title || "Job Seeker"}</p>
                    {applicantDetail.profiles?.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {applicantDetail.profiles.location}
                      </p>
                    )}
                  </div>
                  <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border", getAppStatusConfig(applicantDetail.status).bg, getAppStatusConfig(applicantDetail.status).text, getAppStatusConfig(applicantDetail.status).border)}>
                    {getAppStatusConfig(applicantDetail.status).label}
                  </div>
                </div>

                {/* Skills */}
                {applicantDetail.profiles?.skills?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {applicantDetail.profiles.skills.map((skill: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-secondary rounded text-xs">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {applicantDetail.profiles?.experience_years !== null && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Experience</h4>
                    <p className="text-sm text-muted-foreground">
                      {applicantDetail.profiles.experience_years} years
                    </p>
                  </div>
                )}

                {/* Contact */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Contact</h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 text-primary" />
                      {applicantDetail.profiles?.email ? (
                        <a href={`mailto:${applicantDetail.profiles.email}`} className="hover:text-primary">
                          {applicantDetail.profiles.email}
                        </a>
                      ) : (
                        <span>Email not available</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 text-primary" />
                      {applicantDetail.profiles?.phone ? (
                        <a href={`tel:${applicantDetail.profiles.phone}`} className="hover:text-primary">
                          {applicantDetail.profiles.phone}
                        </a>
                      ) : (
                        <span>Phone not available</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Linkedin className="h-4 w-4 text-primary" />
                      {applicantDetail.profiles?.linkedin_url ? (
                        <a
                          href={applicantDetail.profiles.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-primary"
                        >
                          LinkedIn <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span>LinkedIn not available</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Github className="h-4 w-4 text-primary" />
                      {applicantDetail.profiles?.github_url ? (
                        <a
                          href={applicantDetail.profiles.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-primary"
                        >
                          GitHub <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span>GitHub not available</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cover Letter */}
                {applicantDetail.cover_letter && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Cover Letter</h4>
                    <div className="p-4 bg-secondary rounded-lg text-sm whitespace-pre-line">
                      {applicantDetail.cover_letter}
                    </div>
                  </div>
                )}

                {/* Resume */}
                {resumeUrl && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Resume</h4>
                    <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download Resume
                      </Button>
                    </a>
                  </div>
                )}

                {/* Applied Date */}
                <div className="text-xs text-muted-foreground">
Applied {formatDistanceToNow(new Date(applicantDetail.applied_at || applicantDetail.$createdAt || Date.now()), { addSuffix: true })}                </div>

                {/* Actions */}
                {!isActionDisabled(applicantDetail.status) && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => {
                        setApplicantDetail(null);
                        openConfirmDialog("shortlist", applicantDetail);
                      }}
                      disabled={applicantDetail.status === "shortlisted"}
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Shortlist
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        setApplicantDetail(null);
                        openConfirmDialog("hire", applicantDetail);
                      }}
                    >
                      <Award className="h-4 w-4 mr-2" />
                      Hire
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setApplicantDetail(null);
                        openConfirmDialog("reject", applicantDetail);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center shadow-sm">
                {companies[0]?.logo_url ? (
                  <img src={companies[0].logo_url}  loading="lazy" alt="" className="w-16 h-16 rounded-2xl object-cover" />
                ) : (
                  <Building2 className="h-8 w-8 text-primary" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {companies[0]?.name || "Employer Dashboard"}
                </h1>
                <p className="text-muted-foreground flex items-center gap-2">
                  {profile?.full_name}
                  {companies[0]?.location && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                      <MapPin className="h-3 w-3" />
                      {companies[0].location}
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link to="/recruiter-profile">
                <Button variant="outline" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              </Link>
              <Link to="/post-job">
                <Button
                  className="btn-primary"
                  size="sm"
                  disabled={!profileCompletion.isComplete}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Post New Job
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {/* Profile Completion Banner */}
        <ProfileCompletionBanner
          isComplete={profileCompletion.isComplete}
          missingFields={profileCompletion.missingFields}
          completionPercentage={profileCompletion.completionPercentage}
          type="employer"
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-card/80 border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow backdrop-blur"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm font-medium text-foreground mt-1">{stat.label}</p>
                  <p className="text-xs text-muted-foreground">{stat.subtext}</p>
                </div>
                <div className={cn("p-3 rounded-xl", stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={defaultTab} onValueChange={(v) => setSearchParams({ tab: v })} className="w-full">
          <div className="bg-card/80 border border-border/60 rounded-2xl mb-6 backdrop-blur">
            <TabsList className="w-full justify-start p-1 bg-transparent">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="jobs"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
              >
                <Briefcase className="h-4 w-4 mr-2" />
                My Jobs ({jobs.length})
              </TabsTrigger>
              <TabsTrigger
                value="applications"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
              >
                <Users className="h-4 w-4 mr-2" />
                Applicants
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0 space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Recent Jobs */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Recent Jobs</h3>
                  <Button variant="ghost" size="sm" onClick={() => setSearchParams({ tab: "jobs" })}>
                    View All <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                {jobs.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Briefcase className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">No jobs posted yet</p>
                    <Link to="/post-job">
                      <Button
                        size="sm"
                        className="btn-primary"
                        disabled={!profileCompletion.isComplete}
                      >
                        Post a Job
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {jobs.slice(0, 4).map((job) => {
                      const statusConfig = getStatusConfig(job.status || "active");
                      return (
                        <div key={job.$id} className="p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <Link to={`/job/${job.$id}`} className="font-medium text-foreground hover:text-primary text-sm truncate block">
                                {job.title}
                              </Link>
                              <p className="text-xs text-muted-foreground">
                                {job.location} • {job.type}
                              </p>
                            </div>
                            <span className={cn("px-2 py-1 rounded-full text-xs font-medium border capitalize shrink-0", statusConfig.bg, statusConfig.text, statusConfig.border)}>
                              {job.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Applicants */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Recent Applicants</h3>
                  <Button variant="ghost" size="sm" onClick={() => setSearchParams({ tab: "applications" })}>
                    View All <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                {allApplications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">No applicants yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {allApplications.slice(0, 4).map((app) => {
                      const statusConfig = getAppStatusConfig(app.status || "pending");
                      return (
                        <div
                          key={app.$id}
                          className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => viewApplicantDetails(app)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{app.profiles?.full_name || "Applicant"}</p>
                                <p className="text-xs text-muted-foreground truncate">{app.profiles?.title || "Job Seeker"}</p>
                              </div>
                            </div>
                            <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border shrink-0", statusConfig.bg, statusConfig.text, statusConfig.border)}>
                              {statusConfig.label}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="mt-0">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">All Jobs ({jobs.length})</h3>
              </div>
              {jobs.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="h-8 w-8 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">No jobs posted yet</h4>
                  <p className="text-sm text-muted-foreground mb-6">Post your first job to start receiving applications</p>
                  <Link to="/post-job">
                    <Button
                      className="btn-primary"
                      disabled={!profileCompletion.isComplete}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Post a Job
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {jobs.map((job) => {
                    const statusConfig = getStatusConfig(job.status || "active");
                    return (
                      <div key={job.$id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">
                              💼
                            </div>
                            <div className="min-w-0 flex-1">
                              <Link to={`/job/${job.$id}`} className="font-medium text-foreground hover:text-primary">
                                {job.title}
                              </Link>
                              <p className="text-sm text-muted-foreground">
                                {job.location} • {job.type}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Posted {formatDistanceToNow(new Date(job.posted_date), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={cn("px-3 py-1.5 rounded-full text-xs font-medium border capitalize", statusConfig.bg, statusConfig.text, statusConfig.border)}>
                              {job.status}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedJobForApps(job.$id);
                                setSearchParams({ tab: "applications" });
                              }}
                            >
                              <Users className="h-4 w-4 mr-1" />
                              Applicants
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteJob(job.$id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="mt-0">
            <div className="grid lg:grid-cols-4 gap-6">
              {/* Job Selector */}
              <div className="lg:col-span-1">
                <div className="bg-card border border-border rounded-xl overflow-hidden sticky top-4">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-semibold text-foreground text-sm">Select Job</h3>
                  </div>
                  <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                    {jobs.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">No jobs posted yet</p>
                    ) : (
                      jobs.map((job) => (
                        <button
                          key={job.$id}
                          onClick={() => setSelectedJobForApps(job.$id)}
                          className={cn(
                            "w-full p-3 text-left hover:bg-muted/50 transition-colors",
                            selectedJobForApps === job.$id && "bg-primary/10"
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{job.title}</p>
                              <p className="text-xs text-muted-foreground">{job.location}</p>
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {applicationCountsByJob[job.$id] || 0}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Applicants List */}
              <div className="lg:col-span-3">
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-semibold text-foreground">
                      {selectedJob ? `Applicants for "${selectedJob.title}"` : "Select a job"} ({selectedJobApplications.length})
                    </h3>
                  </div>
                  {selectedJobApplications.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="h-8 w-8 text-primary" />
                      </div>
                      <h4 className="font-semibold text-foreground mb-2">No applicants yet</h4>
                      <p className="text-sm text-muted-foreground">
                        Applicants will appear here when they apply for this job
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {selectedJobApplications.map((app) => {
                        const statusConfig = getAppStatusConfig(app.status || "pending");
                        const disabled = isActionDisabled(app.status || "pending");
                        return (
                          <div key={app.$id} className="p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between gap-4">
                              <div
                                className="flex items-center gap-4 min-w-0 flex-1 cursor-pointer"
                                onClick={() => viewApplicantDetails(app)}
                              >
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <User className="h-6 w-6 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-foreground">{app.profiles?.full_name || "Applicant"}</p>
                                  <p className="text-sm text-muted-foreground">{app.profiles?.title || "Job Seeker"}</p>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                    {app.profiles?.location && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {app.profiles.location}
                                      </span>
                                    )}
                                    {app.profiles?.experience_years !== null && (
                                      <span>{app.profiles?.experience_years} years exp</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border", statusConfig.bg, statusConfig.text, statusConfig.border)}>
                                  <statusConfig.icon className="h-3 w-3" />
                                  {statusConfig.label}
                                </div>
                                {!disabled && (
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                      onClick={() => openConfirmDialog("shortlist", app)}
                                      disabled={app.status === "shortlisted"}
                                    >
                                      <UserCheck className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                      onClick={() => openConfirmDialog("hire", app)}
                                    >
                                      <Award className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                      onClick={() => openConfirmDialog("reject", app)}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </Layout>
  );
};

export default EmployerDashboard;
