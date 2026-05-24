import { Link } from "react-router-dom";
import { Search, ArrowRight, Target, AlertTriangle, UserCheck, ExternalLink, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Layout from "@/components/layout/Layout";
import PageLoader from "@/components/layout/PageLoader";
import JobCard from "@/components/jobs/JobCard";
import { useJobs } from "@/hooks/useJobs";
import { useSeo } from "@/hooks/useSeo";
import { useAuth } from "@/contexts/AuthContext";
import { BRAND_LOGO_PATH, BRAND_SITE_URL, toAbsoluteUrl } from "@/lib/brand";
import { trackJobSearch } from "@/lib/analytics";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { data: dbJobs = [], isLoading: jobsLoading, error: jobsError, refetch } = useJobs();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [locationTerm, setLocationTerm] = useState("");
  const jobsErrorMessage =
    jobsError instanceof Error
      ? jobsError.message
      : "Unable to load jobs right now. Please try again.";

  const homeCanonical = `${BRAND_SITE_URL}/`;
  const homeImage = toAbsoluteUrl(BRAND_LOGO_PATH);
  const steps = [
  {
    icon: Search,
    step: "01",
    title: "Search & Browse",
    desc: "Find jobs that match your skills and interests from our curated listings.",
    iconColor: "text-sky-600",
    iconBg: "bg-sky-50 dark:bg-sky-900/20",
    iconBorder: "border-sky-200/70 dark:border-sky-800/40",
    stepColor: "text-sky-500/30",
  },
  {
    icon: UserCheck,
    step: "02",
    title: "Sign In & Apply",
    desc: "Create your free account and apply to jobs with a single click.",
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50 dark:bg-violet-900/20",
    iconBorder: "border-violet-200/70 dark:border-violet-800/40",
    stepColor: "text-violet-500/30",
  },
  {
    icon: ExternalLink,
    step: "03",
    title: "Direct Apply (Optional)",
    desc: "If enabled by the recruiter, continue your application on the company's official website.",
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50 dark:bg-emerald-900/20",
    iconBorder: "border-emerald-200/70 dark:border-emerald-800/40",
    stepColor: "text-emerald-500/30",
  },
];

  const structuredData = [
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Hirelypk",
          url: BRAND_SITE_URL,
          potentialAction: {
            "@type": "SearchAction",
            target: `${BRAND_SITE_URL}/find-jobs?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        },
        {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Hirelypk",
          url: BRAND_SITE_URL,
          logo: homeImage,
        },
        {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Hirelypk Home",
          url: homeCanonical,
          description:
            "Browse thousands of jobs from top companies. Sign in, apply on Hirelypk, or use optional direct apply when enabled by recruiters.",
        },
      ];

  useSeo({
    title: "Jobs in Pakistan, Remote Jobs and Internships",
    description:
      "Find verified jobs in Pakistan, remote roles, internships, and full-time opportunities from trusted employers on Hirelypk.",
    keywords: ["jobs in Pakistan", "remote jobs", "internships", "full-time jobs", "career opportunities", "Hirelypk"],
    canonical: homeCanonical,
    image: homeImage,
    imageAlt: "Hirelypk job search platform logo",
    structuredData,
  });

  const formatSalary = (min: number | null, max: number | null, _currency: string | null) => {
    if (!min && !max) return "No Salary Mentioned";
    if (min && max) return `${min.toLocaleString()} - ${max.toLocaleString()}`;
    if (min) return `${min.toLocaleString()}+`;
    return `Up to ${max!.toLocaleString()}`;
  };

  const transformedJobs = dbJobs.map((job) => ({
    id: job.$id,
    title: job.title,
    company: job.companies?.name || job.company || "Company",
    companyLogo: job.companies?.logo_url || "",
    location: job.location,
    salary: formatSalary(job.salary_min, job.salary_max, job.currency || "USD"),
    type: job.type as "full-time" | "part-time" | "internship" | "remote" | "contract",
    featured: job.featured || false,
    postedDate: job.posted_date,
  }));

  const hasJobs = transformedJobs.length > 0;

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("q", searchTerm);
    if (locationTerm) params.set("location", locationTerm);
    trackJobSearch({ searchTerm, location: locationTerm, source: "home" });
    navigate(`/find-jobs?${params.toString()}`);
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background pt-24 pb-20 lg:pt-32 lg:pb-28 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
        {/* Background elements */}
      


        <div className="container relative mx-auto px-4">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            {/* Eyebrow */}
           

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6 leading-[1.05]">
              Find the right job,{" "}
              <em className="not-italic text-primary relative">
                faster
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 180 10"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 7C40 2 90 2 178 7"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="text-primary/30"
                  />
                </svg>
              </em>
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl mb-10 leading-relaxed">
              A premium, high-performance job search engine built for the modern professional.
            </p>

            {/* Search Bar */}
            <div className="w-full max-w-2xl mx-auto mb-14">
              <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-xl shadow-black/5 dark:shadow-black/25 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-2 pl-3">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Input
                    placeholder="Job title, keywords, or company..."
                    className="h-11 border-0 bg-transparent text-sm shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <Button
                  size="default"
                  className="h-11 w-full shrink-0 rounded-xl px-6 text-sm font-semibold shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-primary/30 sm:w-auto"
                  onClick={handleSearch}
                >
                  Search Jobs
                </Button>
              </div>
            </div>

            {/* Quick filter pills */}
            {hasJobs && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-muted-foreground mr-1">Popular:</span>
                {["Remote", "Full Time", "Internship", "Contract"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => navigate(`/find-jobs?q=${tag.toLowerCase()}`)}
                    className="rounded-full border border-border bg-card hover:border-primary/30 hover:bg-primary/5 hover:text-primary px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How It Works */}
     <section className="py-20 border-y border-border bg-muted/20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-14">
         
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4 tracking-tight">
            How It Works
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Get from browsing to applying in three straightforward steps.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {steps.map((item, index) => (
            <div key={index} className="relative group flex flex-col">
              {/* Connector arrow between cards */}
              {index < 2 && (
                <div className="hidden md:flex absolute top-1/2 -right-5 -translate-y-1/2 z-10 items-center justify-center w-6">
                  <ArrowRight className="w-4 h-4 text-border" />
                </div>
              )}

              <div className="relative flex-1 bg-card border border-border rounded-2xl p-6 overflow-hidden transition-all duration-300 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
                {/* Faint step number watermark */}
                <span
                  className={`absolute -bottom-3 -right-1 text-7xl font-black leading-none select-none pointer-events-none font-mono ${item.stepColor}`}
                >
                  {item.step}
                </span>

                {/* Icon */}
                <div
                  className={`
                    inline-flex items-center justify-center
                    h-11 w-11 rounded-xl mb-5
                    border ${item.iconBorder} ${item.iconBg}
                    group-hover:scale-105 transition-transform duration-300
                  `}
                >
                  <item.icon className={`h-5 w-5 ${item.iconColor}`} strokeWidth={2} />
                </div>

                {/* Text */}
                <div className="relative">
                  <h3 className="text-base font-bold text-foreground mb-1.5">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

      {/* Featured Jobs Section */}
      {hasJobs && (
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-2">Fresh Listings</p>
                <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
                  Latest Openings
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Recently posted roles from top hiring teams
                </p>
              </div>
              <Link to="/find-jobs">
                <Button variant="outline" className="gap-2 rounded-xl hover:border-primary/30 hover:text-primary">
                  View All Jobs
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {jobsLoading ? (
              <PageLoader
                message="Loading jobs..."
                fullScreen={false}
                className="py-16"
              />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {transformedJobs.slice(0, 6).map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!hasJobs && !jobsLoading && !jobsError && (
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-lg mx-auto text-center bg-card border border-border rounded-2xl p-12">
              <div className="w-14 h-14 bg-primary/8 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Target className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Job Listings Coming Soon</h3>
              <p className="text-muted-foreground mb-7 text-sm leading-relaxed">
                We're building our collection of opportunities. Check back soon for new listings.
              </p>
              {!user && (
                <Link to="/signup">
                  <Button className="rounded-xl px-6">Create Account</Button>
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {jobsError && !jobsLoading && (
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-lg mx-auto text-center bg-card border border-destructive/20 rounded-2xl p-12">
              <div className="w-14 h-14 bg-destructive/8 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Unable To Load Jobs</h3>
              <p className="text-sm text-muted-foreground mb-7">{jobsErrorMessage}</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => refetch()} className="rounded-xl">
                  Try Again
                </Button>
                <Link to="/find-jobs">
                  <Button className="rounded-xl">Open Job Search</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section - Not logged in */}
      {!user && (
        <section className="py-20 bg-muted/30 border-t border-border">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-4">Get Started</p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-5">
                Ready to find your next role?
              </h2>
              <p className="text-muted-foreground mb-10 max-w-lg mx-auto leading-relaxed">
                Join thousands of job seekers who use Hirelypk to connect with hiring companies. It's completely free.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/signup">
                  <Button size="lg" className="rounded-xl px-8 h-12 shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all">
                    Get Started Free
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/find-jobs">
                  <Button size="lg" variant="outline" className="rounded-xl px-8 h-12 hover:border-primary/30 hover:text-primary">
                    Browse Jobs
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Logged-in user quick actions */}
      {user && (
        <section className="py-20 border-t border-border">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto bg-primary rounded-2xl p-10 md:p-14 text-center text-primary-foreground relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
                <div className="absolute -bottom-10 left-10 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
              </div>
              <div className="relative">
                <h2 className="text-2xl md:text-3xl font-bold mb-3">Welcome back 👋</h2>
                <p className="text-primary-foreground/75 mb-10 max-w-xl mx-auto leading-relaxed">
                  Ready to discover your next opportunity? Browse our latest job listings.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/find-jobs">
                    <Button size="lg" variant="secondary" className="rounded-xl px-8 h-12 font-semibold">
                      <Search className="mr-2 w-4 h-4" />
                      Browse Jobs
                    </Button>
                  </Link>
                  <Link to="/profile">
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-xl bg-transparent border-white/25 text-white hover:bg-white/10 px-8 h-12"
                    >
                      My Profile
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
};

export default Index;
