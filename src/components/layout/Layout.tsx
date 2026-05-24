import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";

// const UserReviewPopup = lazy(() => import("@/components/feedback/UserReviewPopup"));

interface LayoutProps {
  children: ReactNode;
  hideFooter?: boolean;
}

const Layout = ({ children, hideFooter = false }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg"
      >
        Skip to content
      </a>
      <Header />
      <main id="main-content" className="flex-1">{children}</main>
      {!hideFooter && <Footer />}
      {/* Help improve Hirelypk popup disabled by request.
      <Suspense fallback={null}>
        <UserReviewPopup />
      </Suspense>
      */}
    </div>
  );
};

export default Layout;
