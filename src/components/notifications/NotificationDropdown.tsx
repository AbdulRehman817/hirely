import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  BriefcaseBusiness,
  CheckCheck,
  PartyPopper,
  UserCheck,
  UserX,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationsCount,
} from "@/hooks/useNotifications";

const buildNotificationTarget = (notification: {
  type: string;
  job_id?: string | null;
}) => {
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

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "shortlisted":
      return <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-300" />;
    case "rejected":
      return <UserX className="h-4 w-4 text-red-600 dark:text-red-300" />;
    case "hired":
      return <PartyPopper className="h-4 w-4 text-green-600 dark:text-green-300" />;
    case "application_received":
      return <BriefcaseBusiness className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

const NotificationDropdown = () => {
  const navigate = useNavigate();
  const { data: notifications = [] } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="group relative transition-colors duration-200 hover:text-primary"
          aria-label="Open notifications"
        >
          <Bell className="h-5 w-5 group-hover:animate-[bell-slide-x_0.7s_ease-in-out_infinite]" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[min(92vw,22rem)] border border-border bg-background"
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="font-semibold text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            notifications.slice(0, 5).map((notification) => (
              <DropdownMenuItem
                key={notification.$id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 p-3",
                  !notification.is_read && "bg-primary/5"
                )}
                onClick={() => {
                  if (!notification.is_read) {
                    markRead.mutate(notification.$id);
                  }

                  navigate(buildNotificationTarget(notification));
                }}
              >
                <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", !notification.is_read && "font-medium")}>
                    {notification.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{notification.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.$createdAt), { addSuffix: true })}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </DropdownMenuItem>
            ))
          )}
        </div>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Link to="/notifications" className="block">
                <Button variant="outline" size="sm" className="w-full">
                  View All Notifications
                </Button>
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown;
