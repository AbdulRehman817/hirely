import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSeo } from "@/hooks/useSeo";
import BrandLogo from "@/components/layout/BrandLogo";

const SignIn = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useToast();

  useSeo({
    title: "Sign In",
    description: "Sign in to Hirelypk to manage your job search and applications.",
    noIndex: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error, role } = await signIn(email, password);

    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    } else {
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      navigate(role === "employer" ? "/employer-dashboard" : "/");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Form */}
      <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12">
        <Link to="/" className="inline-flex items-center mb-10">
          <BrandLogo
            className="gap-3"
            imageWrapperClassName="h-11 w-11"
            textClassName="text-2xl"
          />
        </Link>

        <div className="max-w-sm">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Sign in</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Create one
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <span className="text-sm text-muted-foreground">Remember me</span>
              </label>
              <Link to="/contact" className="text-sm text-primary hover:underline">
                Need help signing in?
              </Link>
            </div>

            <Button type="submit" className="w-full h-11 btn-primary" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:flex relative bg-slate-900 items-end">
        <div className="absolute inset-0 bg-slate-900/80" />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&h=1600&fit=crop')"
          }}
        />
        
      </div>
    </div>
  );
};

export default SignIn;

