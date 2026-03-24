import { Client, Account, Databases, Storage, ID } from 'appwrite';

const client = new Client();

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;

if (!endpoint || !projectId) {
  throw new Error('Missing Appwrite environment variables. Set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID.');
}

client
  .setEndpoint(endpoint)
  .setProject(projectId);



const originalPrepareRequest = (client as any).prepareRequest.bind(client);
(client as any).prepareRequest = function patchedPrepareRequest(
  method: string,
  url: URL,
  headers: Record<string, string> = {},
  params: Record<string, unknown> = {}
) {
  const normalizedMethod = method.toUpperCase();
  const contentType = String(headers['content-type'] || headers['Content-Type'] || '').toLowerCase();
  const isJsonRequest = normalizedMethod !== 'GET' && contentType.startsWith('application/json');

  if (!isJsonRequest) {
    return originalPrepareRequest(method, url, headers, params);
  }

  const prepared = originalPrepareRequest(
    method,
    url,
    { ...headers, 'content-type': 'multipart/form-data' },
    params
  );

  prepared.options.body = JSON.stringify(params, (_key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
  (prepared.options.headers as Record<string, string>)['content-type'] = 'application/json';

  return prepared;
};


const originalCall = (client as any).call.bind(client);
(client as any).call = async function patchedCall(
  method: string,
  url: URL,
  headers: Record<string, string> = {},
  params: Record<string, unknown> = {},
  responseType = 'json'
) {
  try {
    return await originalCall(method, url, headers, params, responseType);
  } catch (error: any) {
    const normalizedMessage = String(error?.message || '').toLowerCase();
    const isBigNumberRuntimeError =
      normalizedMessage.includes('isbignumber') && normalizedMessage.includes('not a function');

    if (!isBigNumberRuntimeError) {
      throw error;
    }

    const { uri, options } = (client as any).prepareRequest(method, url, headers, params);
    const response = await fetch(uri, options);

    let data: any = null;
    if (response.headers.get('content-type')?.includes('application/json')) {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } else if (responseType === 'arrayBuffer') {
      data = await response.arrayBuffer();
    } else {
      data = { message: await response.text() };
    }

    if (response.status >= 400) {
      const fallbackError = new Error(data?.message || `Appwrite request failed with status ${response.status}`) as Error & {
        code?: number;
        type?: string;
      };
      fallbackError.code = response.status;
      fallbackError.type = data?.type;
      throw fallbackError;
    }

    return data;
  }
};

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

const makeQuery = (method: string, attribute?: string, values?: unknown | unknown[]) => {
  const query: Record<string, unknown> = { method };

  if (attribute !== undefined) {
    query.attribute = attribute;
  }

  if (values !== undefined) {
    query.values = Array.isArray(values) ? values : [values];
  }

  return JSON.stringify(query, (_key, value) => (typeof value === 'bigint' ? value.toString() : value));
};

export const Query = {
  equal: (attribute: string, value: unknown | unknown[]) => makeQuery('equal', attribute, value),
  orderDesc: (attribute: string) => makeQuery('orderDesc', attribute),
  orderAsc: (attribute: string) => makeQuery('orderAsc', attribute),
  limit: (value: number) => makeQuery('limit', undefined, value),
  offset: (value: number) => makeQuery('offset', undefined, value),
};

let anonymousSessionPromise: Promise<void> | null = null;

export const ensureAnonymousSession = async () => {
  if (anonymousSessionPromise) {
    return anonymousSessionPromise;
  }

  anonymousSessionPromise = (async () => {
    try {
      await account.get();
      return;
    } catch {
      // No active session, continue with anonymous session creation.
    }

    try {
      await account.createAnonymousSession();
    } catch (error: any) {
      const message = String(error?.message || "").toLowerCase();
      const type = String(error?.type || "").toLowerCase();
      const alreadyHasSession =
        message.includes("session is active") ||
        message.includes("session already") ||
        type.includes("session_already_exists");

      if (alreadyHasSession) {
        return;
      }

      throw error;
    }
  })();

  try {
    await anonymousSessionPromise;
  } finally {
    anonymousSessionPromise = null;
  }
};

// Database and Collection IDs
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'jobfinder-db';

// Collection IDs
export const COLLECTIONS = {
  PROFILES: import.meta.env.VITE_APPWRITE_PROFILES_COLLECTION_ID || 'profiles',
  COMPANIES: import.meta.env.VITE_APPWRITE_COMPANIES_COLLECTION_ID || 'companies',
  JOBS: import.meta.env.VITE_APPWRITE_JOBS_COLLECTION_ID || 'jobs',
  JOB_APPLICATIONS: import.meta.env.VITE_APPWRITE_JOB_APPLICATIONS_COLLECTION_ID || 'job_applications',
  SAVED_JOBS: import.meta.env.VITE_APPWRITE_SAVED_JOBS_COLLECTION_ID || 'saved_jobs',
  NOTIFICATIONS: import.meta.env.VITE_APPWRITE_NOTIFICATIONS_COLLECTION_ID || 'notifications',
  FEEDBACK: import.meta.env.VITE_APPWRITE_FEEDBACK_COLLECTION_ID || 'feedback'
};

// Storage Bucket IDs
// Storage Bucket IDs
export const BUCKETS = {
  RESUMES: import.meta.env.VITE_APPWRITE_RESUMES_BUCKET_ID as string,
};

if (!BUCKETS.RESUMES) {
  throw new Error("Missing VITE_APPWRITE_RESUMES_BUCKET_ID");
}


export { ID };


export const createEmailPasswordSessionViaRest = async (email: string, password: string) => {
  return account.createEmailPasswordSession(email, password);
};



export default client;
