
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Heart,
  MessageCircle,
  UserPlus,
  MessageSquare,
  LoaderCircle,
  AlertCircle,
  Check,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

const PAGE_SIZE = 50;

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  // ==========================================================
  // LOAD NOTIFICATIONS AND ACTOR PROFILES
  // ==========================================================

  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setError("");

      const { data: notificationData, error: notificationError } =
        await supabase
          .from("notifications")
          .select(`
            id,
            user_id,
            actor_id,
            type,
            title,
            body,
            reference_id,
            is_read,
            created_at
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE);

      if (notificationError) throw notificationError;

      const rows = notificationData || [];
      const actorIds = [
        ...new Set(rows.map((item) => item.actor_id).filter(Boolean)),
      ];

      let profilesById = {};

      if (actorIds.length > 0) {
        const { data: actorProfiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, role")
          .in("id", actorIds);

        if (profileError) throw profileError;

        profilesById = Object.fromEntries(
          (actorProfiles || []).map((profile) => [profile.id, profile])
        );
      }

      setNotifications(
        rows.map((notification) => ({
          ...notification,
          actor: profilesById[notification.actor_id] || null,
        }))
      );
    } catch (err) {
      console.error("Error loading notifications:", err);
      setError("Unable to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    loadNotifications();

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Reload rows and actor profiles after a notification change.
          loadNotifications();
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Notification Realtime channel error.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadNotifications]);

  // ==========================================================
  // MARK ONE NOTIFICATION AS READ
  // ==========================================================

  const markAsRead = async (notification) => {
    if (notification.is_read || updatingId === notification.id) return;

    setUpdatingId(notification.id);

    try {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notification.id
            ? { ...item, is_read: true }
            : item
        )
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
      setError("Could not mark this notification as read.");
    } finally {
      setUpdatingId(null);
    }
  };

  // ==========================================================
  // MARK ALL AS READ
  // ==========================================================

  const markAllAsRead = async () => {
    if (!user?.id || unreadCount === 0 || markingAll) return;

    setMarkingAll(true);

    try {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (updateError) throw updateError;

      setNotifications((previous) =>
        previous.map((item) => ({ ...item, is_read: true }))
      );
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
      setError("Could not mark all notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  };

  // ==========================================================
  // NOTIFICATION ICON
  // ==========================================================

  const getNotificationIcon = (type) => {
    switch (type) {
      case "like":
        return <Heart size={19} className="text-pink-600" />;

      case "comment":
        return <MessageCircle size={19} className="text-blue-600" />;

      case "connection_request":
        return <UserPlus size={19} className="text-purple-600" />;

      case "message_request":
        return <MessageSquare size={19} className="text-purple-600" />;

      case "request_accepted":
        return <Check size={19} className="text-green-600" />;

      case "request_rejected":
        return <AlertCircle size={19} className="text-orange-600" />;

      default:
        return <Bell size={19} className="text-gray-500" />;
    }
  };

  // ==========================================================
  // OPEN NOTIFICATION
  // ==========================================================

  const openNotification = async (notification) => {
    await markAsRead(notification);

    switch (notification.type) {
      case "like":
      case "comment":
        // The reference is the post ID for these notification types.
        navigate("/student-home", {
          state: { postId: notification.reference_id },
        });
        break;

      case "connection_request":
      case "message_request":
      case "request_accepted":
      case "request_rejected":
        // The reference is the request ID for request notifications.
        navigate("/requests", {
          state: { requestId: notification.reference_id },
        });
        break;

      default:
        // For notification types without a dedicated destination.
        break;
    }
  };

  // ==========================================================
  // TIME DISPLAY
  // ==========================================================

  const formatTime = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.max(0, Math.floor((now - date) / 1000));

    if (seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear()
        ? "numeric"
        : undefined,
    });
  };

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
              aria-label="Go back"
            >
              <ArrowLeft size={21} />
            </button>

            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Notifications
              </h1>
              <p className="text-xs text-gray-500">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
                  : "You're all caught up"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={markAllAsRead}
            disabled={unreadCount === 0 || markingAll}
            className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-purple-600 transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {markingAll ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <CheckCheck size={18} />
            )}
            <span className="hidden sm:inline">Mark all read</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-3 py-4 sm:px-4">
        {error && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={loadNotifications}
              className="shrink-0 text-sm font-semibold text-red-700 underline"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16">
            <LoaderCircle size={30} className="animate-spin text-purple-600" />
            <p className="mt-3 text-sm text-gray-500">
              Loading notifications...
            </p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-50">
              <Bell size={29} className="text-purple-500" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-gray-900">
              No notifications yet
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-gray-500">
              When someone likes or comments on your posts, or sends you a
              request, you'll see it here.
            </p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            {notifications.map((notification) => {
              const actor = notification.actor;

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => openNotification(notification)}
                  className={`flex w-full items-start gap-3 border-b border-gray-100 p-4 text-left transition last:border-b-0 hover:bg-gray-50 ${
                    notification.is_read ? "bg-white" : "bg-purple-50/60"
                  }`}
                >
                  <div className="relative shrink-0">
                    {actor?.avatar_url ? (
                      <img
                        src={actor.avatar_url}
                        alt={actor.full_name || actor.username || "User"}
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                        <UserPlus size={21} />
                      </div>
                    )}

                    <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm">
                      {getNotificationIcon(notification.type)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-5 text-gray-800">
                      <span className="font-semibold">
                        {actor?.full_name ||
                          actor?.username ||
                          "Someone"}
                      </span>{" "}
                      {notification.title || "sent you a notification"}
                    </p>

                    {notification.body && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                        {notification.body}
                      </p>
                    )}

                    <p className="mt-1.5 text-xs text-gray-400">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>

                  {!notification.is_read && (
                    <span
                      className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-purple-600"
                      aria-label="Unread"
                    />
                  )}

                  {updatingId === notification.id && (
                    <LoaderCircle
                      size={15}
                      className="mt-1 shrink-0 animate-spin text-purple-600"
                    />
                  )}
                </button>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
};

export default Notifications;
