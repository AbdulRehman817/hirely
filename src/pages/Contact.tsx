import { Link } from "react-router-dom";
import { ExternalLink, Linkedin, Mail, MessageCircle } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useSeo } from "@/hooks/useSeo";
import {
  BRAND_CONTACT_EMAIL,
  BRAND_LINKEDIN_URL,
  BRAND_NAME,
  BRAND_SITE_URL,
  BRAND_WHATSAPP_COMMUNITY_URL,
} from "@/lib/brand";

const Contact = () => {
  const canonical = `${BRAND_SITE_URL}/contact`;

  useSeo({
    title: `Contact Us | ${BRAND_NAME}`,
    description:
      "Contact Hirelypk for job listing support, employer questions, partnership requests, and privacy inquiries.",
    canonical,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: `Contact ${BRAND_NAME}`,
      url: canonical,
      mainEntity: {
        "@type": "Organization",
        name: BRAND_NAME,
        url: BRAND_SITE_URL,
        email: BRAND_CONTACT_EMAIL,
        sameAs: [BRAND_LINKEDIN_URL],
      },
    },
  });

  return (
    <Layout>
      <section className="border-b border-border bg-muted/30 py-14">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
              Contact Us
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Get in touch with Hirelypk
            </h1>
            <p className="mt-5 text-base leading-7 text-muted-foreground">
              We respond to job seeker support, recruiter questions, content corrections,
              partnership requests, and privacy matters from this page.
            </p>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[1fr_0.8fr]">
          <div className="space-y-8">
            <div>
              <h2 className="mb-3 text-2xl font-semibold text-foreground">Support email</h2>
              <p className="mb-5 text-sm leading-7 text-muted-foreground">
                For the fastest response, include your account email, job URL, company
                name, and a short description of the issue.
              </p>
              <a href={`mailto:${BRAND_CONTACT_EMAIL}`}>
                <Button className="gap-2 rounded-xl">
                  <Mail className="h-4 w-4" />
                  {BRAND_CONTACT_EMAIL}
                </Button>
              </a>
            </div>

            <div>
              <h2 className="mb-3 text-2xl font-semibold text-foreground">What we can help with</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  "Job listing corrections or removal requests",
                  "Employer account and posting support",
                  "Candidate profile and application questions",
                  "Privacy, data, and policy inquiries",
                ].map((item) => (
                  <div key={item} className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <a
              href={BRAND_LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              <span className="flex items-center gap-3">
                <Linkedin className="h-5 w-5 text-sky-600" />
                LinkedIn
              </span>
              <ExternalLink className="h-4 w-4" />
            </a>

            <a
              href={BRAND_WHATSAPP_COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              <span className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-emerald-600" />
                WhatsApp community
              </span>
              <ExternalLink className="h-4 w-4" />
            </a>

            <div className="rounded-lg border border-border bg-muted/30 p-5">
              <h2 className="mb-2 text-lg font-semibold text-foreground">Policy pages</h2>
              <div className="space-y-2 text-sm">
                <Link to="/privacy-policy" className="block text-primary hover:underline">
                  Privacy Policy
                </Link>
                <Link to="/terms-and-conditions" className="block text-primary hover:underline">
                  Terms and Conditions
                </Link>
                <Link to="/disclaimer" className="block text-primary hover:underline">
                  Disclaimer
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
