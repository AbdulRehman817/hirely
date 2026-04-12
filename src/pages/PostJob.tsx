import { Link, Navigate } from "react-router-dom";
import { Briefcase, Building2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import PageLoader from "@/components/layout/PageLoader";
import { Button } from "@/components/ui/button";
import PostJobForm from "@/components/employer/PostJobForm";
import { useAuth } from "@/contexts/AuthContext";
import { useEmployerProfileCompletion } from "@/hooks/useProfileCompletion";

const PostJob = () => {
  const { user, loading, userRole } = useAuth();
  const profileCompletion = useEmployerProfileCompletion();

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

  return (
    <Layout>
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Post a Job</h1>
              <p className="text-muted-foreground">
                Create a new role and start receiving qualified applications.
              </p>
            </div>
            <Link to="/employer-dashboard">
              <Button variant="outline">
                <Briefcase className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {!profileCompletion.isComplete ? (
          <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-amber-900/30">
              <Building2 className="h-8 w-8 text-amber-600 dark:text-amber-300" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Complete Your Recruiter Profile
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Recruiters must complete their profile and add a company name before posting jobs.
            </p>
            <Link to="/recruiter-profile">
              <Button className="btn-primary">Complete Profile</Button>
            </Link>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <PostJobForm />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PostJob;
