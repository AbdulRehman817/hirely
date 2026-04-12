/**
 * Email Service for sending Gmail notifications
 * This service handles sending emails to job seekers and recruiters
 * 
 * SETUP REQUIRED:
 * 1. Set up Appwrite Functions or a backend endpoint
 * 2. Configure Gmail API credentials or use a third-party service (SendGrid, Mailgun)
 * 3. Set VITE_EMAIL_SERVICE_ENDPOINT in .env file
 */

const EMAIL_SERVICE_ENDPOINT = import.meta.env.VITE_EMAIL_SERVICE_ENDPOINT || '';

export type NotificationType = 'shortlisted' | 'rejected' | 'hired' | 'application_received' | 'application_submitted';

interface EmailPayload {
  to: string;
  type: NotificationType;
  data: Record<string, any>;
}

/**
 * Sends an email via backend service or Appwrite Function
 */
const sendEmailViaBackend = async (payload: EmailPayload): Promise<boolean> => {
  if (!EMAIL_SERVICE_ENDPOINT) {
    console.warn('Email service endpoint not configured. Email not sent.');
    console.log('Configure VITE_EMAIL_SERVICE_ENDPOINT to enable email notifications.');
    return false;
  }

  try {
    const response = await fetch(EMAIL_SERVICE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Email service error:', response.statusText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

/**
 * Send email to job seeker when shortlisted
 */
export const sendShortlistedEmail = async (
  candidateEmail: string,
  candidateName: string,
  jobTitle: string,
  companyName: string,
  jobId: string
): Promise<void> => {
  try {
    await sendEmailViaBackend({
      to: candidateEmail,
      type: 'shortlisted',
      data: {
        candidateName,
        jobTitle,
        companyName,
        jobId,
      },
    });
  } catch (error) {
    console.error('Error sending shortlisted email:', error);
  }
};

/**
 * Send email to job seeker when rejected
 */
export const sendRejectedEmail = async (
  candidateEmail: string,
  candidateName: string,
  jobTitle: string,
  companyName: string
): Promise<void> => {
  try {
    await sendEmailViaBackend({
      to: candidateEmail,
      type: 'rejected',
      data: {
        candidateName,
        jobTitle,
        companyName,
      },
    });
  } catch (error) {
    console.error('Error sending rejected email:', error);
  }
};

/**
 * Send email to job seeker when hired
 */
export const sendHiredEmail = async (
  candidateEmail: string,
  candidateName: string,
  jobTitle: string,
  companyName: string
): Promise<void> => {
  try {
    await sendEmailViaBackend({
      to: candidateEmail,
      type: 'hired',
      data: {
        candidateName,
        jobTitle,
        companyName,
      },
    });
  } catch (error) {
    console.error('Error sending hired email:', error);
  }
};

/**
 * Send email to recruiter when they receive an application
 */
export const sendApplicationReceivedEmail = async (
  recruiterEmail: string,
  recruiterName: string,
  candidateName: string,
  candidateEmail: string,
  jobTitle: string,
  companyName: string
): Promise<void> => {
  try {
    await sendEmailViaBackend({
      to: recruiterEmail,
      type: 'application_received',
      data: {
        recruiterName,
        candidateName,
        candidateEmail,
        jobTitle,
        companyName,
      },
    });
  } catch (error) {
    console.error('Error sending application received email:', error);
  }
};

/**
 * Send confirmation email to job seeker when they submit an application
 */
export const sendApplicationSubmittedEmail = async (
  candidateEmail: string,
  candidateName: string,
  jobTitle: string,
  companyName: string
): Promise<void> => {
  try {
    await sendEmailViaBackend({
      to: candidateEmail,
      type: 'application_submitted',
      data: {
        candidateName,
        jobTitle,
        companyName,
      },
    });
  } catch (error) {
    console.error('Error sending application submitted email:', error);
  }
};
