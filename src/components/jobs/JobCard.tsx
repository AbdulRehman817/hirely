import { Job } from "@/types";
import { Link } from "react-router-dom";
import { MapPin, Clock, Building2, ArrowUpRight } from "lucide-react";

interface JobCardProps {
  job: Job;
}

const JobCard = ({ job }: JobCardProps) => {
  const badgeClass = `badge-${job.type.toLowerCase().replace(/[\s-]+/g, "")}`;
  const postedDate = new Date(job.postedDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link to={`/job/${job.id}`} className="block h-full">
      <div className="group relative h-full overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:border-primary/35 hover:shadow-lg">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary/60 via-primary/20 to-transparent" />

        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-start gap-3">
                <div className="mt-0.5 h-11 w-11 rounded-xl border border-border/80 bg-muted/80 flex items-center justify-center overflow-hidden">
                  {job.companyLogo ? (
                    <img  loading="lazy"
                      src={job.companyLogo}
                      alt={`${job.company} logo`}
                      decoding="async"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="mb-1 line-clamp-1 text-xs font-medium text-muted-foreground">
                    {job.company}
                  </p>
                  <h3 className="line-clamp-2 font-heading text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                    {job.title}
                  </h3>
                </div>
              </div>
            </div>

            {job.featured && (
              <span className="badge-featured shrink-0">Featured</span>
            )}
          </div>

          {/* Tags */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className={badgeClass}>{job.type}</span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {job.location}
            </span>
          </div>

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between border-t border-border/70 pt-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{postedDate}</span>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5">
              View role
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default JobCard;
