
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Edit3,
  MessageCircle,
  Sparkles,
  User,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import ConversationList from "../components/messages/CoversationList";
import MessageList from "../components/messages/MessageList";
import MessageComposer from "../components/messages/MessageComposer";
import MessageRequestModal from "../components/messages/MessageRequestModal";

import {
  getMessagingState,
  getMessagingProfile,
  getUserConversations,
  getConversationMessages,
  createPrivateConversation,
  createConnectionRequest,
  createMessageRequest,
  sendMessage,
  markConversationAsRead,
  subscribeToConversationMessages,
  subscribeToUserConversations,
} from "../services/messaging/messagingService";

import {
  canRequestConnection,
  canRequestMessage,
} from "../services/messaging/messagingPermissions";

export default function MessagesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentUser = profile || user;
  const currentUserId = currentUser?.id;

  const messagesEndRef = useRef(null);
  const mountedRef = useRef(true);

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [messagingState, setMessagingState] = useState(null);
  const [requestUser, setRequestUser] = useState(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [connectionNotice, setConnectionNotice] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showConversation, setShowConversation] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadConversations = useCallback(async () => {
    if (!currentUserId) return [];

    try {
      setLoadingConversations(true);

      const data = await getUserConversations(currentUserId);

      if (mountedRef.current) {
        setConversations(Array.isArray(data) ? data : []);
      }

      return data || [];
    } catch (err) {
      if (mountedRef.current) {
        setError(err?.message || "Unable to load conversations.");
      }

      return [];
    } finally {
      if (mountedRef.current) {
        setLoadingConversations(false);
      }
    }
  }, [currentUserId]);

  const loadMessages = useCallback(
    async (conversationId) => {
      if (!conversationId || !currentUserId) return [];

      try {
        setLoadingMessages(true);
        setError("");

        const data = await getConversationMessages(conversationId);

        if (mountedRef.current) {
          setMessages(Array.isArray(data) ? data : []);
        }

        try {
          await markConversationAsRead(conversationId, currentUserId);
        } catch (readError) {
          console.error("Unable to mark conversation as read:", readError);
        }

        if (mountedRef.current) {
          setConversations((previous) =>
            previous.map((conversation) =>
              conversation.id === conversationId
                ? { ...conversation, unreadCount: 0 }
                : conversation
            )
          );
        }

        return data || [];
      } catch (err) {
        if (mountedRef.current) {
          setError(err?.message || "Unable to load messages.");
        }

        return [];
      } finally {
        if (mountedRef.current) {
          setLoadingMessages(false);
        }
      }
    },
    [currentUserId]
  );

  const loadMessagingState = useCallback(
    async (targetUser) => {
      if (!currentUserId || !targetUser?.id) return null;

      try {
        setLoadingUser(true);

        const state = await getMessagingState(currentUser, targetUser);

        if (mountedRef.current) {
          setMessagingState(state);
        }

        return state;
      } catch (err) {
        if (mountedRef.current) {
          setError(err?.message || "Unable to check messaging permissions.");
        }

        return null;
      } finally {
        if (mountedRef.current) {
          setLoadingUser(false);
        }
      }
    },
    [currentUserId, currentUser]
  );

  // Initial conversation load
  useEffect(() => {
    if (currentUserId) {
      loadConversations();
    } else {
      setConversations([]);
      setLoadingConversations(false);
    }
  }, [currentUserId, loadConversations]);

  // Realtime conversation updates
  useEffect(() => {
    if (!currentUserId) return;

    let subscription = null;

    const timer = setTimeout(() => {
      subscription = subscribeToUserConversations(
        currentUserId,
        () => loadConversations()
      );
    }, 500);

    return () => {
      clearTimeout(timer);

      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, [currentUserId, loadConversations]);

  // Realtime messages
  useEffect(() => {
    if (!activeConversation?.id) return;

    const subscription = subscribeToConversationMessages(
      activeConversation.id,
      (newMessage) => {
        if (newMessage.sender_id === currentUserId) return;

        setMessages((previous) =>
          previous.some((message) => message.id === newMessage.id)
            ? previous
            : [...previous, newMessage]
        );

        loadConversations();
      }
    );

    return () => {
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, [activeConversation?.id, currentUserId, loadConversations]);

  // Open conversation passed through navigation state
  useEffect(() => {
    const activeId = location.state?.activeConversationId;

    if (!activeId || conversations.length === 0) return;

    const conversation = conversations.find(
      (item) => item.id === activeId
    );

    if (!conversation) return;

    setActiveConversation(conversation);
    setSelectedUser(conversation.otherUser || null);
    setShowConversation(true);
    loadMessages(conversation.id);

    if (conversation.otherUser) {
      loadMessagingState(conversation.otherUser);
    }
  }, [
    location.state,
    conversations,
    loadMessages,
    loadMessagingState,
  ]);

  // Support /messages?user=USER_ID links
  const urlUserId = searchParams.get("user");

  useEffect(() => {
    if (!urlUserId || !currentUserId || conversations.length === 0) {
      return;
    }

    let cancelled = false;

    const openUser = async () => {
      try {
        const existing = conversations.find(
          (conversation) => conversation.otherUser?.id === urlUserId
        );

        if (existing && !cancelled) {
          setActiveConversation(existing);
          setSelectedUser(existing.otherUser);
          setShowConversation(true);
          await loadMessages(existing.id);
          return;
        }

        const targetUser = await getMessagingProfile(urlUserId);

        if (cancelled || !targetUser?.id) return;

        await handleSelectUser(targetUser);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Unable to open this conversation.");
        }
      } finally {
        if (!cancelled) {
          setSearchParams({}, { replace: true });
        }
      }
    };

    openUser();

    return () => {
      cancelled = true;
    };
    // This effect responds to the URL's user parameter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlUserId]);

  const handleSelectConversation = async (conversation) => {
    if (!conversation?.id) return;

    setError("");
    setNotice("");
    setConnectionNotice("");
    setMessageText("");
    setActiveConversation(conversation);
    setSelectedUser(conversation.otherUser || null);
    setShowConversation(true);

    await loadMessages(conversation.id);

    if (conversation.otherUser) {
      await loadMessagingState(conversation.otherUser);
    }
  };

  const handleSelectUser = async (targetUser) => {
    if (!targetUser?.id || targetUser.id === currentUserId) return;

    setError("");
    setNotice("");
    setConnectionNotice("");
    setActiveConversation(null);
    setMessages([]);
    setSelectedUser(targetUser);
    setShowConversation(true);

    const state = await loadMessagingState(targetUser);

    if (!state) return;

    const existing = conversations.find(
      (conversation) => conversation.otherUser?.id === targetUser.id
    );

    if (existing) {
      setActiveConversation(existing);
      await loadMessages(existing.id);
      return;
    }

    if (
      ["connected", "session_active", "direct"].includes(state.status)
    ) {
      try {
        setLoadingMessages(true);

        const conversation = await createPrivateConversation(
          currentUserId,
          targetUser.id
        );

        const freshConversations = await loadConversations();

        const found =
          freshConversations.find((item) => item.id === conversation?.id) ||
          freshConversations.find(
            (item) => item.otherUser?.id === targetUser.id
          );

        if (found) {
          setActiveConversation(found);
          await loadMessages(found.id);
        }
      } catch (err) {
        setError(err?.message || "Unable to create conversation.");
      } finally {
        setLoadingMessages(false);
      }

      return;
    }

    if (
      [
        "request_required",
        "session_expired",
        "connection_required",
      ].includes(state.status)
    ) {
      setRequestUser(targetUser);
      return;
    }

    setConnectionNotice(state.reason || "Messaging is not available.");
  };

  const handleSendMessage = async () => {
    const content = messageText.trim();

    if (!content || !activeConversation?.id || sendingMessage) return;

    try {
      setSendingMessage(true);
      setError("");

      const newMessage = await sendMessage({
        conversationId: activeConversation.id,
        senderId: currentUserId,
        content,
      });

      if (mountedRef.current) {
        setMessages((previous) =>
          previous.some((message) => message.id === newMessage.id)
            ? previous
            : [...previous, newMessage]
        );

        setMessageText("");

        setConversations((previous) =>
          previous
            .map((conversation) =>
              conversation.id === activeConversation.id
                ? {
                    ...conversation,
                    lastMessage: newMessage,
                    updated_at: newMessage.created_at,
                  }
                : conversation
            )
            .sort(
              (a, b) =>
                new Date(b.updated_at || 0) -
                new Date(a.updated_at || 0)
            )
        );
      }

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
        });
      }, 100);
    } catch (err) {
      setError(err?.message || "Unable to send message.");
    } finally {
      if (mountedRef.current) {
        setSendingMessage(false);
      }
    }
  };

  const handleAttach = async (file) => {
    if (!file || !activeConversation?.id) return;

    try {
      setUploading(true);
      setError("");

      // Keep your existing media upload service here.
      const media = await uploadMessageMedia(
        file,
        activeConversation.id,
        currentUserId
      );

      const newMessage = await sendMessage({
        conversationId: activeConversation.id,
        senderId: currentUserId,
        content: "",
        media_url: media.media_url,
        media_type: media.media_type,
      });

      if (mountedRef.current) {
        setMessages((previous) =>
          previous.some((message) => message.id === newMessage.id)
            ? previous
            : [...previous, newMessage]
        );

        setConversations((previous) =>
          previous.map((conversation) =>
            conversation.id === activeConversation.id
              ? {
                  ...conversation,
                  lastMessage: newMessage,
                  updated_at: newMessage.created_at,
                }
              : conversation
          )
        );
      }
    } catch (err) {
      setError(err?.message || "Unable to upload attachment.");
    } finally {
      setUploading(false);
    }
  };

  const handleBack = () => {
    setShowConversation(false);
    setActiveConversation(null);
    setSelectedUser(null);
    setMessages([]);
    setMessagingState(null);
    setMessageText("");
    setError("");
    setNotice("");
    setConnectionNotice("");
  };

  const composerState = useMemo(() => {
    if (!selectedUser) {
      return {
        disabled: true,
        message: "Select a conversation",
      };
    }

    if (!messagingState || loadingUser) {
      return {
        disabled: true,
        message: "Checking messaging access...",
      };
    }

    if (messagingState.status === "request_pending") {
      return {
        disabled: true,
        message: "Request pending...",
      };
    }

    if (messagingState.status === "session_expired") {
      return {
        disabled: true,
        message: "Session expired. Send a new request.",
      };
    }

    if (
      ["connected", "session_active", "direct"].includes(
        messagingState.status
      )
    ) {
      return {
        disabled: false,
        message: "",
      };
    }

    if (messagingState.status === "unavailable") {
      return {
        disabled: true,
        message: "Unavailable",
      };
    }

    return {
      disabled: true,
      message: "Send a request to start messaging",
    };
  }, [selectedUser, messagingState, loadingUser]);

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/70">

      {/* CONVERSATION SIDEBAR */}
      <aside
        className={`relative flex w-full flex-col border-r border-white/80 bg-white/70 shadow-[8px_0_35px_rgba(91,33,182,0.06)] backdrop-blur-2xl md:w-[350px] lg:w-[390px] ${
          showConversation ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="flex items-center justify-between border-b border-violet-100/80 bg-white/50 px-4 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-violet-100 bg-white/80 text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>

            <h1 className="truncate bg-gradient-to-r from-violet-950 via-purple-800 to-fuchsia-700 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
              @{currentUser?.username || "Direct"}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => navigate("/search")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-violet-100 bg-white/80 text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]"
            aria-label="Search people"
          >
            <Edit3 size={19} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversation?.id}
            onSelectConversation={handleSelectConversation}
            loading={loadingConversations}
          />
        </div>
      </aside>

      {/* CHAT PANEL */}
      <main
        className={`relative flex min-w-0 flex-1 flex-col bg-white/45 backdrop-blur-xl ${
          showConversation ? "flex" : "hidden md:flex"
        }`}
      >
        {!activeConversation && !selectedUser ? (
          <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden p-8 text-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-300/20 blur-3xl"
            />

            <div className="relative mb-6 flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white bg-gradient-to-br from-violet-100 via-purple-50 to-fuchsia-100 shadow-[0_0_0_1px_rgba(167,139,250,0.35),0_15px_50px_rgba(124,58,237,0.18)]">
              <MessageCircle
                size={48}
                className="text-violet-600"
              />
              <Sparkles
                size={20}
                className="absolute right-3 top-3 text-fuchsia-500"
              />
            </div>

            <h2 className="bg-gradient-to-r from-violet-950 via-purple-800 to-fuchsia-700 bg-clip-text text-2xl font-extrabold text-transparent">
              Your Messages
            </h2>

            <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">
              Select a conversation or search for someone to connect with
              your university community.
            </p>

            <button
              type="button"
              onClick={() => navigate("/search")}
              className="mt-6 rounded-xl bg-gradient-to-r from-violet-700 via-purple-600 to-fuchsia-600 px-5 py-3 text-sm font-bold text-white shadow-[0_8px_25px_rgba(124,58,237,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(168,85,247,0.4)]"
            >
              Search people
            </button>
          </div>
        ) : (
          <>
            {/* CHAT HEADER */}
            <header className="flex h-16 shrink-0 items-center gap-3 border-b border-violet-100/80 bg-white/70 px-4 shadow-[0_4px_20px_rgba(91,33,182,0.04)] backdrop-blur-2xl sm:px-5">
              <button
                type="button"
                onClick={handleBack}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-100 bg-white/80 text-violet-700 transition hover:bg-violet-50 md:hidden"
                aria-label="Back to conversations"
              >
                <ArrowLeft size={19} />
              </button>

              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-violet-100 to-fuchsia-100 shadow-[0_0_0_2px_rgba(167,139,250,0.5),0_0_20px_rgba(168,85,247,0.14)]">
                {selectedUser?.avatar_url ? (
                  <img
                    src={selectedUser.avatar_url}
                    alt={selectedUser.full_name || selectedUser.username || "User"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User size={19} className="text-violet-600" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-bold text-slate-900">
                  {selectedUser?.full_name || selectedUser?.username}
                </h2>

                {selectedUser?.role && (
                  <p className="mt-0.5 text-xs capitalize text-violet-600">
                    {selectedUser.role.replace("_", " ")}
                  </p>
                )}
              </div>

              {messagingState?.status === "session_active" && (
                <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Session active
                </span>
              )}
            </header>

            {/* ALERTS */}
            {(error || notice || connectionNotice) && (
              <div className="space-y-2 border-b border-violet-100/80 bg-white/40 px-4 py-3 sm:px-5">
                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200/80 bg-rose-50/90 p-3 text-sm text-rose-700">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {notice && (
                  <div className="flex items-start gap-2 rounded-xl border border-violet-200/80 bg-violet-50/90 p-3 text-sm text-violet-800">
                    <Sparkles size={17} className="mt-0.5 shrink-0" />
                    <span>{notice}</span>
                  </div>
                )}

                {connectionNotice && (
                  <div className="rounded-xl border border-violet-200/80 bg-violet-50/90 p-3 text-sm text-violet-900">
                    {connectionNotice}
                  </div>
                )}
              </div>
            )}

            {/* MESSAGE HISTORY */}
            <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-white/30 via-violet-50/20 to-fuchsia-50/30 px-2 sm:px-4">
              <MessageList
                messages={messages}
                currentUserId={currentUserId}
                loading={loadingMessages}
              />

              <div ref={messagesEndRef} />
            </div>

            {/* MESSAGE COMPOSER */}
            <div className="shrink-0 border-t border-violet-100/80 bg-white/75 p-2 backdrop-blur-2xl sm:p-3">
              <MessageComposer
                value={messageText}
                onChange={setMessageText}
                onSend={handleSendMessage}
                onAttach={handleAttach}
                disabled={
                  composerState.disabled ||
                  sendingMessage ||
                  uploading
                }
                disabledMessage={composerState.message}
                sending={sendingMessage || uploading}
                placeholder={
                  uploading ? "Uploading..." : "Write a message..."
                }
              />
            </div>
          </>
        )}
      </main>

      {/* MESSAGE REQUEST MODAL */}
      <MessageRequestModal
        open={Boolean(requestUser)}
        user={requestUser}
        initialMessage={requestMessage}
        submitting={sendingRequest}
        onClose={() => {
          if (sendingRequest) return;
          setRequestUser(null);
        }}
        onSubmit={async (msg) => {
          if (!requestUser?.id) return;

          const targetForReload = requestUser;

          try {
            setSendingRequest(true);
            setError("");

            if (messagingState?.status === "connection_required") {
              await createConnectionRequest({
                requesterId: currentUserId,
                targetId: requestUser.id,
                message: msg,
              });
            } else {
              await createMessageRequest({
                requesterId: currentUserId,
                targetId: requestUser.id,
                message: msg,
              });
            }

            setRequestUser(null);
            setNotice("Request sent successfully");

            await loadMessagingState(targetForReload);
          } catch (err) {
            setError(err?.message || "Unable to send request.");
          } finally {
            setSendingRequest(false);
          }
        }}
      />
    </div>
  );
}
