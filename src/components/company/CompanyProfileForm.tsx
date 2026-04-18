import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateCompany, Company } from "@/hooks/useCompanies";
import { useToast } from "@/hooks/use-toast";
import { Building2, Globe, MapPin, Users, Phone, Mail, Linkedin, Twitter } from "lucide-react";

interface CompanyProfileFormProps {
  company: Company;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CompanyProfileForm = ({ company, open, onOpenChange }: CompanyProfileFormProps) => {
  const { toast } = useToast();
  const updateCompany = useUpdateCompany();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    location: "",
    industry: "",
    size: "",
    founded: "",
    email: "",
    phone: "",
    linkedin_url: "",
    twitter_url: "",
    logo_url: "",
  });

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || "",
        description: company.description || "",
        website: company.website || "",
        location: company.location || "",
        industry: company.industry || "",
        size: company.size || "",
        founded: company.founded || "",
        email: company.email || "",
        phone: company.phone || "",
        linkedin_url: company.linkedin_url || "",
        twitter_url: company.twitter_url || "",
        logo_url: company.logo_url || "",
      });
    }
  }, [company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateCompany.mutateAsync({
        id: company.$id,
        ...formData,
      });
      toast({
        title: "Company updated",
        description: "Your company profile has been updated successfully.",
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Edit Company Profile
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Logo Section */}
          <div className="flex flex-col items-center gap-4 pb-6 border-b">
            <div className="h-24 w-24 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden ring-2 ring-primary/20">
              {formData.logo_url ? (
                <img src={formData.logo_url}  loading="lazy" alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-12 w-12 text-primary/50" />
              )}
            </div>
            <div className="space-y-2 w-full">
              <Label htmlFor="logo_url">Company Logo</Label>
              <Input
                id="logo_url"
                value={formData.logo_url}
                onChange={(e) => setFormData((prev) => ({ ...prev, logo_url: e.target.value }))}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-muted-foreground">Enter a URL to your company logo</p>
            </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData((prev) => ({ ...prev, industry: e.target.value }))}
                  placeholder="e.g., Technology, Finance"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Tell candidates about your company..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                    placeholder="City, Country"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Company Size</Label>
                <Select
                  value={formData.size}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, size: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10 employees</SelectItem>
                    <SelectItem value="11-50">11-50 employees</SelectItem>
                    <SelectItem value="51-200">51-200 employees</SelectItem>
                    <SelectItem value="201-500">201-500 employees</SelectItem>
                    <SelectItem value="501-1000">501-1000 employees</SelectItem>
                    <SelectItem value="1000+">1000+ employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
                    placeholder="https://example.com"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="founded">Founded Year</Label>
                <Input
                  id="founded"
                  value={formData.founded}
                  onChange={(e) => setFormData((prev) => ({ ...prev, founded: e.target.value }))}
                  placeholder="e.g., 2010"
                />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h4 className="font-medium text-foreground">Contact Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="contact@company.com"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 234 567 8900"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h4 className="font-medium text-foreground">Social Links</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn</Label>
                <Input
                  id="linkedin_url"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, linkedin_url: e.target.value }))}
                  placeholder="https://linkedin.com/company/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter_url">Twitter</Label>
                <Input
                  id="twitter_url"
                  value={formData.twitter_url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, twitter_url: e.target.value }))}
                  placeholder="https://twitter.com/..."
                />
              </div>
            </div>
          </div>

          {/* Logo URL */}
          <div className="space-y-2 pt-4 border-t border-border">
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input
              id="logo_url"
              value={formData.logo_url}
              onChange={(e) => setFormData((prev) => ({ ...prev, logo_url: e.target.value }))}
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-muted-foreground">
              Enter a URL to your company logo image
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateCompany.isPending}>
              {updateCompany.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyProfileForm;
