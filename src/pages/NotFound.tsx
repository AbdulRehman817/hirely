import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useSeo } from "@/hooks/useSeo";

const NotFound = () => {
  const location = useLocation();

  useSeo({
    title: "Page Not Found",
    description: "The page you requested could not be found on Hirelypk.",
    noIndex: true,
  });

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Page not found</p>
        <Link to="/" className="text-primary underline underline-offset-4 hover:text-primary/90">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
