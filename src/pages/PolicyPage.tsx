import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { useSeo } from "@/hooks/useSeo";
import {
  BRAND_CONTACT_EMAIL,
  BRAND_NAME,
  BRAND_SITE_URL,
} from "@/lib/brand";

type PolicyPageType = "privacy" | "terms" | "disclaimer";

interface PolicySection {
  title: string;
  paragraphs: string[];
}

const LAST_UPDATED = "May 24, 2026";

const policyContent: Record<
  PolicyPageType,
  {
    title: string;
    eyebrow: string;
    description: string;
    path: string;
    sections: PolicySection[];
  }
> = {
  privacy: {
    title: "Privacy Policy",
    eyebrow: "Privacy",
    path: "/privacy-policy",
    description:
      "Learn how Hirelypk collects, uses, protects, and shares information for job seekers, recruiters, analytics, and advertising.",
    sections: [
      {
        title: "Information we collect",
        paragraphs: [
          "We collect account details such as name, email address, role, profile information, company information, resumes or profile images you choose to upload, job posts, applications, saved jobs, and messages or support requests you send us.",
          "We also collect technical information such as device type, browser, pages visited, referring pages, approximate location, and usage events through analytics tools so we can improve performance, security, and user experience.",
        ],
      },
      {
        title: "How we use information",
        paragraphs: [
          "We use your information to operate Hirelypk, show job listings, process applications, help employers manage hiring workflows, prevent abuse, respond to support requests, and improve search, navigation, and site reliability.",
          "We may use aggregated, non-identifying analytics to understand which job categories, cities, and pages are useful to visitors.",
        ],
      },
      {
        title: "Cookies, analytics, and advertising",
        paragraphs: [
          "Hirelypk uses Google Analytics to measure traffic and engagement. If Google AdSense or other advertising products are enabled, Google and its partners may use cookies or similar technologies to serve and measure ads based on visits to this and other websites.",
          "You can manage cookies through your browser settings and can learn more about Google's advertising controls at https://policies.google.com/technologies/ads.",
        ],
      },
      {
        title: "Sharing and disclosure",
        paragraphs: [
          "When a candidate applies for a job, relevant application details may be shared with the employer or recruiter responsible for that listing. Public company profiles and active job posts may be visible to all visitors.",
          "We do not sell personal information. We may share information with service providers that help us run hosting, database, storage, analytics, email, security, and support systems, or when required by law.",
        ],
      },
      {
        title: "Data choices and contact",
        paragraphs: [
          "You can update account and profile details from your Hirelypk account. To request access, correction, deletion, or privacy support, contact us at hirely.contact@gmail.com.",
          "We keep information only as long as needed for legitimate platform, legal, security, and operational purposes.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms and Conditions",
    eyebrow: "Terms",
    path: "/terms-and-conditions",
    description:
      "Read the terms that govern job seeker, recruiter, employer, and visitor use of Hirelypk.",
    sections: [
      {
        title: "Acceptance of terms",
        paragraphs: [
          `By using ${BRAND_NAME}, you agree to these Terms and Conditions. If you do not agree, please stop using the website and related services.`,
          "You are responsible for keeping your account information accurate and for maintaining the confidentiality of your login credentials.",
        ],
      },
      {
        title: "Job seeker responsibilities",
        paragraphs: [
          "Candidates must provide truthful profile, resume, and application information. You should independently verify job details, employer identity, compensation, location, and working conditions before accepting any offer.",
          "Do not submit misleading applications, spam employers, upload harmful files, or misuse contact information found through the platform.",
        ],
      },
      {
        title: "Employer and recruiter responsibilities",
        paragraphs: [
          "Employers and recruiters must post accurate, lawful, non-discriminatory job listings and must have permission to represent the hiring company. Listings must not request illegal payments, sensitive information unrelated to hiring, or deceptive application actions.",
          "Hirelypk may edit, unpublish, or remove listings that appear misleading, expired, duplicated, unsafe, spammy, or inconsistent with our quality standards.",
        ],
      },
      {
        title: "Platform availability",
        paragraphs: [
          "We work to keep Hirelypk available and useful, but we do not guarantee uninterrupted access, exact job availability, successful applications, interviews, hiring outcomes, or employer responses.",
          "External links may take you to third-party websites. Those websites are responsible for their own content, privacy practices, and application processes.",
        ],
      },
      {
        title: "Changes and contact",
        paragraphs: [
          "We may update these terms as Hirelypk grows. Continued use of the website after updates means you accept the revised terms.",
          `Questions about these terms can be sent to ${BRAND_CONTACT_EMAIL}.`,
        ],
      },
    ],
  },
  disclaimer: {
    title: "Disclaimer",
    eyebrow: "Disclaimer",
    path: "/disclaimer",
    description:
      "Important limitations about job listings, employer information, external links, career content, and advertising on Hirelypk.",
    sections: [
      {
        title: "General information",
        paragraphs: [
          "Hirelypk provides job listings, company profiles, and career-related information for general informational purposes. We are not a recruitment agency, legal advisor, financial advisor, or employer of record for listed roles unless explicitly stated.",
          "Although we aim to keep information accurate and useful, job details can change after publication. Always confirm salary, eligibility, deadlines, location, contract terms, and employer identity before applying or accepting an offer.",
        ],
      },
      {
        title: "No hiring guarantee",
        paragraphs: [
          "Using Hirelypk does not guarantee an interview, job offer, hiring decision, employee performance, candidate quality, or employer response.",
          "Employers remain responsible for hiring decisions, and candidates remain responsible for evaluating opportunities and sharing information safely.",
        ],
      },
      {
        title: "External links and advertisements",
        paragraphs: [
          "Some job posts and resources may link to external websites. We do not control third-party sites and are not responsible for their content, security, privacy practices, or application forms.",
          "If advertisements appear on Hirelypk, they are clearly separated from navigation and content areas. Ad appearance does not imply endorsement by Hirelypk.",
        ],
      },
      {
        title: "Corrections",
        paragraphs: [
          `If you believe a job post, company profile, or page contains inaccurate or inappropriate information, contact ${BRAND_CONTACT_EMAIL} with the URL and details so we can review it.`,
        ],
      },
    ],
  },
};

const PolicyPage = ({ page }: { page: PolicyPageType }) => {
  const content = policyContent[page];
  const canonical = `${BRAND_SITE_URL}${content.path}`;

  useSeo({
    title: `${content.title} | ${BRAND_NAME}`,
    description: content.description,
    canonical,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `${content.title} | ${BRAND_NAME}`,
      description: content.description,
      url: canonical,
      dateModified: "2026-05-24",
      publisher: {
        "@type": "Organization",
        name: BRAND_NAME,
        url: BRAND_SITE_URL,
      },
    },
  });

  return (
    <Layout>
      <section className="border-b border-border bg-muted/30 py-14">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
              {content.eyebrow}
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {content.title}
            </h1>
            <p className="mt-5 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
            <p className="mt-5 text-base leading-7 text-muted-foreground">{content.description}</p>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <article className="max-w-3xl space-y-10">
            {content.sections.map((section) => (
              <section key={section.title}>
                <h2 className="mb-4 text-2xl font-semibold text-foreground">{section.title}</h2>
                <div className="space-y-4 text-sm leading-7 text-muted-foreground">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </article>

          <aside className="h-fit rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-base font-semibold text-foreground">Trust pages</h2>
            <div className="space-y-3 text-sm">
              <Link to="/about" className="block text-muted-foreground hover:text-primary">
                About Us
              </Link>
              <Link to="/contact" className="block text-muted-foreground hover:text-primary">
                Contact Us
              </Link>
              <Link to="/privacy-policy" className="block text-muted-foreground hover:text-primary">
                Privacy Policy
              </Link>
              <Link to="/terms-and-conditions" className="block text-muted-foreground hover:text-primary">
                Terms and Conditions
              </Link>
              <Link to="/disclaimer" className="block text-muted-foreground hover:text-primary">
                Disclaimer
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </Layout>
  );
};

export default PolicyPage;
