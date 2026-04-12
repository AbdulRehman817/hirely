import { Link, Navigate } from "react-router-dom";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import PageLoader from "@/components/layout/PageLoader";
import { useAuth } from "@/contexts/AuthContext";
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const buildNotificationTarget = (notification: { type: string; job_id?: string | null }) => {
  const jobId = String(notification.job_id || "").trim();

  if (notification.type === "application_received") {
    return jobId
      ? `/employer-dashboard?tab=applications&job=${encodeURIComponent(jobId)}`
      : "/employer-dashboard?tab=applications";
  }

  if (jobId) {
    return `/job/${encodeURIComponent(jobId)}`;
  }

  return "/notifications";
};

const Notifications = () => {
  const { user, loading, userRole } = useAuth();
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  if (loading || isLoading) {
    return (
      <Layout>
        <PageLoader fullScreen={false} className="container mx-auto px-4 py-16" />
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "shortlisted":
        return "SL";
      case "rejected":
        return "RJ";
      case "hired":
        return "HI";
      case "application_received":
        return "AP";
      default:
        return "NT";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "shortlisted":
        return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800/60";
      case "rejected":
        return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800/60";
      case "hired":
        return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800/60";
      case "application_received":
        return "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800/60";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return (
    <Layout hideFooter>
      <div className="bg-secondary py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-foreground mb-3">Notifications</h1>
          <div className="text-base text-muted-foreground">
            <Link to="/" className="hover:text-primary">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Notifications</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <p className="text-lg text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                : "All caught up!"}
            </p>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="default"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="h-11 px-6"
              >
                <CheckCheck className="h-5 w-5 mr-2" />
                Mark all as read
              </Button>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            {notifications.length === 0 ? (
              <div className="p-20 text-center">
                <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-foreground mb-3">No notifications</h3>
                <p className="text-base text-muted-foreground">
                  You'll receive notifications when something important happens
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => {
                  const isRecruiterNotification =
                    userRole === "employer" && notification.type === "application_received";
                  const hasJobTarget = Boolean(notification.job_id);

                  return (
                    <div
                      key={notification.$id}
                      className={cn(
                        "p-6 sm:p-8 flex flex-col gap-6 sm:flex-row sm:items-start transition-colors",
                        !notification.is_read && "bg-primary/5"
                      )}
                    >
                      <div
                        className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 border",
                          getNotificationColor(notification.type)
                        )}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className={cn("text-foreground", !notification.is_read && "font-semibold")}>
                              {notification.title}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(new Date(notification.$createdAt), { addSuffix: true })}
                            </p>

                            {isRecruiterNotification && (
                              <Link
                                to={buildNotificationTarget(notification)}
                                className="inline-flex items-center mt-4 text-sm font-medium text-primary hover:underline"
                              >
                                Review application
                              </Link>
                            )}

                            {!isRecruiterNotification && hasJobTarget && (
                              <Link
                                to={buildNotificationTarget(notification)}
                                className="inline-flex items-center mt-4 text-sm font-medium text-primary hover:underline"
                              >
                                View job
                              </Link>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => markRead.mutate(notification.$id)}
                                className="h-8 w-8"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteNotification.mutate(notification.$id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Notifications;
