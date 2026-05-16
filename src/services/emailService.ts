import { Client, Functions } from "appwrite";

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const FUNCTION_ID = import.meta.env.VITE_APPWRITE_EMAIL_FUNCTION_ID;
const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;

export type NotificationType =
  | "shortlisted"
  | "rejected"
  | "hired"
  | "application_received"
  | "application_submitted";

interface EmailPayload {
  to: string;
  type: NotificationType;
  data: Record<string, any>;
}

const sendEmailViaBackend = async (payload: EmailPayload): Promise<boolean> => {
  if (!FUNCTION_ID) {
    console.warn("Email function ID not configured.");
    return false;
  }

  try {
    console.log("Sending email:", payload);

    // ✅ Use fetch directly to avoid isBigNumber bug
    const response = await fetch(
      `${ENDPOINT}/functions/${FUNCTION_ID}/executions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Appwrite-Project": PROJECT_ID,
        },
        body: JSON.stringify({ body: JSON.stringify(payload) }),
        credentials: "include",
      }
    );

    const result = await response.json();
    console.log(`✅ ${payload.type} email sent to ${payload.to}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return false;
  }
};

export const sendShortlistedEmail = async (
  candidateEmail: string,
  candidateName: string,
  jobTitle: string,
  companyName: string,
  jobId: string
): Promise<void> => {
  await sendEmailViaBackend({
    to: candidateEmail,
    type: "shortlisted",
    data: { candidateName, jobTitle, companyName, jobId },
  });
};

export const sendRejectedEmail = async (
  candidateEmail: string,
  candidateName: string,
  jobTitle: string,
  companyName: string
): Promise<void> => {
  await sendEmailViaBackend({
    to: candidateEmail,
    type: "rejected",
    data: { candidateName, jobTitle, companyName },
  });
};

export const sendHiredEmail = async (
  candidateEmail: string,
  candidateName: string,
  jobTitle: string,
  companyName: string
): Promise<void> => {
  await sendEmailViaBackend({
    to: candidateEmail,
    type: "hired",
    data: { candidateName, jobTitle, companyName },
  });
};

export const sendApplicationReceivedEmail = async (
  recruiterEmail: string,
  recruiterName: string,
  candidateName: string,
  candidateEmail: string,
  jobTitle: string,
  companyName: string
): Promise<void> => {
  await sendEmailViaBackend({
    to: recruiterEmail,
    type: "application_received",
    data: { recruiterName, candidateName, candidateEmail, jobTitle, companyName },
  });
};

export const sendApplicationSubmittedEmail = async (
  candidateEmail: string,
  candidateName: string,
  jobTitle: string,
  companyName: string
): Promise<void> => {
  await sendEmailViaBackend({
    to: candidateEmail,
    type: "application_submitted",
    data: { candidateName, jobTitle, companyName },
  });
};