
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Loader2,
  User,
  Search,
  Heart,
  Home,
  Settings,
  MessageSquare,
  UserPlus,
  Clock,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";

import {
  searchMessagingUsers,
  getMessagingState,
  createPrivateConversation,
  createConnectionRequest,
  createMessageRequest,
} from "../services/messaging/messagingService";

import { getMessagingRule } from "../services/messaging/messagingPermissions";

import MessageRequestModal from "../components/messages/MessageRequestModal";
import BottomNavbar from "../components/BottomNavbar";

import SearchHeader from "../components/search/SearchHeader";
import SearchBar from "../components/search/SearchBar";
import SearchResults from "../components/search/SearchResults";

function SearchPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const messagingUser = useMemo(() => {
    if (!user?.id) return null;

    return {
      ...(profile || {}),
      ...user,
      id: user.id,
    };
  }, [user, profile]);

  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [userStates, setUserStates] = useState({});
  const [startingId, setStartingId] = useState(null);

  const [modal, setModal] = useState({
    open: false,
    user: null,
    type: null,
  });

  const [submitting, setSubmitting] = useState(false);

  // =====================================================
  // DEBOUNCED USER SEARCH
  // =====================================================

  useEffect(() => {
    if (!messagingUser?.id) {
      setSearchResults([]);
      return;
    }

    const trimmed = searchText.trim();

    if (!trimmed) {
      setSearchResults([]);
      setSearchingUsers(false);
      setSearchError("");
      setUserStates({});
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        setSearchingUsers(true);
        setSearchError("");

        const results = await searchMessagingUsers({
          currentUserId: messagingUser.id,
          search: trimmed,
          limit: 30,
        });

        if (!cancelled) {
          setSearchResults(results || []);
          setUserStates({});
        }
      } catch (error) {
        if (!cancelled) {
          setSearchResults([]);
          setSearchError(
            error?.message || "Unable to search users."
          );
        }
      } finally {
        if (!cancelled) {
          setSearchingUsers(false);
        }
      }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchText, messagingUser?.id]);

  // =====================================================
  // FETCH MESSAGING STATES
  // =====================================================

  useEffect(() => {
    if (!searchResults.length || !messagingUser?.id) {
      setUserStates({});
      return;
    }

    let cancelled = false;

    const loadStates = async () => {
      const states = {};

      for (let i = 0; i < searchResults.length; i += 5) {
        if (cancelled) break;

        const chunk = searchResults.slice(i, i + 5);

        const chunkStates = await Promise.all(
          chunk.map(async (targetUser) => {
            try {
              const state = await getMessagingState(
                messagingUser,
                targetUser
              );

              return [targetUser.id, state];
            } catch (error) {
              return [
                targetUser.id,
                {
                  status: "unavailable",
                  canMessage: false,
                },
              ];
            }
          })
        );

        if (cancelled) break;

        chunkStates.forEach(([id, state]) => {
          states[id] = state;
        });

        setUserStates((previous) => ({
          ...previous,
          ...states,
        }));

        await new Promise((resolve) =>
          setTimeout(resolve, 200)
        );
      }
    };

    loadStates();

    return () => {
      cancelled = true;
    };
  }, [searchResults, messagingUser]);

  // =====================================================
  // DETERMINE USER ACTION
  // =====================================================

  const getUserAction = (targetUser) => {
    const state = userStates[targetUser.id];

    const rule = getMessagingRule(
      messagingUser,
      targetUser
    );

    if (!rule?.allowed) {
      return {
        type: "none",
        label: "",
        icon: null,
        disabled: true,
      };
    }

    if (!state) {
      return {
        type: "loading",
        label: "...",
        icon: Loader2,
        disabled: true,
      };
    }

    if (state.status === "request_pending") {
      return {
        type: "pending",
        label:
          state.pendingRequestDirection === "outgoing"
            ? "Pending"
            : "Respond",
        icon: Clock,
        disabled: false,
      };
    }

    if (
      ["connected", "session_active", "direct"].includes(
        state.status
      )
    ) {
      return {
        type: "message",
        label: "Message",
        icon: MessageSquare,
        disabled: false,
      };
    }

    if (state.status === "session_expired") {
      return {
        type: "message_request",
        label: "Request again",
        icon: MessageSquare,
        disabled: false,
      };
    }

    if (state.status === "connection_required") {
      return {
        type: "connection",
        label: "Connect",
        icon: UserPlus,
        disabled: false,
      };
    }

    if (state.status === "request_required") {
      return {
        type: "message_request",
        label: "Request",
        icon: MessageSquare,
        disabled: false,
      };
    }

    return {
      type: "none",
      label: "",
      icon: null,
      disabled: true,
    };
  };

  // =====================================================
  // OPEN PUBLIC PROFILE
  // =====================================================

  const handleOpenProfile = (targetUser) => {
    if (!targetUser?.id) return;

    navigate(`/profile/${targetUser.id}`);
  };

  // =====================================================
  // HANDLE MESSAGING ACTION
  // =====================================================

  const handleSelectUser = async (targetUser) => {
    if (!targetUser?.id || !messagingUser) return;

    const action = getUserAction(targetUser);

    if (action.type === "pending") {
      navigate("/requests");
      return;
    }

    if (action.type === "connection") {
      setModal({
        open: true,
        user: targetUser,
        type: "connection",
      });
      return;
    }

    if (action.type === "message_request") {
      setModal({
        open: true,
        user: targetUser,
        type: "message_request",
      });
      return;
    }

    if (action.type !== "message") return;

    try {
      setStartingId(targetUser.id);
      setSearchError("");

      const conversation = await createPrivateConversation(
        messagingUser.id,
        targetUser.id
      );

      navigate("/messages", {
        state: {
          activeConversationId: conversation.id,
        },
      });
    } catch (error) {
      setSearchError(
        error?.message || "Unable to open conversation."
      );
    } finally {
      setStartingId(null);
    }
  };

  // =====================================================
  // SUBMIT CONNECTION / MESSAGE REQUEST
  // =====================================================

  const handleModalSubmit = async (message) => {
    if (!modal.user) return;

    try {
      setSubmitting(true);
      setSearchError("");

      if (modal.type === "connection") {
        await createConnectionRequest({
          requesterId: messagingUser.id,
          targetId: modal.user.id,
          message,
        });
      } else {
        await createMessageRequest({
          requesterId: messagingUser.id,
          targetId: modal.user.id,
          message,
        });
      }

      setUserStates((previous) => ({
        ...previous,
        [modal.user.id]: {
          status: "request_pending",
          pendingRequestDirection: "outgoing",
        },
      }));

      setModal({
        open: false,
        user: null,
        type: null,
      });
    } catch (error) {
      setSearchError(
        error?.message || "Unable to send request."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // AUTHENTICATION CHECK
  // =====================================================

  if (!messagingUser?.id) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <User
              size={40}
              className="mx-auto mb-3 text-violet-600"
            />

            <h2 className="text-lg font-semibold">
              Sign in required
            </h2>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // MAIN PAGE
  // =====================================================

  return (
    <div className="min-h-screen bg-[var(--page-bg)] pb-24">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">

        <SearchHeader
          onBack={() =>
            window.history.length > 2
              ? navigate(-1)
              : navigate("/")
          }
        />

        <SearchBar
          value={searchText}
          onChange={setSearchText}
          searchingUsers={searchingUsers}
        />

        {/* SEARCH STATUS */}

        {searchingUsers && (
          <div className="mt-3 flex items-center gap-2 text-sm text-violet-600">
            <Loader2 size={16} className="animate-spin" />
            Searching...
          </div>
        )}

        {searchError && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {searchError}
          </div>
        )}

        {/* SEARCH RESULTS */}

        <SearchResults
          searchText={searchText}
          searchResults={searchResults}
          searchingUsers={searchingUsers}
          searchError={searchError}
          getUserAction={getUserAction}
          startingId={startingId}
          onOpenProfile={handleOpenProfile}
          onSelectUser={handleSelectUser}
        />
      </div>

      {/* REQUEST MODAL */}

      <MessageRequestModal
        open={modal.open}
        user={modal.user}
        type={modal.type}
        submitting={submitting}
        onClose={() =>
          setModal({
            open: false,
            user: null,
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
            path: "/teacher-home",
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
    </div>
  );
}

export default SearchPage;
