import { Link } from "react-router-dom";
import { Search, MapPin, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Layout from "@/components/layout/Layout";
import PageLoader from "@/components/layout/PageLoader";
import { useCompanies } from "@/hooks/useCompanies";
import { useSeo } from "@/hooks/useSeo";
import { BRAND_NAME } from "@/lib/brand";

const Employers = () => {
  const { data: dbCompanies = [], isLoading } = useCompanies();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const canonical = origin ? `${origin}/employers` : undefined;
  const structuredData = canonical
    ? {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${BRAND_NAME} Employers`,
        description: "Explore hiring companies and open opportunities.",
        url: canonical,
      }
    : undefined;

  useSeo({
    title: "Employers",
    description: `Discover employers and explore open roles on ${BRAND_NAME}.`,
    keywords: ["hiring companies", "employers", "company profiles", "recruitment"],
    canonical,
    structuredData,
  });

  // Transform database companies
  const companies = dbCompanies.map((company) => ({
    id: company.$id,
    name: company.name,
    logo: company.logo_url || null,
    location: company.location || "Location not specified",
    openPositions: 0,
    featured: company.featured || false,
    industry: company.industry,
  }));

  return (
    <Layout>
      {/* Breadcrumb */}
      <div className="bg-secondary py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold text-foreground mb-2">Find Employers</h1>
          <div className="text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Find Employers</span>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by: Company name, Industry..."
                className="pl-10 h-12"
              />
            </div>
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="City, state or zip code"
                className="pl-10 h-12"
              />
            </div>
            <Button className="h-12 px-8 btn-primary">Find Company</Button>
          </div>
        </div>

        {/* Companies Grid */}
        {isLoading ? (
          <PageLoader
            message="Loading companies..."
            fullScreen={false}
            className="rounded-lg border border-border bg-card py-16"
          />
        ) : companies.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No companies found</h3>
            <p className="text-muted-foreground">Check back later for new companies</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {companies.map((company) => (
              <Link
                key={company.id}
                to={`/company/${company.id}`}
                className="company-card group"
              >
                <div className="w-16 h-16 bg-secondary rounded-lg flex items-center justify-center mx-auto mb-4 overflow-hidden">
                  {company.logo && company.logo.startsWith("http") ? (
                    <img loading="lazy"
                      src={company.logo}
                      alt={company.name}
                      className="w-10 h-10 object-contain"
                    />
                  ) : company.logo ? (
                    <span className="text-3xl">{company.logo}</span>
                  ) : (
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                  {company.name}
                </h3>
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-2">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{company.location}</span>
                </div>
                {company.featured && (
                  <span className="inline-block bg-primary/10 text-primary text-xs px-2 py-0.5 rounded">
                    Featured
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Employers;