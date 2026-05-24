import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  MapPin,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  X,
  Building2,
  DollarSign,
  Clock,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useJobs } from "@/hooks/useJobs";
import { useSeo } from "@/hooks/useSeo";
import Layout from "@/components/layout/Layout";
import PageLoader from "@/components/layout/PageLoader";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { normalizeJobType } from "@/lib/jobType";
import { BRAND_SITE_URL } from "@/lib/brand";
import { trackJobSearch } from "@/lib/analytics";

const ITEMS_PER_PAGE = 12;

const jobTypeColors: Record<string, string> = {
  "full-time": "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40",
  "part-time": "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40",
  "internship": "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800/40",
  "remote": "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800/40",
  "contract": "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/40",
};

const FindJobs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const appliedSearchTerm = searchParams.get("q") || "";
  const appliedLocationTerm = searchParams.get("location") || "";
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [locationTerm, setLocationTerm] = useState(appliedLocationTerm);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const { data: dbJobs = [], isLoading, error: jobsError, refetch } = useJobs({
    search: appliedSearchTerm,
    location: appliedLocationTerm,
  });
  const jobsErrorMessage =
    jobsError instanceof Error
      ? jobsError.message
      : "Unable to load jobs right now. Please try again.";

  useEffect(() => {
    setSearchTerm(appliedSearchTerm);
    setLocationTerm(appliedLocationTerm);
  }, [appliedLocationTerm, appliedSearchTerm]);

  const transformedJobs = dbJobs.map((job) => ({
    id: job.$id,
    title: job.title,
    company: job.companies?.name || job.company || "Company",
    companyLogo: job.companies?.logo_url || "",
    companyId: job.companies?.$id || "",
    location: job.location,
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    currency: job.currency || "USD",
    type: normalizeJobType(job.type),
    featured: job.featured || false,
    postedDate: job.posted_date,
    description: job.description,
  }));

  let filteredJobs = transformedJobs;

  if (selectedTypes.length > 0) {
    filteredJobs = filteredJobs.filter((job) => selectedTypes.includes(job.type));
  }

  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setSelectedTypes([...selectedTypes, type]);
    } else {
      setSelectedTypes(selectedTypes.filter((t) => t !== type));
    }
    setCurrentPage(1);
  };

  const handleSearch = () => {
    const nextParams = new URLSearchParams();
    const normalizedSearch = searchTerm.trim();
    const normalizedLocation = locationTerm.trim();

    if (normalizedSearch) nextParams.set("q", normalizedSearch);
    if (normalizedLocation) nextParams.set("location", normalizedLocation);

    setSearchParams(nextParams);
    trackJobSearch({ searchTerm: normalizedSearch, location: normalizedLocation, source: "find_jobs" });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSelectedTypes([]);
    setLocationTerm("");
    setSearchTerm("");
    setSearchParams({});
    setCurrentPage(1);
  };

  const hasActiveFilters =
    selectedTypes.length > 0 ||
    appliedLocationTerm.trim().length > 0 ||
    appliedSearchTerm.trim().length > 0;
  const canonical = `${BRAND_SITE_URL}/find-jobs`;

  useSeo({
    title: appliedSearchTerm
      ? `${appliedSearchTerm} Jobs`
      : "Find Jobs in Pakistan, Remote Jobs and Internships",
    description: appliedSearchTerm
      ? `Browse ${appliedSearchTerm} jobs on Hirelypk and apply to verified openings from trusted employers.`
      : "Search verified jobs by title, company, location, and job type on Hirelypk.",
    canonical,
    noIndex: hasActiveFilters,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Find Jobs on Hirelypk",
      description: "Search verified jobs by title, company, location, and job type on Hirelypk.",
      url: canonical,
    },
  });

  const formatSalary = (min: number | null, max: number | null, _currency: string) => {
    if (!min && !max) return "No Salary Mentioned";
    if (min && max) return `${(min / 1000).toFixed(0)}k - ${(max / 1000).toFixed(0)}k`;
    if (min) return `${(min / 1000).toFixed(0)}k+`;
    return `Up to ${(max! / 1000).toFixed(0)}k`;
  };

  return (
    <Layout>

      {/* Hero Search Section */}
      <section className="relative overflow-hidden border-b border-border bg-card">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-12 left-1/4 w-64 h-64 rounded-full bg-primary/3 blur-2xl" />
        </div>

        <div className="container relative mx-auto px-4 py-14">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-4 py-1.5 text-xs font-semibold tracking-widest uppercase text-primary mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              {filteredJobs.length} Live Opportunities
            </div>
            <h1 className="mb-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Find Your{" "}
              <span className="relative">
                <span className="text-primary">Perfect Role</span>
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 5.5C47 1.5 100 1.5 199 5.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary/30"/>
                </svg>
              </span>
            </h1>
            <p className="mb-10 text-base text-muted-foreground">
              Browse curated listings from top companies, filtered by role, location, and type.
            </p>

            {/* Search Box */}
            <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-background p-2 shadow-lg shadow-black/5 dark:shadow-black/30">
              <div className="flex flex-col gap-2 lg:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Job title, keyword, company..."
                    className="h-12 border-0 bg-muted/30 pl-11 text-sm focus:bg-muted/50 transition-colors rounded-xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <div className="relative flex-1">
                  <MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="City, state or country"
                    className="h-12 border-0 bg-muted/30 pl-11 text-sm focus:bg-muted/50 transition-colors rounded-xl"
                    value={locationTerm}
                    onChange={(e) => setLocationTerm(e.target.value)}
                  />
                </div>
                <Button
                  className="h-12 px-7 rounded-xl font-semibold shadow-md shadow-primary/20 transition-all hover:shadow-primary/30 hover:-translate-y-0.5 w-full lg:w-auto"
                  onClick={handleSearch}
                >
                  Search Jobs
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Filters Sidebar */}
          <aside className={cn("lg:w-60 shrink-0", showFilters ? "block" : "hidden lg:block")}>
            <div className="bg-card border border-border rounded-2xl p-5 sticky top-24">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  Filters
                </h3>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs h-7 text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Job Type</p>
                <div className="space-y-1">
                  {[
                    { value: "full-time", label: "Full Time" },
                    { value: "part-time", label: "Part Time" },
                    { value: "internship", label: "Internship" },
                    { value: "remote", label: "Remote" },
                    { value: "contract", label: "Contract" },
                  ].map((type) => {
                    const count = dbJobs.filter(j => j.type === type.value).length;
                    const isSelected = selectedTypes.includes(type.value);
                    return (
                      <label
                        key={type.value}
                        className={cn(
                          "flex items-center justify-between cursor-pointer rounded-lg px-3 py-2.5 transition-colors",
                          isSelected ? "bg-primary/8" : "hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleTypeChange(type.value, !!checked)}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <span className={cn("text-sm font-medium", isSelected ? "text-primary" : "text-foreground")}>
                            {type.label}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
                          {count}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Mobile Filter Toggle */}
            <div className="lg:hidden mb-4">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="w-full justify-between rounded-xl"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filter Jobs
                </span>
                {selectedTypes.length > 0 && (
                  <Badge variant="secondary" className="rounded-full">{selectedTypes.length}</Badge>
                )}
              </Button>
            </div>

            {/* Results Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <p className="text-sm text-foreground">
                  <span className="font-bold text-lg">{filteredJobs.length}</span>
                  <span className="text-muted-foreground ml-1.5">jobs found</span>
                  {appliedSearchTerm && (
                    <span className="text-muted-foreground"> for "{appliedSearchTerm}"</span>
                  )}
                </p>
              </div>
              {hasActiveFilters && (
                <div className="hidden sm:flex items-center gap-2 flex-wrap">
                  {selectedTypes.map((type) => (
                    <Badge
                      key={type}
                      variant="secondary"
                      className="flex items-center gap-1.5 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors text-xs px-2.5 py-1 rounded-full"
                      onClick={() => handleTypeChange(type, false)}
                    >
                      {type.replace("-", " ")}
                      <X className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Jobs List */}
            {isLoading ? (
              <PageLoader
                message="Loading opportunities..."
                fullScreen={false}
                className="py-20"
              />
            ) : jobsError ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-10 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
                  <AlertTriangle className="h-7 w-7 text-destructive" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">Couldn't load jobs</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">{jobsErrorMessage}</p>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl">
                    Try Again
                  </Button>
                  <Link to="/signin">
                    <Button size="sm" className="rounded-xl">Sign In</Button>
                  </Link>
                </div>
              </div>
            ) : paginatedJobs.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                  <Briefcase className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">No jobs found</h3>
                <p className="text-sm text-muted-foreground mb-6">Try adjusting your search or clearing filters</p>
                <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-xl">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedJobs.map((job) => (
                  <Link
                    key={job.id}
                    to={`/job/${job.id}`}
                    className="group block"
                  >
                    <div className={cn(
                      "relative bg-card border border-border rounded-2xl p-5 transition-all duration-200",
                      "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
                      job.featured && "border-amber-200/60 dark:border-amber-800/30"
                    )}>
                      {job.featured && (
                        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-amber-400/60 via-amber-300/80 to-amber-400/60" />
                      )}

                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Company Logo */}
                        <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-border/50">
                          {job.companyLogo ? (
                            <img src={job.companyLogo}  loading="lazy" alt={job.company} className="w-9 h-9 object-contain" />
                          ) : (
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>

                        {/* Job Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                            <div>
                              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                                {job.title}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-0.5">{job.company}</p>
                            </div>
                            {job.featured && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 text-xs font-medium px-2.5 py-1">
                                <Sparkles className="h-3 w-3" />
                                Featured
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              {job.location}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-border" />
                            <span className="flex items-center gap-1.5">
                              <DollarSign className="h-3.5 w-3.5" />
                              {formatSalary(job.salary_min, job.salary_max, job.currency)}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-border" />
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDistanceToNow(new Date(job.postedDate), { addSuffix: true })}
                            </span>
                          </div>

                          <span className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                            jobTypeColors[job.type] || jobTypeColors["full-time"]
                          )}>
                            {job.type.replace("-", " ")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-10">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="icon"
                      className="h-9 w-9 rounded-xl"
                      onClick={() => setCurrentPage(pageNum)}
                      aria-label={`Go to page ${pageNum}`}
                      aria-current={currentPage === pageNum ? "page" : undefined}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </Layout>
  );
};

export default FindJobs;
