import { useState } from "react";
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
import { useCreateJob } from "@/hooks/useJobs";
import { useMyCompanies, useCreateCompany } from "@/hooks/useCompanies";
import { useToast } from "@/hooks/use-toast";
import { dispatchFeedbackNudge } from "@/lib/feedbackPrompt";
import { X, Plus } from "lucide-react";

interface PostJobFormProps {
  onSuccess?: () => void;
}

const PostJobForm = ({ onSuccess }: PostJobFormProps) => {
  const { toast } = useToast();
  const { data: companies = [] } = useMyCompanies();
  const createJob = useCreateJob();
  const createCompany = useCreateCompany();

  const [formData, setFormData] = useState({
    title: "",
    company_id: "",
    location: "",
    type: "full-time" as "full-time" | "part-time" | "internship" | "remote" | "contract",
    salary_min: "",
    salary_max: "",
    currency: "USD" as "USD" | "PKR",
    experience_level: "",
    category: "",
    description: "",
    tags: [] as string[],
    requirements: [] as string[],
    responsibilities: [] as string[],
    benefits: [] as string[],
    status: "active" as "active" | "closed" | "draft",
    expiry_date: "",
  });

  const [newRequirement, setNewRequirement] = useState("");
  const [newResponsibility, setNewResponsibility] = useState("");
  const [newBenefit, setNewBenefit] = useState("");
  const [newTag, setNewTag] = useState("");
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: "",
    location: "",
    industry: "",
    website: "",
    description: "",
  });

  const handleAddToList = (
    list: "tags" | "requirements" | "responsibilities" | "benefits",
    value: string,
    setter: (val: string) => void
  ) => {
    const normalizedValue =
      list === "tags"
        ? value.trim().replace(/^#+/, "").replace(/\s+/g, "-")
        : value.trim();

    if (normalizedValue) {
      setFormData((prev) => ({
        ...prev,
        [list]: [...prev[list], normalizedValue],
      }));
      setter("");
    }
  };

  const handleRemoveFromList = (
    list: "tags" | "requirements" | "responsibilities" | "benefits",
    index: number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [list]: prev[list].filter((_, i) => i !== index),
    }));
  };

  const handleCreateCompany = async () => {
    if (!newCompany.name) {
      toast({
        title: "Company name required",
        description: "Please enter a company name.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await createCompany.mutateAsync(newCompany);
      setFormData((prev) => ({ ...prev, company_id: result.$id }));
      setShowCompanyForm(false);
      setNewCompany({ name: "", location: "", industry: "", website: "", description: "" });
      toast({
        title: "Company created",
        description: "Your company profile has been created.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to create company",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.company_id) {
      toast({
        title: "Company required",
        description: "Please select or create a company.",
        variant: "destructive",
      });
      return;
    }

    const salaryMin = formData.salary_min ? parseInt(formData.salary_min, 10) : null;
    const salaryMax = formData.salary_max ? parseInt(formData.salary_max, 10) : null;

    if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
      toast({
        title: "Invalid salary range",
        description: "Minimum salary cannot be greater than maximum salary.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload: any = {
        title: formData.title.trim(),
        company_id: formData.company_id,
        location: formData.location.trim(),
        type: formData.type,
        salary_min: salaryMin,
        salary_max: salaryMax,
        currency: formData.currency,
        experience_level: formData.experience_level || null,
        category: formData.category || null,
        description: formData.description.trim(),
        requirements: formData.requirements.length > 0 ? JSON.stringify(formData.requirements) : null,
        responsibilities: formData.responsibilities.length > 0 ? JSON.stringify(formData.responsibilities) : null,
        benefits: formData.benefits.length > 0 ? JSON.stringify(formData.benefits) : null,
        skills_required: formData.tags.length > 0 ? JSON.stringify(formData.tags) : null,
        status: formData.status,
        posted_date: new Date().toISOString(),
      };

      // Only include expiry_date when the user provided a value
      if (formData.expiry_date) {
        payload.expiry_date = formData.expiry_date;
      }

      await createJob.mutateAsync(payload);

      toast({
        title: "Job posted!",
        description: "Your job has been successfully posted.",
      });
      dispatchFeedbackNudge({ source: "job_posted", route: "/post-job" });

      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Failed to post job",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Company Selection */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Company Information</h3>
        
        {companies.length > 0 && !showCompanyForm ? (
          <div className="space-y-4">
            <div>
              <Label>Select Company</Label>
              <Select value={formData.company_id} onValueChange={(value) => setFormData((prev) => ({ ...prev, company_id: value }))}>
                <SelectTrigger className="mt-2 h-12">
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border">
                  {companies.map((company) => (
                    <SelectItem key={company.$id} value={company.$id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" onClick={() => setShowCompanyForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Company
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Company Name *</Label>
                <Input
                  value={newCompany.name}
                  onChange={(e) => setNewCompany((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter company name"
                  className="mt-2 h-12"
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={newCompany.location}
                  onChange={(e) => setNewCompany((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="City, Country"
                  className="mt-2 h-12"
                />
              </div>
              <div>
                <Label>Industry</Label>
                <Input
                  value={newCompany.industry}
                  onChange={(e) => setNewCompany((prev) => ({ ...prev, industry: e.target.value }))}
                  placeholder="e.g., Technology, Finance"
                  className="mt-2 h-12"
                />
              </div>
              <div>
                <Label>Website</Label>
                <Input
                  value={newCompany.website}
                  onChange={(e) => setNewCompany((prev) => ({ ...prev, website: e.target.value }))}
                  placeholder="https://example.com"
                  className="mt-2 h-12"
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newCompany.description}
                onChange={(e) => setNewCompany((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Tell us about your company..."
                className="mt-2"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" onClick={handleCreateCompany} disabled={createCompany.isPending}>
                {createCompany.isPending ? "Creating..." : "Create Company"}
              </Button>
              {companies.length > 0 && (
                <Button type="button" variant="outline" onClick={() => setShowCompanyForm(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Job Details */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Job Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Job Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Senior Software Engineer"
              className="mt-2 h-12"
              required
            />
          </div>

          <div>
            <Label>Job Type *</Label>
            <Select value={formData.type} onValueChange={(value: any) => setFormData((prev) => ({ ...prev, type: value }))}>
              <SelectTrigger className="mt-2 h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border">
                <SelectItem value="full-time">Full Time</SelectItem>
                <SelectItem value="part-time">Part Time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="internship">Internship</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Location *</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="e.g., New York, USA"
              className="mt-2 h-12"
              required
            />
          </div>

          <div>
            <Label>Currency</Label>
            <Select value={formData.currency} onValueChange={(value: "USD" | "PKR") => setFormData((prev) => ({ ...prev, currency: value }))}>
              <SelectTrigger className="mt-2 h-12">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border">
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="PKR">PKR - Pakistani Rupee</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Min Salary ({formData.currency}/year)</Label>
            <Input
              type="number"
              value={formData.salary_min}
              onChange={(e) => setFormData((prev) => ({ ...prev, salary_min: e.target.value }))}
              placeholder="e.g., 50000"
              className="mt-2 h-12"
            />
          </div>

          <div>
            <Label>Max Salary ({formData.currency}/year)</Label>
            <Input
              type="number"
              value={formData.salary_max}
              onChange={(e) => setFormData((prev) => ({ ...prev, salary_max: e.target.value }))}
              placeholder="e.g., 80000"
              className="mt-2 h-12"
            />
          </div>

          <div>
            <Label>Experience Level</Label>
            <Select value={formData.experience_level} onValueChange={(value) => setFormData((prev) => ({ ...prev, experience_level: value }))}>
              <SelectTrigger className="mt-2 h-12">
                <SelectValue placeholder="Select experience level" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border">
                <SelectItem value="entry">Entry Level</SelectItem>
                <SelectItem value="mid">Mid Level</SelectItem>
                <SelectItem value="senior">Senior Level</SelectItem>
                <SelectItem value="lead">Lead/Manager</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}>
              <SelectTrigger className="mt-2 h-12">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border">
                <SelectItem value="engineering">Engineering</SelectItem>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="technology">Technology & IT</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="hr">Human Resources</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
                <SelectItem value="customer_support">Customer Support</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Expiry Date</Label>
            <Input
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, expiry_date: e.target.value }))}
              className="mt-2 h-12"
            />
          </div>

          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(value: any) => setFormData((prev) => ({ ...prev, status: value }))}>
              <SelectTrigger className="mt-2 h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border">
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

      </div>

      {/* Job Description */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Job Description</h3>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Describe the job role, responsibilities, and what you're looking for..."
          rows={6}
          required
        />
      </div>

      {/* Tags */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Tags</h3>
        <div className="flex gap-2 mb-4">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add a tag (e.g., react, ui-ux, remote)"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddToList("tags", newTag, setNewTag);
              }
            }}
          />
          <Button type="button" onClick={() => handleAddToList("tags", newTag, setNewTag)}>
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.tags.map((tag, index) => (
            <div key={index} className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full">
              <span className="text-sm">#{tag}</span>
              <button type="button" onClick={() => handleRemoveFromList("tags", index)}>
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Requirements */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Requirements</h3>
        <div className="flex gap-2 mb-4">
          <Input
            value={newRequirement}
            onChange={(e) => setNewRequirement(e.target.value)}
            placeholder="Add a requirement..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddToList("requirements", newRequirement, setNewRequirement);
              }
            }}
          />
          <Button type="button" onClick={() => handleAddToList("requirements", newRequirement, setNewRequirement)}>
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.requirements.map((req, index) => (
            <div key={index} className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full">
              <span className="text-sm">{req}</span>
              <button type="button" onClick={() => handleRemoveFromList("requirements", index)}>
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Responsibilities */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Responsibilities</h3>
        <div className="flex gap-2 mb-4">
          <Input
            value={newResponsibility}
            onChange={(e) => setNewResponsibility(e.target.value)}
            placeholder="Add a responsibility..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddToList("responsibilities", newResponsibility, setNewResponsibility);
              }
            }}
          />
          <Button type="button" onClick={() => handleAddToList("responsibilities", newResponsibility, setNewResponsibility)}>
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.responsibilities.map((resp, index) => (
            <div key={index} className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full">
              <span className="text-sm">{resp}</span>
              <button type="button" onClick={() => handleRemoveFromList("responsibilities", index)}>
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Benefits</h3>
        <div className="flex gap-2 mb-4">
          <Input
            value={newBenefit}
            onChange={(e) => setNewBenefit(e.target.value)}
            placeholder="Add a benefit..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddToList("benefits", newBenefit, setNewBenefit);
              }
            }}
          />
          <Button type="button" onClick={() => handleAddToList("benefits", newBenefit, setNewBenefit)}>
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full">
              <span className="text-sm">{benefit}</span>
              <button type="button" onClick={() => handleRemoveFromList("benefits", index)}>
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => setFormData((prev) => ({ ...prev, status: "draft" }))}>
          Save as Draft
        </Button>
        <Button type="submit" className="btn-primary" disabled={createJob.isPending}>
          {createJob.isPending ? "Posting..." : "Post Job"}
        </Button>
      </div>
    </form>
  );
};

export default PostJobForm;
