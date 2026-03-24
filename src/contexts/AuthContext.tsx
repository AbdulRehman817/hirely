import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Models } from "appwrite";
import { account, databases, DATABASE_ID, COLLECTIONS, ID, storage, BUCKETS, Query } from "@/lib/appwrite";

type UserRole = "candidate" | "employer" | null;

type AuthError = Error & {
  code?: number;
  type?: string;
  originalMessage?: string;
};

const clearCurrentSessionIfExists = async () => {
  try {
    await account.deleteSession("current");
  } catch {
    // Ignore when there is no active session.
  }
};

const getPlatformSetupMessage = () => {
  const origin = typeof window !== "undefined" ? window.location.origin : "your app URL";
  return `Your Appwrite session could not be established. Add ${origin} in Appwrite Console -> Project Settings -> Platforms (Web), then try again.`;
};

const normalizeAuthError = (error: unknown): AuthError => {
  const source = error as Partial<AuthError> | undefined;
  const rawMessage = String(source?.message || "").trim();
  const rawType = String(source?.type || "").trim();
  const normalized = new Error(rawMessage || "Something went wrong. Please try again.") as AuthError;

  if (typeof source?.code === "number") {
    normalized.code = source.code;
  }

  if (rawType) {
    normalized.type = rawType;
  }

  if (rawMessage) {
    normalized.originalMessage = rawMessage;
  }

  const combined = `${rawType} ${rawMessage}`.toLowerCase();

  if (
    (combined.includes("forbidden") && combined.includes("invalid origin")) ||
    (combined.includes("missing scopes") && combined.includes("account"))
  ) {
    normalized.message = getPlatformSetupMessage();
    return normalized;
  }

  if (
    combined.includes("user_already_exists") ||
    combined.includes("already exists") ||
    combined.includes("already registered")
  ) {
    normalized.message = "A user with this email already exists. Try signing in instead.";
    return normalized;
  }

  if (combined.includes("invalid credentials")) {
    normalized.message = "Invalid email or password.";
  }

  return normalized;
};

const isAnonymousAppwriteUser = (appwriteUser: Models.User<Models.Preferences>) => {
  return !appwriteUser.email || appwriteUser.email.trim().length === 0;
};

export interface Profile {
  id: string;
  email: string;
  role: "candidate" | "employer";
  full_name: string;
  avatar_url: string | null;
  title: string | null;
  location: string | null;
  bio: string | null;
  skills: string[] | null;
  education: string | null;
  experience_years: number | null;
  phone: string | null;
  linkedin_url: string | null;
  facebook_url: string | null;
  github_url: string | null;
  website: string | null;
  resume_url: string | null;
}

interface AuthContextType {
  user: { id: string; email: string } | null;
  userRole: UserRole;
  profile: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: "candidate" | "employer",
    avatarFile?: File | null
  ) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any; role?: "candidate" | "employer" }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const mapProfile = (document: any): Profile => ({
    id: document.$id,
    email: document.email || "",
    role: (document.role || "candidate") as "candidate" | "employer",
    full_name: document.full_name || "",
    avatar_url: document.avatar_url || null,
    title: document.title || null,
    location: document.location || null,
    bio: document.bio || null,
    skills: Array.isArray(document.skills) && document.skills.length > 0 ? document.skills : null,
    education: document.education || null,
    experience_years: document.experience_years ?? null,
    phone: document.phone || null,
    linkedin_url: document.linkedin_url || null,
    facebook_url: document.facebook_url || null,
    github_url: document.github_url || null,
    website: document.website || null,
    resume_url: document.resume_url || null,
  });

  const clearState = () => {
    setUser(null);
    setUserRole(null);
    setProfile(null);
  };

  const getProfileDocument = async (userId: string) => {
    try {
      const { documents } = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
        Query.equal("user_id", userId),
      ]);
      return documents[0] ?? null;
    } catch {
      const { documents } = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROFILES);
      return documents.find((doc) => doc.user_id === userId) ?? null;
    }
  };

  const ensureProfile = async (
    appwriteUser: Models.User<Models.Preferences>,
    overrides?: Partial<Profile>
  ) => {
    const payload = {
      user_id: appwriteUser.$id,
      email: overrides?.email || appwriteUser.email || "",
      role: (overrides?.role || "candidate") as "candidate" | "employer",
      full_name: overrides?.full_name || "",
      avatar_url: overrides?.avatar_url || null,
      title: overrides?.title || null,
      location: overrides?.location || null,
      bio: overrides?.bio || null,
      skills: overrides?.skills || null,
      education: overrides?.education || null,
      experience_years: overrides?.experience_years ?? null,
      phone: overrides?.phone || null,
      linkedin_url: overrides?.linkedin_url || null,
      github_url: overrides?.github_url || null,
      website: overrides?.website || null,
      resume_url: overrides?.resume_url || null,
    };

    try {
      const existingProfile = await getProfileDocument(appwriteUser.$id);

      if (existingProfile) {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, existingProfile.$id, payload);
        return { ...existingProfile, ...payload };
      }

      return await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.PROFILES,
        ID.unique(),
        payload
      );
    } catch (error) {
      console.error("AuthContext: Error in ensureProfile:", error);
      throw error;
    }
  };

  const loadProfile = async (appwriteUser: Models.User<Models.Preferences>) => {
    try {
      const existingProfile = await getProfileDocument(appwriteUser.$id);
      const profileDoc = existingProfile ?? await ensureProfile(appwriteUser);
      const mapped = mapProfile(profileDoc);

      setUser({ id: appwriteUser.$id, email: mapped.email || appwriteUser.email || "" });
      setUserRole(mapped.role);
      setProfile(mapped);
      return mapped;
    } catch (error) {
      console.error("AuthContext: Error loading profile:", error);
      clearState();
      throw error;
    }
  };

  const refreshProfile = async () => {
    try {
      const currentUser = await account.get();
      if (currentUser && !isAnonymousAppwriteUser(currentUser)) {
        await loadProfile(currentUser);
      } else {
        clearState();
      }
    } catch {
      clearState();
    }
  };

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      try {
        const currentUser = await account.get();
        if (!active) {
          return;
        }

        if (currentUser && !isAnonymousAppwriteUser(currentUser)) {
          await loadProfile(currentUser);
        } else {
          clearState();
        }
      } catch {
        clearState();
      }

      if (active) {
        setLoading(false);
      }
    };

    initialize();

    return () => {
      active = false;
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: "candidate" | "employer",
    avatarFile?: File | null
  ) => {
    try {
      await clearCurrentSessionIfExists();

      await account.create(ID.unique(), email, password, fullName);
      await account.createEmailPasswordSession(email, password);

      const currentUser = await account.get();

      let avatarUrl: string | null = null;
      if (avatarFile) {
        try {
          const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
          if (!allowedTypes.includes(avatarFile.type)) {
            throw new Error(`File type ${avatarFile.type} not allowed. Please use JPG, PNG, GIF, or WEBP.`);
          }

          if (avatarFile.size > 5 * 1024 * 1024) {
            throw new Error("File size too large. Maximum 5MB allowed.");
          }

          const uploaded = await storage.createFile(
            BUCKETS.RESUMES,
            ID.unique(),
            avatarFile
          );
          avatarUrl = uploaded.$id;
        } catch (uploadError) {
          console.error("AuthContext: Failed to upload avatar:", uploadError);
        }
      }

      await ensureProfile(currentUser, {
        email,
        full_name: fullName,
        role,
        avatar_url: avatarUrl,
      });

      await loadProfile(currentUser);

      return { error: null };
    } catch (error) {
      console.error("AuthContext: SignUp failed:", error);
      return { error: normalizeAuthError(error) };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await clearCurrentSessionIfExists();
      await account.createEmailPasswordSession(email, password);

      const currentUser = await account.get();
      const loadedProfile = await loadProfile(currentUser);

      return { error: null, role: loadedProfile.role };
    } catch (error) {
      console.error("AuthContext: SignIn failed:", error);
      return { error: normalizeAuthError(error) };
    }
  };

  const signOut = async () => {
    try {
      await account.deleteSession("current");
      clearState();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
