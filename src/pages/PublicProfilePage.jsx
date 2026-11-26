
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  User,
  Users,
  MessageSquare,
  UserPlus,
  Clock,
  Loader2,
  School,
  Heart,
  Search,
  Settings,
  Home,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

import MyPosts from "../components/profile/MyPosts";
import MessageRequestModal from "../components/messages/MessageRequestModal";
import BottomNavbar from "../components/BottomNavbar";

import {
  getMessagingState,
  createPrivateConversation,
  createConnectionRequest,
  createMessageRequest,
} from "../services/messaging/messagingService";

import { getMessagingRule } from "../services/messaging/messagingPermissions";

const PROFILE_COLUMNS = `
  id,
  full_name,
  username,
  avatar_url,
  bio,
  role,
  school_id,
  is_active,
  created_at
`;

export default function PublicProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const { user, profile, loading } = useAuth();

  const messagingUser = useMemo(() => {
    if (!user?.id) return null;

    return {
      ...(profile || {}),
      ...user,
      id: user.id,
    };
  }, [user, profile]);

  // =====================================================
  // PAGE STATE
  // =====================================================

  const [viewedUser, setViewedUser] = useState(null);
  const [school, setSchool] = useState(null);
  const [friends, setFriends] = useState([]);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(true);

  const [profileError, setProfileError] = useState("");

  const [messagingState, setMessagingState] = useState(null);
  const [loadingMessagingState, setLoadingMessagingState] =
    useState(true);

  const [startingConversation, setStartingConversation] =
    useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [modal, setModal] = useState({
    open: false,
    type: null,
  });

  const [actionError, setActionError] = useState("");

  // =====================================================
  // LOAD PUBLIC PROFILE
  // =====================================================

  useEffect(() => {
    if (loading || !user?.id || !userId) return;

    let cancelled = false;

    async function loadProfile() {
      setLoadingProfile(true);
      setProfileError("");
      setViewedUser(null);
      setSchool(null);

      if (userId === user.id) {
        navigate("/profile", { replace: true });
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(PROFILE_COLUMNS)
          .eq("id", userId)
          .maybeSingle();

        if (error) throw error;

        if (!data || !data.is_active) {
          if (!cancelled) {
            setProfileError(
              "This profile is unavailable or no longer active."
            );
          }
          return;
        }

        if (cancelled) return;

        setViewedUser(data);

        if (data.school_id) {
          const { data: schoolData, error: schoolError } =
            await supabase
              .from("schools")
              .select("id, name, code, logo_url")
              .eq("id", data.school_id)
              .maybeSingle();

          if (schoolError) throw schoolError;

          if (!cancelled) {
            setSchool(schoolData || null);
          }
        }
      } catch (error) {
        console.error("Error loading public profile:", error);

        if (!cancelled) {
          setProfileError(
            error.message || "Unable to load this profile."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [userId, user?.id, loading, navigate]);

  // =====================================================
  // LOAD CONNECTED FRIENDS
  // =====================================================

  useEffect(() => {
    if (!viewedUser?.id) return;

    let cancelled = false;

    async function loadFriends() {
      setLoadingFriends(true);
      setFriends([]);

      try {
        const { data: connections, error } = await supabase
          .from("connections")
          .select("id, user_one_id, user_two_id")
          .or(
            `user_one_id.eq.${viewedUser.id},user_two_id.eq.${viewedUser.id}`
          );

        if (error) throw error;

        const friendIds = [
          ...new Set(
            (connections || []).map((connection) =>
              connection.user_one_id === viewedUser.id
                ? connection.user_two_id
                : connection.user_one_id
            )
          ),
        ];

        if (!friendIds.length) {
          if (!cancelled) setFriends([]);
          return;
        }

        const { data: friendProfiles, error: friendError } =
          await supabase
            .from("profiles")
            .select(
              "id, full_name, username, avatar_url, role, school_id"
            )
            .in("id", friendIds)
            .eq("is_active", true)
            .neq("role", "super_admin");

        if (friendError) throw friendError;

        if (!cancelled) {
          setFriends(friendProfiles || []);
        }
      } catch (error) {
        console.error("Error loading friends:", error);

        if (!cancelled) {
          setFriends([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingFriends(false);
        }
      }
    }

    loadFriends();

    return () => {
      cancelled = true;
    };
  }, [viewedUser?.id]);

  // =====================================================
  // LOAD MESSAGING STATE
  // =====================================================

  useEffect(() => {
    if (!messagingUser || !viewedUser) return;

    let cancelled = false;

    async function loadMessagingState() {
      setLoadingMessagingState(true);

      try {
        const state = await getMessagingState(
          messagingUser,
          viewedUser
        );

        if (!cancelled) {
          setMessagingState(state);
        }
      } catch (error) {
        console.error("Error checking messaging state:", error);

        if (!cancelled) {
          setMessagingState({
            status: "unavailable",
            canMessage: false,
          });
        }
      } finally {
        if (!cancelled) {
          setLoadingMessagingState(false);
        }
      }
    }

    loadMessagingState();

    return () => {
      cancelled = true;
    };
  }, [messagingUser, viewedUser]);

  // =====================================================
  // DETERMINE AVAILABLE ACTION
  // =====================================================

  const getUserAction = () => {
    if (!messagingUser || !viewedUser) {
      return { type: "none" };
    }

    const rule = getMessagingRule(
      messagingUser,
      viewedUser
    );

    if (!rule?.allowed) {
      return { type: "none" };
    }

    if (loadingMessagingState || !messagingState) {
      return {
        type: "loading",
        label: "Checking...",
        icon: Loader2,
      };
    }

    if (messagingState.status === "request_pending") {
      return {
        type: "pending",
        label:
          messagingState.pendingRequestDirection === "outgoing"
            ? "Pending"
            : "Respond",
        icon: Clock,
      };
    }

    if (
      ["connected", "session_active", "direct"].includes(
        messagingState.status
      )
    ) {
      return {
        type: "message",
        label: "Message",
        icon: MessageSquare,
      };
    }

    if (
      ["session_expired", "request_required"].includes(
        messagingState.status
      )
    ) {
      return {
        type: "message_request",
        label:
          messagingState.status === "session_expired"
            ? "Request again"
            : "Message",
        icon: MessageSquare,
      };
    }

    if (messagingState.status === "connection_required") {
      return {
        type: "connection",
        label: "Connect",
        icon: UserPlus,
      };
    }

    return { type: "none" };
  };

  const action = getUserAction();
  const ActionIcon = action.icon;

  // =====================================================
  // HANDLE PROFILE ACTION
  // =====================================================

  async function handleProfileAction() {
    if (!viewedUser || !messagingUser) return;

    setActionError("");

    if (action.type === "pending") {
      navigate("/requests");
      return;
    }

    if (action.type === "connection") {
      setModal({
        open: true,
        type: "connection",
      });
      return;
    }

    if (action.type === "message_request") {
      setModal({
        open: true,
        type: "message_request",
      });
      return;
    }

    if (action.type !== "message") return;

    try {
      setStartingConversation(true);

      const conversation = await createPrivateConversation(
        messagingUser.id,
        viewedUser.id
      );

      navigate("/messages", {
        state: {
          activeConversationId: conversation.id,
        },
      });
    } catch (error) {
      setActionError(
        error.message || "Unable to open conversation."
      );
    } finally {
      setStartingConversation(false);
    }
  }

  // =====================================================
  // SUBMIT REQUEST
  // =====================================================

  async function handleModalSubmit(message) {
    if (!viewedUser || !messagingUser) return;

    try {
      setSubmitting(true);
      setActionError("");

      if (modal.type === "connection") {
        await createConnectionRequest({
          requesterId: messagingUser.id,
          targetId: viewedUser.id,
          message,
        });
      } else {
        await createMessageRequest({
          requesterId: messagingUser.id,
          targetId: viewedUser.id,
          message,
        });
      }

      setMessagingState({
        status: "request_pending",
        pendingRequestDirection: "outgoing",
      });

      setModal({
        open: false,
        type: null,
      });
    } catch (error) {
      setActionError(
        error.message || "Unable to send your request."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading || loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            size={35}
            className="animate-spin text-violet-600"
          />
          <p className="text-sm text-[var(--text-secondary)]">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // PROFILE UNAVAILABLE
  // =====================================================

  if (profileError || !viewedUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--page-bg)] px-5 text-center">
        <User
          size={50}
          className="text-[var(--text-secondary)]"
        />

        <h2 className="mt-4 text-xl font-bold text-[var(--text-primary)]">
          Profile unavailable
        </h2>

        <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
          {profileError || "We could not find this profile."}
        </p>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-6 rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white"
        >
          Go back
        </button>
      </div>
    );
  }

  // =====================================================
  // MAIN PROFILE
  // =====================================================

  return (
    <main className="min-h-screen bg-[var(--page-bg)] pb-24">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">

        {/* BACK BUTTON */}

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-violet-600 hover:bg-violet-50"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        {/* PROFILE CARD */}

        <section className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--surface)] shadow-sm">

          <div className="bg-[var(--page-bg-secondary)]/60 px-5 py-8 sm:px-8">

            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">

              {/* AVATAR */}

              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 ring-4 ring-white shadow-md">
                {viewedUser.avatar_url ? (
                  <img
                    src={viewedUser.avatar_url}
                    alt={viewedUser.full_name || "Profile"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User size={48} className="text-violet-600" />
                )}
              </div>

              {/* PROFILE DETAILS */}

              <div className="min-w-0 flex-1 text-center sm:text-left">

                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  {viewedUser.full_name || "University member"}
                </h1>

                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  @{viewedUser.username}
                </p>

                <span className="mt-3 inline-block rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold capitalize text-violet-700">
                  {viewedUser.role?.replace("_", " ")}
                </span>

                {viewedUser.bio && (
                  <p className="mt-4 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">
                    {viewedUser.bio}
                  </p>
                )}

                {/* PROFILE ACTION */}

                {action.type !== "none" && (
                  <button
                    type="button"
                    onClick={handleProfileAction}
                    disabled={
                      action.type === "loading" ||
                      startingConversation
                    }
                    className={`mt-5 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      action.type === "pending"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-violet-600 text-white hover:bg-violet-700"
                    }`}
                  >
                    {ActionIcon && (
                      <ActionIcon
                        size={16}
                        className={
                          action.type === "loading" ||
                          startingConversation
                            ? "animate-spin"
                            : ""
                        }
                      />
                    )}

                    {startingConversation
                      ? "Opening..."
                      : action.label}
                  </button>
                )}

                {actionError && (
                  <p className="mt-3 text-sm text-red-600">
                    {actionError}
                  </p>
                )}

              </div>
            </div>
          </div>

          {/* SCHOOL */}

          <div className="flex items-center gap-3 p-5 sm:px-8">
            {school?.logo_url ? (
              <img
                src={school.logo_url}
                alt=""
                className="h-11 w-11 rounded-xl object-contain"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100">
                <School size={21} className="text-violet-600" />
              </div>
            )}

            <div>
              <p className="text-xs text-[var(--text-secondary)]">
                School
              </p>
              <p className="font-semibold text-[var(--text-primary)]">
                {school?.name || "School not specified"}
              </p>
              {school?.code && (
                <p className="text-xs text-[var(--text-secondary)]">
                  {school.code}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* FRIENDS */}

        <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">

          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
                <Users size={20} className="text-violet-600" />
                Friends
              </h2>

              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {friends.length} connected {friends.length === 1 ? "person" : "people"}
              </p>
            </div>
          </div>

          {loadingFriends ? (
            <div className="flex justify-center py-6">
              <Loader2
                size={25}
                className="animate-spin text-violet-600"
              />
            </div>
          ) : friends.length === 0 ? (
            <p className="py-5 text-center text-sm text-[var(--text-secondary)]">
              No friends to display yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {friends.map((friend) => (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() =>
                    navigate(`/profile/${friend.id}`)
                  }
                  className="flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--border-color)] p-3 text-left transition hover:border-violet-300 hover:bg-violet-50/40"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100">
                    {friend.avatar_url ? (
                      <img
                        src={friend.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={19} className="text-violet-600" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {friend.full_name || friend.username}
                    </p>
                    <p className="truncate text-xs text-[var(--text-secondary)]">
                      @{friend.username}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* USER POSTS */}

        <MyPosts
          userId={viewedUser.id}
          currentUserId={user?.id}
          title="Posts"
        />

      </div>

      {/* REQUEST MODAL */}

      <MessageRequestModal
        open={modal.open}
        user={viewedUser}
        type={modal.type}
        submitting={submitting}
        onClose={() =>
          setModal({
            open: false,
            type: null,
          })
        }
        onSubmit={handleModalSubmit}
      />

      {/* BOTTOM NAVIGATION */}

      <BottomNavbar
        items={[
          {
            label: "Home",
            path:
              profile?.role === "student"
                ? "/student-home"
                : profile?.role === "admin"
                ? "/admin-home"
                : "/teacher-home",
            icon: Home,
          },
          {
            label: "Search",
            path: "/search",
            icon: Search,
          },
          {
            label: "Requests",
            path: "/requests",
            icon: Heart,
          },
          {
            label: "Settings",
            path: "/settings",
            icon: Settings,
          },
        ]}
        createPath="/create-post"
      />
    </main>
  );
}
