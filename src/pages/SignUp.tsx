import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, User, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSeo } from "@/hooks/useSeo";
import { cn } from "@/lib/utils";
import BrandLogo from "@/components/layout/BrandLogo";

const SignUp = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountType, setAccountType] = useState<"candidate" | "employer">("candidate");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  avatarFile: null as File | null,
avatarPreview: "",
    agreeTerms: false,
  });
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();

  useSeo({
    title: "Create Account",
    description: "Create a Hirelypk account to apply for jobs or hire top talent.",
    noIndex: true,
  });



  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormData((prev) => ({
      ...prev,
      avatarFile: file,
      avatarPreview: URL.createObjectURL(file),
    }));
  };


  const getSignupErrorMessage = (error: any) => {
    if (!error?.message) {
      return "Something went wrong. Please try again.";
    }
    const message = String(error.message).toLowerCase();
    if (message.includes("rate limit") || message.includes("too many")) {
      return "Signup emails are temporarily limited. Please wait a few minutes and try again.";
    }
    if (message.includes("user already registered") || message.includes("already registered")) {
      return "This email is already registered. Try signing in instead.";
    }
    return error.message;
  };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (formData.password !== formData.confirmPassword) {
    toast({
      title: "Passwords don't match",
      description: "Please make sure your passwords match.",
      variant: "destructive",
    });
    return;
  }

  if (!formData.agreeTerms) {
    toast({
      title: "Terms required",
      description: "Please agree to the terms and conditions.",
      variant: "destructive",
    });
    return;
  }

  setLoading(true);

  // Pass the avatar file to signUp - it will handle the upload
  const { error } = await signUp(
    formData.email,
    formData.password,
    formData.fullName,
    accountType,
    formData.avatarFile  // This is correct now
  );
  
  if (error) {
    toast({
      title: "Sign up failed",
      description: getSignupErrorMessage(error),
      variant: "destructive",
    });
  } else {
    toast({
      title: "Account created!",
      description:
        accountType === "employer"
          ? "Welcome! Complete your recruiter profile and add your company to start posting jobs."
          : "Welcome to Hirelypk! You are now signed in.",
    });
    navigate(accountType === "employer" ? "/recruiter-profile" : "/profile");
  }
  
  setLoading(false);
};

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Form */}
      <div className="flex flex-col justify-center px-4 sm:px-8 lg:px-16 py-12">
        {/* Logo */}
        <Link to="/" className="inline-flex items-center mb-12">
          <BrandLogo
            className="gap-3"
            imageWrapperClassName="h-11 w-11"
            textClassName="text-2xl"
          />
        </Link>

        <div className="max-w-md">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Create account.</h1>
          <p className="text-muted-foreground mb-8">
            Already have account?{" "}
            <Link to="/signin" className="text-primary hover:underline">
              Log In
            </Link>
          </p>

          {/* Account Type Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              onClick={() => setAccountType("candidate")}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                accountType === "candidate"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40",
              )}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Candidate</p>
                  <p className="text-xs text-muted-foreground">Apply for jobs</p>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setAccountType("employer")}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                accountType === "employer"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40",
              )}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Recruiter</p>
                  <p className="text-xs text-muted-foreground">Post jobs and hire</p>
                </div>
              </div>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Profile Picture Section */}
      <div className="flex flex-col items-center gap-3 pb-4 border-b">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ring-2 ring-primary/20">
                {formData.avatarPreview ? (
                  <img src={formData.avatarPreview}  loading="lazy" alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-primary/50" />
                )}
              </div>
              <label className="cursor-pointer text-sm text-primary hover:underline">
                Upload profile picture
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
              <p className="text-xs text-muted-foreground">JPG, PNG up to 5MB</p>
            </div>

            <Input
              type="text"
              placeholder="Full Name"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="h-12"
              required
            />

            <Input
              type="email"
              placeholder="Email address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="h-12"
              required
            />

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="h-12 pr-12"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="h-12 pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={formData.agreeTerms}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, agreeTerms: checked as boolean })
                }
                className="mt-0.5"
              />
              <span className="text-sm text-muted-foreground">
                I've read and agree with your{" "}
                <Link to="/terms" className="text-primary hover:underline">
                  Terms of Services
                </Link>
              </span>
            </label>

            <Button type="submit" className="w-full h-12 btn-primary" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
          
          </div>


        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block relative bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 to-slate-900/70" />
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-50"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&h=1600&fit=crop')"
          }}
        />
       
      </div>
    </div>
  );
};

export default SignUp;

