import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftCircle,
  Search,
  Loader2,
  User,
  MessageSquare,
  UserPlus,
  Clock,
  Check,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import {
  searchMessagingUsers,
} from "../services/messaging/messagingService";
import {
  getMessagingRule,
} from "../services/messaging/messagingPermissions";

function SearchPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // ============================================================
  // COMBINED AUTH + PROFILE USER
  // ============================================================
  //
  // user.id is always the authoritative authenticated user ID.
  // profile provides role, school_id, full_name, username, etc.
  //
  const messagingUser = useMemo(() => {
    if (!user?.id) return null;

    return {
      ...user,
      ...(profile || {}),
      id: user.id,
    };
  }, [user, profile]);

  // ============================================================
  // STATE
  // ============================================================

  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const [searchingUsers, setSearchingUsers] = useState(false);
  const [searchError, setSearchError] = useState("");

  // ============================================================
  // DEBOUNCED USER SEARCH
  // ============================================================

  useEffect(() => {
    if (!messagingUser?.id) {
      setSearchResults([]);
      return;
    }

    const trimmedSearch = searchText.trim();

    if (!trimmedSearch) {
      setSearchResults([]);
      setSearchingUsers(false);
      setSearchError("");
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        setSearchingUsers(true);
        setSearchError("");

        const results = await searchMessagingUsers({
          currentUserId: messagingUser.id,
          search: trimmedSearch,
          limit: 30,
        });

        if (!cancelled) {
          setSearchResults(results || []);
        }
      } catch (error) {
        console.error("User search failed:", error);

        if (!cancelled) {
          setSearchResults([]);
          setSearchError(
            error?.message || "Unable to search for users."
          );
        }
      } finally {
        if (!cancelled) {
          setSearchingUsers(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchText, messagingUser?.id]);

  // ============================================================
  // GET ACTION FOR A USER
  // ============================================================

  const getUserAction = (targetUser) => {
    if (!messagingUser || !targetUser) {
      return {
        type: "none",
        label: "Unavailable",
        icon: User,
      };
    }

    const rule = getMessagingRule(
      messagingUser,
      targetUser
    );

    if (!rule || !rule.allowed) {
      return {
        type: "none",
        label: "Unavailable",
        icon: User,
      };
    }

    // ----------------------------------------------------------
    // STUDENT → TEACHER / ADMIN
    // ----------------------------------------------------------

    if (rule.requiresMessageRequest) {
      return {
        type: "message_request",
        label: "Message request",
        icon: MessageSquare,
      };
    }

    // ----------------------------------------------------------
    // STUDENT → STUDENT
    // ----------------------------------------------------------

    if (rule.requiresConnection) {
      return {
        type: "connection",
        label: "Connect",
        icon: UserPlus,
      };
    }

    // ----------------------------------------------------------
    // TEACHER / ADMIN → STUDENT
    // ----------------------------------------------------------

    if (rule.canMessage) {
      return {
        type: "message",
        label: "Message",
        icon: MessageSquare,
      };
    }

    return {
      type: "none",
      label: "Unavailable",
      icon: User,
    };
  };

  // ============================================================
  // OPEN USER
  // ============================================================

  const handleSelectUser = (targetUser) => {
    if (!targetUser?.id) return;

    navigate(`/messages?user=${targetUser.id}`);
  };

  // ============================================================
  // CLEAR SEARCH
  // ============================================================

  const handleClearSearch = () => {
    setSearchText("");
    setSearchResults([]);
    setSearchError("");
  };

  // ============================================================
  // UNAUTHENTICATED STATE
  // ============================================================

  if (!messagingUser?.id) {
    return (
      <div className="min-h-screen bg-white px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <User
              size={40}
              className="mx-auto mb-3 text-violet-600"
            />

            <h2 className="text-lg font-semibold text-slate-900">
              Sign in required
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Please sign in to search for people.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="flex items-center gap-3">

          <button
            type="button"
            onClick={() => {
              if (window.history.length > 2) {
                navigate(-1);
              } else {
                navigate("/");
              }
            }}
            className="
              rounded-full
              p-2
              text-violet-600
              transition
              hover:bg-violet-50
              focus:outline-none
              focus:ring-2
              focus:ring-violet-200
            "
            aria-label="Go back"
          >
            <ArrowLeftCircle size={28} />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Search People
            </h1>

            <p className="text-sm text-slate-500">
              Find students, teachers and administrators
            </p>
          </div>

        </div>

        {/* ======================================================
            SEARCH BAR
        ====================================================== */}

        <div className="relative mt-6">

          <Search
            size={20}
            className="
              absolute
              left-4
              top-1/2
              -translate-y-1/2
              text-violet-600
            "
          />

          <input
            type="text"
            value={searchText}
            onChange={(event) =>
              setSearchText(event.target.value)
            }
            placeholder="Search by name or username..."
            className="
              w-full
              rounded-2xl
              border
              border-violet-100
              bg-violet-50/40
              py-3
              pl-11
              pr-12
              text-slate-900
              placeholder-gray-400
              outline-none
              transition
              focus:border-violet-400
              focus:bg-white
              focus:ring-2
              focus:ring-violet-100
            "
            autoFocus
          />

          {/* Clear button */}

          {searchText && !searchingUsers && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="
                absolute
                right-3
                top-1/2
                -translate-y-1/2
                rounded-full
                px-2
                py-1
                text-xs
                font-medium
                text-violet-600
                transition
                hover:bg-violet-100
              "
            >
              Clear
            </button>
          )}

        </div>

        {/* ======================================================
            SEARCHING INDICATOR
        ====================================================== */}

        {searchingUsers && (
          <div className="mt-3 flex items-center gap-2 text-sm text-violet-600">
            <Loader2
              size={16}
              className="animate-spin"
            />

            <span>Searching people...</span>
          </div>
        )}

        {/* ======================================================
            ERROR
        ====================================================== */}

        {searchError && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {searchError}
          </div>
        )}

        {/* ======================================================
            RESULTS
        ====================================================== */}

        <div className="mt-6">

          {/* No search yet */}

          {!searchText.trim() && (
            <div className="
              rounded-2xl
              border
              border-violet-100
              bg-violet-50/40
              p-8
              text-center
            ">

              <Search
                size={38}
                className="mx-auto mb-3 text-violet-500"
              />

              <h2 className="font-semibold text-slate-900">
                Search for people
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Enter a name or username to find people
                across the university.
              </p>

            </div>
          )}

          {/* No results */}

          {searchText.trim() &&
            !searchingUsers &&
            !searchError &&
            searchResults.length === 0 && (
              <div className="
                rounded-2xl
                border
                border-dashed
                border-gray-200
                bg-white
                p-8
                text-center
              ">

                <User
                  size={38}
                  className="mx-auto mb-3 text-violet-500"
                />

                <h2 className="font-semibold text-slate-900">
                  No people found
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  No users matched{" "}
                  <span className="font-medium text-slate-700">
                    "{searchText}"
                  </span>
                  .
                </p>

              </div>
            )}

          {/* Results */}

          {searchResults.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">

              {searchResults.map((targetUser) => {

                const action =
                  getUserAction(targetUser);

                const ActionIcon = action.icon;

                return (
                  <div
                    key={targetUser.id}
                    className="
                      flex
                      items-center
                      justify-between
                      gap-3
                      rounded-2xl
                      border
                      border-gray-100
                      bg-white
                      p-4
                      shadow-sm
                      transition
                      hover:border-violet-200
                      hover:shadow-md
                    "
                  >

                    {/* USER INFORMATION */}

                    <button
                      type="button"
                      onClick={() =>
                        handleSelectUser(targetUser)
                      }
                      className="
                        flex
                        min-w-0
                        flex-1
                        items-center
                        gap-3.5
                        text-left
                      "
                    >

                      {/* Avatar */}

                      <div className="
                        relative
                        flex
                        h-12
                        w-12
                        shrink-0
                        items-center
                        justify-center
                        overflow-hidden
                        rounded-full
                        bg-violet-100
                        ring-2
                        ring-violet-500/20
                      ">

                        {targetUser.avatar_url ? (
                          <img
                            src={targetUser.avatar_url}
                            alt=""
                            className="
                              h-full
                              w-full
                              object-cover
                            "
                          />
                        ) : (
                          <User
                            size={22}
                            className="text-violet-600"
                          />
                        )}

                      </div>

                      {/* User details */}

                      <div className="min-w-0 flex-1">

                        <p className="
                          truncate
                          text-base
                          font-semibold
                          text-slate-900
                        ">
                          {targetUser.full_name ||
                            targetUser.username ||
                            "Unknown user"}
                        </p>

                        {targetUser.username && (
                          <p className="
                            truncate
                            text-xs
                            text-slate-500
                          ">
                            @{targetUser.username}
                          </p>
                        )}

                        {/* Role */}

                        {targetUser.role && (
                          <span className="
                            mt-1
                            inline-flex
                            items-center
                            rounded-full
                            bg-violet-100
                            px-2.5
                            py-0.5
                            text-[11px]
                            font-medium
                            capitalize
                            text-violet-700
                          ">
                            {targetUser.role.replace(
                              "_",
                              " "
                            )}
                          </span>
                        )}

                      </div>

                    </button>

                    {/* ACTION BUTTON */}

                    {action.type !== "none" && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleSelectUser(targetUser);
                        }}
                        className="
                          flex
                          shrink-0
                          items-center
                          gap-1.5
                          rounded-xl
                          bg-violet-600
                          px-3
                          py-2
                          text-xs
                          font-semibold
                          text-white
                          shadow-sm
                          transition
                          hover:bg-violet-700
                          active:scale-95
                        "
                      >

                        <ActionIcon size={14} />

                        <span className="hidden sm:inline">
                          {action.label}
                        </span>

                      </button>
                    )}

                  </div>
                );
              })}

            </div>
          )}

        </div>

      </div>
    </div>
  );
}

export default SearchPage;