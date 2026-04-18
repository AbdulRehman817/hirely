import { useState, useRef, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Globe,
  Linkedin,
  Github,
  Save,
  Upload,
  Camera,
  FileText,
  Trash2,
  Download,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import Layout from "@/components/layout/Layout";
import PageLoader from "@/components/layout/PageLoader";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useResumeUpload } from "@/hooks/useResumeUpload";
import { useCandidateProfileCompletion } from "@/hooks/useProfileCompletion";
import { useMyApplicationStats } from "@/hooks/useApplications";
import { databases, DATABASE_ID, COLLECTIONS, Query, storage, BUCKETS, ID } from "@/lib/appwrite";
import { getAvatarUrl } from "@/lib/avatar";
import { dispatchFeedbackNudge } from "@/lib/feedbackPrompt";
import { Permission, Role } from "appwrite";

const Profile = () => {
  const { user, profile, loading, refreshProfile, userRole } = useAuth();
  const { toast } = useToast();
  const { uploadResume, deleteResume, uploading, getResumeUrl } = useResumeUpload();
  const profileCompletion = useCandidateProfileCompletion();
  const { data: applicationStats } = useMyApplicationStats();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    title: "",
    phone: "",
    location: "",
    bio: "",
    skills: "",
    education: "",
    experience_years: 0,
    website: "",
    linkedin_url: "",
    github_url: "",
  });

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        title: profile.title || "",
        phone: profile.phone || "",
        location: profile.location || "",
        bio: profile.bio || "",
        skills: profile.skills?.join(", ") || "",
        education: profile.education || "",
        experience_years: profile.experience_years || 0,
        website: profile.website || "",
        linkedin_url: profile.linkedin_url || "",
        github_url: (profile as any).github_url || "",
      });

      // Load resume URL if exists
      if (profile.resume_url) {
        getResumeUrl(profile.resume_url).then(setResumeUrl);
      }
    }
  }, [profile]);

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

  // Redirect employers to their own profile page
  if (userRole === "employer") {
    return <Navigate to="/recruiter-profile" replace />;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const path = await uploadResume(file);
      if (path) {
        const url = await getResumeUrl(path);
        setResumeUrl(url);
      }
    }
  };

  const handleDeleteResume = async () => {
    const success = await deleteResume();
    if (success) {
      setResumeUrl(null);
    }
  };

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
    } catch (error: any) {
      toast({
        title: "Avatar upload failed",
        description: error.message || "Failed to upload profile picture",
        variant: "destructive",
      });
    } finally {
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const skillsArray = formData.skills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      // Find the user's profile document
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
          {
            full_name: formData.full_name,
            title: formData.title,
            phone: formData.phone,
            location: formData.location,
            bio: formData.bio,
            skills: skillsArray,
            education: formData.education,
            experience_years: Number(formData.experience_years),
            website: formData.website,
            linkedin_url: formData.linkedin_url,
            github_url: formData.github_url,
          }
        );
      }

      await refreshProfile();
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      dispatchFeedbackNudge({
        source: "candidate_profile_saved",
        route: "/profile",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  return (
    <Layout>
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">My Profile</h1>
              <div className="text-sm text-muted-foreground">
                <Link to="/" className="hover:text-primary">Home</Link>
                <span className="mx-2">/</span>
                <Link to="/find-jobs" className="hover:text-primary">
                  Find Jobs
                </Link>
                <span className="mx-2">/</span>
                <span className="text-foreground">Profile</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Profile Completion</p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={profileCompletion.completionPercentage} className="h-2 w-24" />
                  <span className="text-sm font-medium">{profileCompletion.completionPercentage}%</span>
                </div>
              </div>
              {profileCompletion.isComplete && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Complete</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Applied", value: applicationStats?.total ?? 0 },
              { label: "Shortlisted", value: applicationStats?.shortlisted ?? 0 },
              { label: "Hired", value: applicationStats?.hired ?? 0 },
              { label: "Rejected", value: applicationStats?.rejected ?? 0 },
            ].map((stat) => (
              <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Profile Header Card */}
            <div className="bg-card border border-border rounded-xl p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {getAvatarUrl(profile?.avatar_url) ? (
                      <img
                        src={getAvatarUrl(profile?.avatar_url) ?? ""}
                        alt=""
                         loading="lazy"
                        className="w-32 h-32 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-16 w-16 text-primary" />
                    )}
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 rounded-full h-10 w-10"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title">Professional Title *</Label>
                      <Input
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="Software Developer"
                        required
                      />
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-card border border-border rounded-xl p-6 md:p-8">
              <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="New York, USA"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Professional Details */}
            <div className="bg-card border border-border rounded-xl p-6 md:p-8">
              <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Professional Details
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio *</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="Tell us about yourself..."
                    className="min-h-[120px]"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="skills">Skills (comma-separated) *</Label>
                    <Input
                      id="skills"
                      name="skills"
                      value={formData.skills}
                      onChange={handleInputChange}
                      placeholder="React, TypeScript, Node.js"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="experience_years">Years of Experience</Label>
                    <Input
                      id="experience_years"
                      name="experience_years"
                      type="number"
                      min="0"
                      value={formData.experience_years}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="education">Education</Label>
                  <Input
                    id="education"
                    name="education"
                    value={formData.education}
                    onChange={handleInputChange}
                    placeholder="Bachelor's in Computer Science"
                  />
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="bg-card border border-border rounded-xl p-6 md:p-8">
              <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Social Links
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="website" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin_url" className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </Label>
                  <Input
                    id="linkedin_url"
                    name="linkedin_url"
                    value={formData.linkedin_url}
                    onChange={handleInputChange}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="github_url" className="flex items-center gap-2">
                    <Github className="h-4 w-4" />
                    GitHub
                  </Label>
                  <Input
                    id="github_url"
                    name="github_url"
                    value={formData.github_url}
                    onChange={handleInputChange}
                    placeholder="https://github.com/username"
                  />
                </div>
              </div>
            </div>

            {/* Resume Upload */}
            <div className="bg-card border border-border rounded-xl p-6 md:p-8">
              <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Resume *
              </h3>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleResumeUpload}
                accept=".pdf,.doc,.docx"
                className="hidden"
              />
              {profile?.resume_url ? (
                <div className="border-2 border-primary/20 bg-primary/5 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Resume uploaded</p>
                        <p className="text-sm text-muted-foreground">PDF or Word document</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {resumeUrl && (
                        <a href={resumeUrl} target="_blank" rel="noopener noreferrer" download>
                          <Button type="button" variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </a>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Replace
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteResume}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium text-foreground mb-1">
                    {uploading ? "Uploading..." : "Click to upload your resume"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    PDF or Word document (max 10MB)
                  </p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button type="submit" className="btn-primary" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
