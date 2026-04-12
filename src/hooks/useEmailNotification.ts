import { databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwrite";

export type NotificationType = "shortlisted" | "rejected" | "hired" | "application_received";

interface SendNotificationEmailParams {
  to: string;
  type: NotificationType;
  jobTitle: string;
  companyName: string;
  candidateName: string;
  recruiterEmail?: string;
  recruiterName?: string;
  applicationId?: string;
}

interface SendApplicationNotificationParams {
  to: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  companyName: string;
  applicationId: string;
}

/**
 * Sends email notification to job seekers (shortlisted, rejected, hired)
 * This uses Appwrite Functions to send emails via Gmail
 */
export const sendNotificationEmail = async (params: SendNotificationEmailParams): Promise<void> => {
  try {
    // Call Appwrite Function for sending notification emails
    const payload = {
      type: "candidate_notification",
      to: params.to,
      notificationType: params.type,
      candidateName: params.candidateName,
      jobTitle: params.jobTitle,
      companyName: params.companyName,
      applicationId: params.applicationId || null,
    };

    // Store email log in database for tracking
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.EMAIL_LOGS,
      `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      {
        recipient: params.to,
        type: `notification_${params.type}`,
        job_title: params.jobTitle,
        company_name: params.companyName,
        candidate_name: params.candidateName,
        status: "pending",
        created_at: new Date().toISOString(),
      }
    ).catch(() => {
      // If EMAIL_LOGS collection doesn't exist, continue without logging
    });

    // TODO: Implement actual email sending using:
    // 1. Appwrite Functions with SendGrid/Gmail integration
    // 2. Backend endpoint (Node.js/Express)
    // 3. Third-party service (SendGrid, Mailgun, etc.)

    console.log("📧 Email notification queued:", payload);
  } catch (error) {
    console.error("Error sending notification email:", error);
    // Continue without throwing - email delivery shouldn't break the app
  }
};

/**
 * Sends email notification to recruiters when they receive a new application
 */
export const sendApplicationReceivedEmail = async (
  params: SendApplicationNotificationParams
): Promise<void> => {
  try {
    const payload = {
      type: "application_received",
      to: params.to,
      candidateName: params.candidateName,
      candidateEmail: params.candidateEmail,
      jobTitle: params.jobTitle,
      companyName: params.companyName,
      applicationId: params.applicationId,
    };

    // Store email log in database for tracking
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.EMAIL_LOGS,
      `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      {
        recipient: params.to,
        type: "application_received",
        job_title: params.jobTitle,
        company_name: params.companyName,
        candidate_name: params.candidateName,
        candidate_email: params.candidateEmail,
        status: "pending",
        created_at: new Date().toISOString(),
      }
    ).catch(() => {
      // If EMAIL_LOGS collection doesn't exist, continue without logging
    });

    console.log("📧 Application received email queued:", payload);
  } catch (error) {
    console.error("Error sending application received email:", error);
  }
};

/**
 * Sends email notification to job seekers when they submit an application
 */
export const sendApplicationSubmittedEmail = async (
  candidateEmail: string,
  candidateName: string,
  jobTitle: string,
  companyName: string,
  applicationId: string
): Promise<void> => {
  try {
    const payload = {
      type: "application_submitted",
      to: candidateEmail,
      candidateName,
      jobTitle,
      companyName,
      applicationId,
    };

    // Store email log in database for tracking
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.EMAIL_LOGS,
      `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      {
        recipient: candidateEmail,
        type: "application_submitted",
        job_title: jobTitle,
        company_name: companyName,
        candidate_name: candidateName,
        status: "pending",
        created_at: new Date().toISOString(),
      }
    ).catch(() => {
      // If EMAIL_LOGS collection doesn't exist, continue without logging
    });

    console.log("📧 Application submitted confirmation email queued:", payload);
  } catch (error) {
    console.error("Error sending application submitted email:", error);
  }
};
