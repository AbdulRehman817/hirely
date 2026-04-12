import { useState } from "react";
import { Permission, Role } from "appwrite";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { storage, databases, DATABASE_ID, COLLECTIONS, BUCKETS, ID, Query } from "@/lib/appwrite";

export const useResumeUpload = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const uploadResume = async (file: File): Promise<string | null> => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload a resume",
        variant: "destructive",
      });
      return null;
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or Word document",
        variant: "destructive",
      });
      return null;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return null;
    }

    setUploading(true);

    try {
      const fileId = ID.unique();

      // Delete existing resume if it exists
      if (profile?.resume_url) {
        try {
          await storage.deleteFile(BUCKETS.RESUMES, profile.resume_url);
        } catch (error) {
          console.warn('Could not delete existing resume:', error);
        }
      }

      // Upload new file
      await storage.createFile(
        BUCKETS.RESUMES,
        fileId,
        file,
        [
          Permission.read(Role.user(user.id)),
          Permission.update(Role.user(user.id)),
          Permission.delete(Role.user(user.id)),
        ]
      );

      // Update profile with new resume file ID
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PROFILES,
        [Query.equal('user_id', user.id)]
      );

      if (documents.length > 0) {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.PROFILES,
          documents[0].$id,
          { resume_url: fileId }
        );
      }

      await refreshProfile();

      toast({
        title: "Resume uploaded",
        description: "Your resume has been uploaded successfully",
      });

      return fileId;
    } catch (error: any) {
      console.error('Resume upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload resume",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const getResumeUrl = async (fileId: string): Promise<string | null> => {
    try {
      if (!fileId) return null;
      if (fileId.startsWith("http")) return fileId;
      const fileUrl = storage.getFileView(BUCKETS.RESUMES, fileId);
      return fileUrl.toString();
    } catch (error) {
      console.error('Error getting resume URL:', error);
      return null;
    }
  };

  const deleteResume = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      if (profile?.resume_url) {
        await storage.deleteFile(BUCKETS.RESUMES, profile.resume_url);
      }

      // Update profile to remove resume_url
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PROFILES,
        [Query.equal('user_id', user.id)]
      );

      if (documents.length > 0) {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.PROFILES,
          documents[0].$id,
          { resume_url: null }
        );
      }

      await refreshProfile();

      toast({
        title: "Resume deleted",
        description: "Your resume has been removed",
      });

      return true;
    } catch (error: any) {
      console.error('Resume delete error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    uploadResume,
    getResumeUrl,
    deleteResume,
    uploading,
  };
};
