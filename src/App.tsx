import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, Suspense, lazy, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import PageLoader from "@/components/layout/PageLoader";
import { useSeo } from "@/hooks/useSeo";
import JobDetails from "./pages/JobDetails";
import AffiliateSlideIn from "./components/promo/AffiliateSlideIn";

const Index = lazy(() => import("./pages/Index"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const FindJobs = lazy(() => import("./pages/FindJobs"));
const Employers = lazy(() => import("./pages/Employers"));
const SavedJobs = lazy(() => import("./pages/SavedJobs"));
const EmployerDashboard = lazy(() => import("./pages/EmployerDashboard"));
const CompanyProfile = lazy(() => import("./pages/CompanyProfile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Profile = lazy(() => import("./pages/Profile"));
const RecruiterProfile = lazy(() => import("./pages/RecruiterProfile"));
const PostJob = lazy(() => import("./pages/PostJob"));
const NotFound = lazy(() => import("./pages/NotFound"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const PolicyPage = lazy(() => import("./pages/PolicyPage"));

const queryClient = new QueryClient();

const HashJobRouteBridge = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const hashPath = window.location.hash.replace(/^#/, "");

    if (location.pathname !== "/" || !hashPath.startsWith("/job/")) {
      return;
    }

    navigate(hashPath, { replace: true });
  }, [location.pathname, navigate]);

  return null;
};

const DashboardRedirect = () => {
  const { loading, user, userRole } = useAuth();

  useSeo({
    title: "Dashboard",
    description: "Account dashboard for Hirelypk members.",
    noIndex: true,
  });

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return <Navigate to={userRole === "employer" ? "/employer-dashboard" : "/profile"} replace />;
};

const NoIndexRoute = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) => {
  useSeo({ title, description, noIndex: true });

  return <>{children}</>;
};


const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="hirely-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AffiliateSlideIn />
          <BrowserRouter>
            <HashJobRouteBridge />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/find-jobs" element={<FindJobs />} />
                <Route path="/job/:id" element={<JobDetails />} />
                <Route path="/employers" element={<Employers />} />
                <Route path="/company/:id" element={<CompanyProfile />} />
                <Route path="/dashboard" element={<DashboardRedirect />} />
                <Route
                  path="/saved-jobs"
                  element={
                    <NoIndexRoute title="Saved Jobs" description="Saved jobs for your Hirelypk account.">
                      <SavedJobs />
                    </NoIndexRoute>
                  }
                />
                <Route
                  path="/employer-dashboard"
                  element={
                    <NoIndexRoute title="Employer Dashboard" description="Private employer dashboard on Hirelypk.">
                      <EmployerDashboard />
                    </NoIndexRoute>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <NoIndexRoute title="Notifications" description="Private Hirelypk account notifications.">
                      <Notifications />
                    </NoIndexRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <NoIndexRoute title="My Profile" description="Private Hirelypk candidate profile.">
                      <Profile />
                    </NoIndexRoute>
                  }
                />
                <Route
                  path="/recruiter-profile"
                  element={
                    <NoIndexRoute title="Recruiter Profile" description="Private Hirelypk recruiter profile.">
                      <RecruiterProfile />
                    </NoIndexRoute>
                  }
                />
                <Route
                  path="/post-job"
                  element={
                    <NoIndexRoute title="Post a Job" description="Private Hirelypk job posting page.">
                      <PostJob />
                    </NoIndexRoute>
                  }
                />
                <Route path="/about" element={<About />} />
                <Route path="/about-us" element={<Navigate to="/about" replace />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
                <Route path="/privacy-policy" element={<PolicyPage page="privacy" />} />
                <Route path="/terms" element={<Navigate to="/terms-and-conditions" replace />} />
                <Route path="/terms-and-conditions" element={<PolicyPage page="terms" />} />
                <Route path="/disclaimer" element={<PolicyPage page="disclaimer" />} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;