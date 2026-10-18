
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
  Sparkles,
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

      const {
        data: notificationData,
        error: notificationError,
      } = await supabase
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
        const {
          data: actorProfiles,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, role")
          .in("id", actorIds);

        if (profileError) throw profileError;

        profilesById = Object.fromEntries(
          (actorProfiles || []).map((profile) => [
            profile.id,
            profile,
          ])
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

  // ==========================================================
  // INITIAL LOAD AND REALTIME UPDATES
  // ==========================================================

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
    if (
      notification.is_read ||
      updatingId === notification.id ||
      !user?.id
    ) {
      return;
    }

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
        previous.map((item) => ({
          ...item,
          is_read: true,
        }))
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
        return <Heart size={18} className="text-pink-600" />;

      case "comment":
        return <MessageCircle size={18} className="text-blue-600" />;

      case "connection_request":
        return <UserPlus size={18} className="text-violet-600" />;

      case "message_request":
        return <MessageSquare size={18} className="text-fuchsia-600" />;

      case "request_accepted":
        return <Check size={18} className="text-emerald-600" />;

      case "request_rejected":
        return <AlertCircle size={18} className="text-orange-600" />;

      default:
        return <Bell size={18} className="text-violet-600" />;
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
        navigate("/student-home", {
          state: { postId: notification.reference_id },
        });
        break;

      case "connection_request":
      case "message_request":
      case "request_accepted":
      case "request_rejected":
        navigate("/requests", {
          state: { requestId: notification.reference_id },
        });
        break;

      default:
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
    const seconds = Math.max(
      0,
      Math.floor((now - date) / 1000)
    );

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
      year:
        date.getFullYear() !== now.getFullYear()
          ? "numeric"
          : undefined,
    });
  };

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/70 pb-10">

      {/* Ambient neon background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-28 top-28 h-80 w-80 rounded-full bg-violet-300/25 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed -right-24 top-80 h-72 w-72 rounded-full bg-fuchsia-300/20 blur-3xl"
      />

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/75 shadow-[0_4px_30px_rgba(109,40,217,0.07)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-4">

          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-violet-100 bg-white/80 text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="bg-gradient-to-r from-violet-950 via-purple-800 to-fuchsia-700 bg-clip-text text-lg font-extrabold tracking-tight text-transparent">
                  Notifications
                </h1>

                <Sparkles
                  size={16}
                  className="text-fuchsia-500"
                />
              </div>

              <p className="text-xs text-slate-500">
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
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-violet-100 bg-white/80 px-3 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {markingAll ? (
              <LoaderCircle
                size={17}
                className="animate-spin"
              />
            ) : (
              <CheckCheck size={18} />
            )}

            <span className="hidden sm:inline">
              Mark all read
            </span>
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="relative z-10 mx-auto max-w-2xl px-3 py-5 sm:px-4">

        {/* ERROR */}
        {error && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-rose-200/80 bg-white/90 p-4 shadow-[0_8px_25px_rgba(225,29,72,0.07)] backdrop-blur-xl">
            <p className="text-sm text-rose-700">
              {error}
            </p>

            <button
              type="button"
              onClick={loadNotifications}
              className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-rose-700 underline underline-offset-2 hover:bg-rose-50"
            >
              Retry
            </button>
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div className="rounded-3xl border border-white/80 bg-white/75 py-16 text-center shadow-[0_16px_50px_rgba(91,33,182,0.1)] backdrop-blur-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-100 to-fuchsia-100 shadow-[0_0_30px_rgba(139,92,246,0.15)]">
              <LoaderCircle
                size={30}
                className="animate-spin text-violet-600"
              />
            </div>

            <p className="mt-4 text-sm font-medium text-slate-500">
              Loading notifications...
            </p>
          </div>
        ) : notifications.length === 0 ? (

          /* EMPTY STATE */
          <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/75 px-6 py-16 text-center shadow-[0_16px_50px_rgba(91,33,182,0.1)] backdrop-blur-2xl">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-fuchsia-300/20 blur-3xl"
            />

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-100 via-purple-50 to-fuchsia-100 shadow-[0_0_35px_rgba(139,92,246,0.2)]">
              <Bell
                size={32}
                className="text-violet-600"
              />
            </div>

            <h2 className="mt-5 bg-gradient-to-r from-violet-900 to-fuchsia-700 bg-clip-text text-lg font-bold text-transparent">
              No notifications yet
            </h2>

            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">
              When someone likes or comments on your posts, or sends you a
              request, you'll see it here.
            </p>
          </div>
        ) : (

          /* NOTIFICATION LIST */
          <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/70 shadow-[0_18px_60px_rgba(91,33,182,0.12)] backdrop-blur-2xl">

            <div className="flex items-center justify-between border-b border-violet-100/80 bg-gradient-to-r from-violet-50/90 via-white/70 to-fuchsia-50/80 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-800">
                Recent activity
              </p>

              <span className="rounded-full border border-violet-100 bg-white/80 px-2.5 py-1 text-xs font-semibold text-violet-700">
                {notifications.length}
              </span>
            </div>

            {notifications.map((notification) => {
              const actor = notification.actor;

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => openNotification(notification)}
                  className={`group relative flex w-full items-start gap-3 border-b border-violet-100/70 p-4 text-left transition duration-200 last:border-b-0 hover:bg-violet-50/70 ${
                    notification.is_read
                      ? "bg-white/40"
                      : "bg-gradient-to-r from-violet-100/60 via-purple-50/50 to-fuchsia-50/50"
                  }`}
                >
                  {!notification.is_read && (
                    <span className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-gradient-to-b from-violet-500 to-fuchsia-500 shadow-[0_0_12px_rgba(168,85,247,0.55)]" />
                  )}

                  {/* ACTOR AVATAR */}
                  <div className="relative ml-1 shrink-0">
                    {actor?.avatar_url ? (
                      <img
                        src={actor.avatar_url}
                        alt={
                          actor.full_name ||
                          actor.username ||
                          "User"
                        }
                        className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-[0_0_0_2px_rgba(167,139,250,0.5),0_0_20px_rgba(168,85,247,0.15)]"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-600 shadow-[0_0_0_2px_rgba(167,139,250,0.4)]">
                        <UserPlus size={21} />
                      </div>
                    )}

                    {/* NOTIFICATION TYPE ICON */}
                    <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-white shadow-[0_3px_12px_rgba(91,33,182,0.16)]">
                      {getNotificationIcon(notification.type)}
                    </span>
                  </div>

                  {/* NOTIFICATION CONTENT */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm leading-5 text-slate-800">
                      <span className="font-bold text-violet-950">
                        {actor?.full_name ||
                          actor?.username ||
                          "Someone"}
                      </span>{" "}
                      <span>
                        {notification.title ||
                          "sent you a notification"}
                      </span>
                    </p>

                    {notification.body && (
                      <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-slate-500">
                        {notification.body}
                      </p>
                    )}

                    <p className="mt-2 text-xs font-medium text-slate-400">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>

                  {/* UNREAD INDICATOR / LOADING */}
                  <div className="flex shrink-0 items-center pt-2">
                    {updatingId === notification.id ? (
                      <LoaderCircle
                        size={16}
                        className="animate-spin text-violet-600"
                      />
                    ) : !notification.is_read ? (
                      <span
                        className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 shadow-[0_0_12px_rgba(168,85,247,0.55)]"
                        aria-label="Unread"
                      />
                    ) : null}
                  </div>
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
