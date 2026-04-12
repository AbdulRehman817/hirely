import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, ID, COLLECTIONS, DATABASE_ID, Query } from "@/lib/appwrite";
import { Permission, Role } from "appwrite";
import { useAuth } from "@/contexts/AuthContext";

export interface Notification {
  $id: string;
  user_id: string;
  type: "shortlisted" | "rejected" | "hired" | "application_received" | "general";
  title: string;
  message: string;
  job_id: string | null;
  application_id: string | null;
  is_read: boolean;
  $createdAt: string;
}

const NOTIFICATION_BATCH_SIZE = 100;

const buildNotificationPermissions = (userId: string) => [
  Permission.read(Role.users()),
];

const fetchUserNotifications = async (userId: string) => {
  const results: Notification[] = [];
  let offset = 0;

  while (true) {
    const { documents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.NOTIFICATIONS,
      [
        Query.equal("user_id", userId),
        Query.orderDesc("$createdAt"),
        Query.limit(NOTIFICATION_BATCH_SIZE),
        Query.offset(offset),
      ]
    );

    results.push(...(documents as Notification[]));

    if (documents.length < NOTIFICATION_BATCH_SIZE) {
      break;
    }

    offset += NOTIFICATION_BATCH_SIZE;
  }

  return results;
};

export const useNotifications = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [] as Notification[];
      try {
        return await fetchUserNotifications(user.id);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }
    },
    enabled: !!user,
  });
};

export const useUnreadNotificationsCount = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notifications-unread-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      try {
        const notifications = await fetchUserNotifications(user.id);
        return notifications.filter((notification) => !notification.is_read).length;
      } catch (error) {
        console.error('Error fetching unread notifications count:', error);
        return 0;
      }
    },
    enabled: !!user,
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.NOTIFICATIONS,
          id,
          { is_read: true }
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      try {
        const documents = (await fetchUserNotifications(user.id)).filter(
          (notification) => !notification.is_read
        );

        // Mark each one as read
        await Promise.all(
          documents.map(notification =>
            databases.updateDocument(
              DATABASE_ID,
              COLLECTIONS.NOTIFICATIONS,
              notification.$id,
              { is_read: true }
            )
          )
        );
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
};

export const useCreateNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notification: Omit<Notification, "$id" | "$createdAt" | "is_read">) => {
      try {
        const document = await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.NOTIFICATIONS,
          ID.unique(),
          {
            user_id: notification.user_id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            job_id: notification.job_id || null,
            application_id: notification.application_id || null,
            is_read: false,
          },
          buildNotificationPermissions(notification.user_id)
        );
        return document as Notification;
      } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await databases.deleteDocument(
          DATABASE_ID,
          COLLECTIONS.NOTIFICATIONS,
          id
        );
      } catch (error) {
        console.error('Error deleting notification:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
};
