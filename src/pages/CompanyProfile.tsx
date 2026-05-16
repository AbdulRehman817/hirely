import { Link, useParams } from "react-router-dom";
import {
  MapPin,
  Globe,
  Users,
  Calendar,
  Building2,
  Briefcase,
  ExternalLink,
  Linkedin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import PageLoader from "@/components/layout/PageLoader";
import { useCompany, useCompanyJobs } from "@/hooks/useCompanies";
import { useSeo } from "@/hooks/useSeo";
import { useAuth } from "@/contexts/AuthContext";
import { BRAND_SITE_URL } from "@/lib/brand";
import { jobTypes } from "@/types";

const CompanyProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { data: company, isLoading: companyLoading } = useCompany(id || "");
  const { data: jobs = [], isLoading: jobsLoading } = useCompanyJobs(id || "");
  const { user, userRole } = useAuth();

  const companyName = company?.name || "Company Profile";
  const companyDescription = company?.description
    ? company.description.replace(/\s+/g, " ").slice(0, 160).trim()
    : "Explore company details and open roles on Hirelypk.";

  useSeo({
    title: companyName,
    description: companyDescription,
    canonical: company ? `${BRAND_SITE_URL}/company/${company.$id}` : undefined,
    image: company?.logo_url || undefined,
    type: "profile",
  });


  // Check if the current user is the owner of this company
  const isOwner = user && company && company.user_id === user.id;
  // Job seekers should not see contact information
  const showContactInfo = userRole === "employer" || isOwner;

  if (companyLoading) {
    return (
      <Layout>
        <PageLoader
          message="Loading company..."
          fullScreen={false}
          className="container mx-auto px-4 py-16"
        />
      </Layout>
    );
  }

  if (!company) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Company not found</h2>
          <p className="text-muted-foreground mb-6">The company you're looking for doesn't exist.</p>
          <Link to="/employers">
            <Button className="btn-primary">Browse Companies</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Breadcrumb */}
      <div className="bg-secondary py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold text-foreground mb-2">Company Profile</h1>
          <div className="text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link to="/employers" className="hover:text-primary">
              Employers
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{company.name}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Company Header */}
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-24 h-24 bg-secondary rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                  {company.logo_url ? (
                    <img  loading="lazy"
                      src={company.logo_url}
                      alt={company.name}
                      className="w-16 h-16 object-contain"
                    />
                  ) : (
                    <Building2 className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-foreground mb-2">{company.name}</h1>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {company.industry && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-4 w-4" />
                            {company.industry}
                          </span>
                        )}
                        {company.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {company.location}
                          </span>
                        )}
                        {company.size && (
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {company.size} employees
                          </span>
                        )}
                      </div>
                    </div>
                    {company.website && (
                      <a href={company.website} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Visit Website
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* About */}
            {company.description && (
              <div className="bg-card border border-border rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">About {company.name}</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {company.description}
                </p>
              </div>
            )}

            {/* Open Positions */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">
                Open Positions ({jobs.length})
              </h2>
              {jobsLoading ? (
                <PageLoader
                  message="Loading open positions..."
                  fullScreen={false}
                  className="bg-card py-8"
                />
              ) : jobs.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No open positions at the moment</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {jobs.map((job) => {
                    const typeConfig = jobTypes[job.type as keyof typeof jobTypes] || jobTypes["full-time"];
                    return (
                      <Link
                        key={job.id}
                        to={`/job/${job.id}`}
                        className="block p-4 border border-border rounded-lg hover:border-primary/30 hover:shadow-md transition-all"
                      >
                        <h3 className="font-semibold text-foreground mb-2">{job.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <span className={typeConfig.className}>{typeConfig.label}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {job.location}
                          </span>
                        </div>
                        {(job.salary_min || job.salary_max) && (
                          <p className="text-sm text-muted-foreground mt-2">
                            ${job.salary_min?.toLocaleString()} - ${job.salary_max?.toLocaleString()}
                          </p>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Company Info */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">Company Details</h3>
              <div className="space-y-4">
                {company.founded && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Founded</p>
                      <p className="font-medium text-foreground">{company.founded}</p>
                    </div>
                  </div>
                )}
                {company.industry && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Industry</p>
                      <p className="font-medium text-foreground">{company.industry}</p>
                    </div>
                  </div>
                )}
                {company.size && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Company Size</p>
                      <p className="font-medium text-foreground">{company.size}</p>
                    </div>
                  </div>
                )}
                {company.location && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium text-foreground">{company.location}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Info - Only show to employers or company owners */}
            {showContactInfo && (company.email || company.phone || company.website) && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6">Contact Information</h3>
                <div className="space-y-4">
                  {company.email && (
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <a href={`mailto:${company.email}`} className="text-primary hover:underline">
                        {company.email}
                      </a>
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <a href={`tel:${company.phone}`} className="text-primary hover:underline">
                        {company.phone}
                      </a>
                    </div>
                  )}
                  {company.website && (
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {company.website.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  )}
                </div>

                {/* Social Links */}
                {(company.linkedin_url || company.twitter_url) && (
                  <div className="mt-6 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-3">Follow us</p>
                    <div className="flex gap-2">
                      {company.linkedin_url && (
                        <a
                          href={company.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Linkedin className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Message for job seekers */}
            {!showContactInfo && (
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground text-center">
                  📧 Apply through job listings to contact this company
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CompanyProfile;

