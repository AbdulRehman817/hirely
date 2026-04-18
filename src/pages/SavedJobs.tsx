import { Bookmark, Building2, Heart, MapPin } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/layout/Layout";
import PageLoader from "@/components/layout/PageLoader";
import { useAuth } from "@/contexts/AuthContext";
import { SavedJob, useSavedJobs, useUnsaveJob } from "@/hooks/useSavedJobs";

const getSavedTime = (savedJob: SavedJob) => {
  const parsedDate = new Date(savedJob.saved_at);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Saved recently";
  }

  return formatDistanceToNow(parsedDate, { addSuffix: true });
};

const formatJobType = (type?: string) => {
  if (!type) return "Role";
  return type
    .split(/[\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const toSalaryText = (value: number) => {
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }

  return `$${value.toLocaleString()}`;
};

const formatSalary = (min: number | null | undefined, max: number | null | undefined) => {
  if (!min && !max) return "Salary not specified";
  if (min && max) return `${toSalaryText(min)} - ${toSalaryText(max)}`;
  if (min) return `${toSalaryText(min)}+`;
  return `Up to ${toSalaryText(max!)}`;
};

const SavedJobs = () => {
  const navigate = useNavigate();
  const { user, loading, userRole } = useAuth();
  const { data: savedJobs = [], isLoading } = useSavedJobs();
  const unsaveJob = useUnsaveJob();
  const removingJobId = unsaveJob.variables;

  if (loading || isLoading) {
    return (
      <Layout>
        <PageLoader
          message="Loading saved jobs..."
          fullScreen={false}
          className="container mx-auto px-4 py-16"
        />
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (userRole === "employer") {
    return <Navigate to="/employer-dashboard" replace />;
  }

  return (
    <Layout hideFooter>
      {/* Page Header */}
      <section className="border-b border-border bg-card py-10 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Saved Jobs</h1>
              <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
                {savedJobs.length > 0
                  ? `${savedJobs.length} job${savedJobs.length === 1 ? "" : "s"} saved to your list`
                  : "You have no saved jobs yet"}
              </p>
            </div>
            {savedJobs.length > 0 && (
              <Link to="/find-jobs">
                <Button variant="outline" size="sm" className="shrink-0">
                  Browse more jobs
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-6 sm:py-10">
        {savedJobs.length === 0 ? (
          /* ── Empty state ── */
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-sm sm:p-14">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Heart className="h-10 w-10 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-foreground">No saved jobs yet</h3>
            <p className="mb-7 text-sm text-muted-foreground leading-relaxed">
              Bookmark jobs while browsing and they'll appear here for easy access.
            </p>
            <Link to="/find-jobs">
              <Button className="btn-primary h-11 px-7">Browse Jobs</Button>
            </Link>
          </div>
        ) : (
          /* ── Job list ── */
          <div className="mx-auto max-w-3xl space-y-3">
            {savedJobs.map((savedJob) => {
              const isRemoving = unsaveJob.isPending && removingJobId === savedJob.job_id;

              return (
                <article
                  key={savedJob.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => savedJob.job_id && navigate(`/job/${savedJob.job_id}`)}
                  onKeyDown={(event) => {
                    if (!savedJob.job_id) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/job/${savedJob.job_id}`);
                    }
                  }}
                  className="group relative cursor-pointer rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:p-5"
                >
                  {/* Removing overlay */}
                  {isRemoving && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-card/80 backdrop-blur-[2px]">
                      <p className="text-xs font-medium text-muted-foreground">Removing…</p>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    {/* Left — logo + details */}
                    <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                      {/* Company logo */}
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                        {savedJob.jobs?.companies?.logo_url ? (
                          <img  loading="lazy"
                            src={savedJob.jobs.companies.logo_url}
                            alt={savedJob.jobs.companies.name}
                            className="h-9 w-9 object-contain"
                          />
                        ) : (
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>

                      {/* Text */}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-muted-foreground">
                          {savedJob.jobs?.companies?.name || "Company not available"}
                        </p>

                        <h3 className="mt-0.5 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary sm:text-lg">
                          {savedJob.jobs?.title || "Job not available"}
                        </h3>

                        {savedJob.jobs?.location && (
                          <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground sm:text-sm">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            {savedJob.jobs.location}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right — unsave button */}
                    <div className="shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(event) => {
                          event.stopPropagation();
                          unsaveJob.mutate(savedJob.job_id);
                        }}
                        disabled={unsaveJob.isPending || !savedJob.job_id}
                        className="h-8 w-8 text-[#6366f2] hover:bg-[#6366f2]/10 hover:text-[#6366f2] focus-visible:ring-[#6366f2]/40"
                        aria-label="Remove saved job"
                      >
                        <Bookmark className="h-4 w-4 fill-[#6366f2] text-[#6366f2]" />
                      </Button>
                    </div>
                  </div>

                  {/* Footer row */}
                  <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
                    <p className="text-xs text-muted-foreground">
                      {unsaveJob.isPending && removingJobId === savedJob.job_id
                        ? "Removing..."
                        : "Saved in your list"}
                    </p>
                    <p className="text-xs text-muted-foreground">Saved {getSavedTime(savedJob)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </Layout>
  );
};

export default SavedJobs;
