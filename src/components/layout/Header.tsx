import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Menu, X, User, LogOut, Home, Search, PlusCircle, Info, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Permission, Role } from "appwrite";
import { getAvatarUrl } from "@/lib/avatar";


import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { databases, DATABASE_ID, COLLECTIONS, Query, storage, BUCKETS, ID } from "@/lib/appwrite";
import {  useAuth } from "@/contexts/AuthContext";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import BrandLogo from "./BrandLogo";


const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole, profile, signOut, refreshProfile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const { toast } = useToast();

  // Navigation links - consistent for all users
  const mainNavLinks = [
    { label: "Home", path: "/", icon: Home },
    { label: "Find Jobs", path: "/find-jobs", icon: Search },
    { label: "About", path: "/about", icon: Info },
  ];



  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const uploaded = await storage.createFile(
        BUCKETS.RESUMES,
        ID.unique(),
        file,
        [
          Permission.read(Role.any()),
          Permission.update(Role.user(user.id)),
          Permission.delete(Role.user(user.id)),
        ]
      );

      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PROFILES,
        [Query.equal("user_id", user.id)]
      );

      if (documents.length > 0) {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.PROFILES,
          documents[0].$id,
          { avatar_url: uploaded.$id }
        );
      }

      await refreshProfile();
      toast({
        title: "Profile image updated",
        description: "Your profile picture has been updated.",
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to upload profile picture";

      toast({
        title: "Avatar upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  const navLinks = [
    ...mainNavLinks,
    ...(userRole === "employer"
      ? [
          { label: "Dashboard", path: "/employer-dashboard", icon: LayoutDashboard },
          { label: "Post a Job", path: "/post-job", icon: PlusCircle },
        ]
      : []),
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path.split("?")[0]);
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    const handleOutsideClick = (event: MouseEvent) => {
      if (!headerRef.current) return;
      if (!headerRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [mobileMenuOpen]);

  const handleSignOut = async () => {
    setMobileMenuOpen(false);
    await signOut();
    navigate("/signin");
  };

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="container mx-auto h-16 px-4">
        <div className="flex h-full items-center justify-between gap-3">
          <Link to="/" className="flex items-center shrink-0">
            <BrandLogo
              className="gap-3"
              imageWrapperClassName="h-12 w-12"
              textClassName="text-xl sm:text-2xl"
            />
          </Link>

          <nav className="hidden md:flex flex-1 items-center justify-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                 isActive(link.path)
                    ? "text-primary bg-primary/8"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            {user ? (
              <>
                <NotificationDropdown />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="hidden md:flex items-center gap-2 px-2">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                        {getAvatarUrl(profile?.avatar_url) ? (
                          <img
                            src={getAvatarUrl(profile?.avatar_url) ?? ""}
                            alt=""
                             loading="lazy"
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-medium block leading-tight">
                          {profile?.full_name || "User"}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {userRole}
                        </span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-background border border-border">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium text-foreground">{profile?.full_name || "User"}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    {userRole === "employer" && (
                      <DropdownMenuItem asChild>
                        <Link to="/employer-dashboard">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to={userRole === "employer" ? "/recruiter-profile" : "/profile"}>
                        <User className="mr-2 h-4 w-4" />
                        My Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/signin" className="hidden md:block">
                  <Button className="bg-transparent text-[#0F1729]  dark:text-slate-100 ">
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup" className="hidden md:block">
                  <Button className="btn-primary">Get Started</Button>
                </Link>
              </>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden border border-border bg-card/70 hover:bg-muted"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "md:hidden absolute left-0 right-0 top-full border-b border-border bg-background/95 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/85 transition-all duration-200",
          mobileMenuOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0 pointer-events-none"
        )}
      >
        <div className="container mx-auto px-4 py-4">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive(link.path)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
                >
                  <link.icon className="h-5 w-5" />
                  {link.label}
                </Link>
              ))}
          </nav>

          <div className="mt-4 pt-4 border-t border-border">
            {user ? (
              <div className="space-y-2">
                <div className="rounded-lg bg-muted/60 px-4 py-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20 overflow-hidden shrink-0">
                    {getAvatarUrl(profile?.avatar_url) ? (
                      <img
                        src={getAvatarUrl(profile?.avatar_url) ?? ""}
                         loading="lazy"
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                {userRole === "employer" && (
                  <Link
                    to="/employer-dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    Dashboard
                  </Link>
                )}
                <Link
                  to={userRole === "employer" ? "/recruiter-profile" : "/profile"}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                >
                  <User className="h-5 w-5" />
                  My Profile
                </Link>
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive border-destructive/30 hover:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link to="/signin" onClick={() => setMobileMenuOpen(false)}>
                  <Button >Sign In</Button>
                </Link>
                <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="btn-primary w-full">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
