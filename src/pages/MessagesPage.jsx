import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  searchMessagingUsers,
  getUserConversations,
  getConversationMessages,
  createPrivateConversation,
  createConnectionRequest,
  createMessageRequest,
  sendMessage,
  markConversationAsRead,
} from "../services/messaging/messagingService";

import {
  canRequestConnection,
  canRequestMessage,
} from "../services/messaging/messagingPermissions";

export default function MessagesPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentUser = profile || user;

  const messagesEndRef = useRef(null);
  const urlUserHandledRef = useRef(null);

  // ============================================================
  // CONVERSATIONS
  // ============================================================

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);

  // ============================================================
  // MESSAGES
  // ============================================================

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");

  // ============================================================
  // USER / REQUEST STATE
  // ============================================================

  const [selectedUser, setSelectedUser] = useState(null);
  const [messagingState, setMessagingState] = useState(null);

  const [requestUser, setRequestUser] = useState(null);
  const [requestMessage, setRequestMessage] = useState("");

  const [connectionNotice, setConnectionNotice] = useState("");

  // ============================================================
  // LOADING
  // ============================================================

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);

  // ============================================================
  // ERROR / NOTICE
  // ============================================================

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // ============================================================
  // MOBILE
  // ============================================================

  const [showConversation, setShowConversation] = useState(false);

  // ============================================================
  // LOAD CONVERSATIONS
  // ============================================================

  const loadConversations = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      setLoadingConversations(true);
      setError("");

      const data = await getUserConversations(currentUser.id);
      setConversations(data || []);
    } catch (err) {
      console.error("Failed to load conversations:", err);
      setError(err?.message || "Unable to load your conversations.");
    } finally {
      setLoadingConversations(false);
    }
  }, [currentUser?.id]);

  // ============================================================
  // LOAD MESSAGES
  // ============================================================

  const loadMessages = useCallback(
    async (conversationId) => {
      if (!conversationId || !currentUser?.id) return;

      try {
        setLoadingMessages(true);
        setError("");

        const data = await getConversationMessages(
          conversationId,
          currentUser.id
        );

        setMessages(data || []);
        await markConversationAsRead(conversationId, currentUser.id);

        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, unreadCount: 0 }
              : conversation
          )
        );
      } catch (err) {
        console.error("Failed to load messages:", err);
        setError(err?.message || "Unable to load messages.");
      } finally {
        setLoadingMessages(false);
      }
    },
    [currentUser?.id]
  );

  useEffect(() => {
    if (!currentUser?.id) return;
    loadConversations();
  }, [currentUser?.id, loadConversations]);

  // ============================================================
  // SELECT CONVERSATION
  // ============================================================

  const handleSelectConversation = async (conversation) => {
    setError("");
    setNotice("");
    setConnectionNotice("");

    setActiveConversation(conversation);
    setSelectedUser(conversation.otherUser || null);
    setShowConversation(true);

    await loadMessages(conversation.id);

    if (conversation.otherUser) {
      await loadMessagingState(conversation.otherUser);
    }
  };

  // ============================================================
  // LOAD MESSAGING STATE
  // ============================================================

  const loadMessagingState = async (targetUser) => {
    if (!currentUser?.id || !targetUser?.id) return null;

    try {
      setLoadingUser(true);
      const state = await getMessagingState(currentUser, targetUser);
      setMessagingState(state);
      return state;
    } catch (err) {
      console.error("Failed to load messaging state:", err);
      setError(err?.message || "Unable to determine messaging permissions.");
      return null;
    } finally {
      setLoadingUser(false);
    }
  };

  // ============================================================
  // SELECT USER (USED BY DEEP LINK)
  // ============================================================

  const handleSelectUser = async (targetUser) => {
    if (!targetUser?.id || !currentUser?.id) return;

    setError("");
    setNotice("");
    setConnectionNotice("");
    setSelectedUser(targetUser);

    const state = await loadMessagingState(targetUser);
    if (!state) return;

    if (state.rule?.blocked) {
      setConnectionNotice(
        "Messaging with super administrators is not available."
      );
      return;
    }

    const existingConversation = conversations.find(
      (conversation) => conversation.otherUser?.id === targetUser.id
    );

    if (existingConversation) {
      setActiveConversation(existingConversation);
      setShowConversation(true);
      await loadMessages(existingConversation.id);
      return;
    }

    if (state.rule?.canMessage) {
      try {
        const conversation = await createPrivateConversation(targetUser);
        setActiveConversation(conversation);
        setShowConversation(true);
        await loadConversations();
        await loadMessages(conversation.id);
        return;
      } catch (err) {
        console.error("Failed to create conversation:", err);
        setError(err?.message || "Unable to start this conversation.");
        return;
      }
    }

    if (canRequestMessage(state.rule)) {
      if (state.activeSession) {
        setNotice(
          "You already have an active messaging session with this user."
        );
        return;
      }

      if (state.pendingRequest) {
        setNotice("You already have a pending message request with this user.");
        return;
      }

      setRequestUser(targetUser);
      setRequestMessage("");
      return;
    }

    if (canRequestConnection(state.rule)) {
      if (state.connected) {
        setNotice("You are already connected with this user.");
        return;
      }

      if (state.pendingRequest) {
        setConnectionNotice(
          "You already have a pending connection request with this user."
        );
        return;
      }

      const confirmed = window.confirm(
        `You need to connect with ${
          targetUser.full_name || targetUser.username || "this user"
        } before messaging. Send a connection request?`
      );

      if (!confirmed) return;

      await handleCreateConnectionRequest(targetUser);
      return;
    }

    setConnectionNotice(state.rule?.reason || "You cannot message this user.");
  };

  // ============================================================
  // CREATE CONNECTION REQUEST
  // ============================================================

  const handleCreateConnectionRequest = async (targetUser) => {
    if (!targetUser?.id) return;

    try {
      setSendingRequest(true);
      setError("");
      setNotice("");
      setConnectionNotice("");

      await createConnectionRequest(targetUser.id);
      setNotice("Connection request sent successfully.");
      await loadMessagingState(targetUser);
    } catch (err) {
      console.error("Failed to create connection request:", err);
      setError(err?.message || "Unable to send connection request.");
    } finally {
      setSendingRequest(false);
    }
  };

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeConversation?.id) return;

    try {
      setSendingMessage(true);
      setError("");

      const newMessage = await sendMessage(
        activeConversation.id,
        messageText.trim()
      );

      setMessages((prev) => [...prev, newMessage]);
      setMessageText("");

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
                ...conversation,
                lastMessage: newMessage,
                updated_at: newMessage.created_at,
              }
            : conversation
        )
      );

      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    } catch (err) {
      console.error("Failed to send message:", err);
      setError(err?.message || "Unable to send message.");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAttach = () => {
    console.log("Attachment selected");
  };

  // ============================================================
  // URL DEEP LINK (navigating from external search)
  // ============================================================

  useEffect(() => {
    const userId = searchParams.get("user");

    if (!userId || !currentUser?.id || urlUserHandledRef.current === userId) {
      return;
    }

    urlUserHandledRef.current = userId;

    const openUrlUser = async () => {
      try {
        const targetUser = await searchMessagingUsers(userId, currentUser.id, {
          exactId: true,
        });

        if (targetUser?.length) {
          await handleSelectUser(targetUser[0]);
        }
      } catch (err) {
        console.error("Unable to open requested user:", err);
      } finally {
        setSearchParams({}, { replace: true });
      }
    };

    openUrlUser();
  }, [searchParams, currentUser?.id, setSearchParams]);

  const handleBack = () => {
    setShowConversation(false);
    setActiveConversation(null);
    setSelectedUser(null);
    setMessages([]);
    setMessagingState(null);
  };

  // ============================================================
  // COMPOSER STATE
  // ============================================================

  const getComposerState = () => {
    if (!selectedUser) {
      return {
        disabled: true,
        message: "Select a conversation to start messaging.",
      };
    }

    if (messagingState?.rule?.blocked) {
      return {
        disabled: true,
        message: "Messaging with this user is not available.",
      };
    }

    if (
      messagingState?.rule?.requiresMessageRequest &&
      !messagingState?.activeSession
    ) {
      return {
        disabled: true,
        message: "Send a message request and wait for it to be accepted.",
      };
    }

    if (
      messagingState?.rule?.requiresConnection &&
      !messagingState?.connected
    ) {
      return {
        disabled: true,
        message: "You must be connected with this user before messaging.",
      };
    }

    if (
      messagingState?.rule?.requiresMessageRequest &&
      messagingState?.sessionExpired
    ) {
      return {
        disabled: true,
        message:
          "Your messaging session has expired. Send a new message request to continue.",
      };
    }

    return { disabled: false, message: "" };
  };

  const composerState = getComposerState();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-white text-gray-900 font-sans">
      {/* ======================================================
          LEFT — CONVERSATIONS
      ======================================================= */}
      <aside
        className={`flex w-full flex-col border-r border-gray-100 bg-white md:w-[350px] lg:w-[390px] ${
          showConversation ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Top Navigation & Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              title="Go back to previous screen"
              className="rounded-full p-2 text-purple-600 transition hover:bg-purple-50 active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              {currentUser?.username ? `@${currentUser.username}` : "Direct"}
            </h1>
          </div>

          <button
            title="New Message"
            className="rounded-full p-2 text-purple-600 transition hover:bg-purple-50 active:scale-95"
          >
            <Edit3 size={20} />
          </button>
        </div>

        {/* Conversations List */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversation?.id}
            searchText=""
            onSearchChange={() => {}}
            onSelectConversation={handleSelectConversation}
            loading={loadingConversations}
          />
        </div>
      </aside>

      {/* ======================================================
          RIGHT — CHAT MAIN WINDOW
      ======================================================= */}
      <main
        className={`flex min-w-0 flex-1 flex-col bg-white ${
          showConversation ? "flex" : "hidden md:flex"
        }`}
      >
        {!activeConversation && !selectedUser ? (
          /* Empty State */
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full border-2 border-purple-500 bg-purple-50 shadow-sm">
              <MessageCircle size={48} className="text-purple-600" />
            </div>

            <h2 className="text-xl font-bold text-gray-900">Your Messages</h2>
            <p className="mt-2 max-w-xs text-sm text-gray-500">
              Send private messages to students, teachers, or administrators.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="flex h-16 items-center gap-3 border-b border-gray-100 px-5">
              <button
                type="button"
                onClick={handleBack}
                className="rounded-full p-2 text-purple-600 transition hover:bg-purple-50 md:hidden"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-2 ring-purple-500/20 bg-purple-100">
                {selectedUser?.avatar_url ? (
                  <img
                    src={selectedUser.avatar_url}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <User size={18} className="text-purple-600" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold text-gray-900 text-sm">
                  {selectedUser?.full_name ||
                    selectedUser?.username ||
                    activeConversation?.name ||
                    "Conversation"}
                </h2>
                {selectedUser?.role && (
                  <p className="text-xs capitalize text-purple-600 font-medium">
                    {selectedUser.role}
                  </p>
                )}
              </div>

              {messagingState?.activeSession && (
                <div className="hidden items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-medium text-purple-700 sm:flex">
                  <span className="h-2 w-2 rounded-full bg-purple-600 animate-pulse" />
                  Active Session
                </div>
              )}
            </header>

            {/* Notices / Warnings */}
            {(notice || connectionNotice || error) && (
              <div className="border-b border-gray-100 px-5 py-3">
                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-red-50 p-3 text-sm text-red-700 border border-red-100">
                    <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
                    <span>{error}</span>
                  </div>
                )}

                {!error && notice && (
                  <div className="flex items-center gap-2 rounded-xl bg-purple-50 p-3 text-sm font-medium text-purple-800 border border-purple-100">
                    <Sparkles size={16} className="text-purple-600" />
                    <span>{notice}</span>
                  </div>
                )}

                {!error && !notice && connectionNotice && (
                  <div className="rounded-xl bg-purple-50/70 p-3 text-sm text-purple-900 border border-purple-100">
                    {connectionNotice}
                  </div>
                )}
              </div>
            )}

            {/* Messages Area */}
            <div className="min-h-0 flex-1 overflow-y-auto px-2">
              <MessageList
                messages={messages}
                currentUserId={currentUser?.id}
                loading={loadingMessages}
                error=""
              />
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Box */}
            <MessageComposer
              value={messageText}
              onChange={setMessageText}
              onSend={handleSendMessage}
              onAttach={handleAttach}
              disabled={
                composerState.disabled || sendingMessage || loadingUser
              }
              sending={sendingMessage}
              placeholder="Message..."
              disabledMessage={composerState.message}
              allowAttachments={true}
            />
          </>
        )}
      </main>

      {/* Message Request Modal */}
      <MessageRequestModal
        open={Boolean(requestUser)}
        user={requestUser}
        initialMessage={requestMessage}
        submitting={sendingRequest}
        onClose={() => {
          if (sendingRequest) return;
          setRequestUser(null);
          setRequestMessage("");
        }}
        onSubmit={async (message) => {
          setRequestMessage(message);

          try {
            setSendingRequest(true);
            await createMessageRequest(
              requestUser.id,
              message?.trim() || null
            );

            setRequestUser(null);
            setRequestMessage("");
            setNotice("Message request sent successfully.");
            await loadMessagingState(requestUser);
          } catch (err) {
            console.error("Failed to send message request:", err);
            setError(err?.message || "Unable to send message request.");
          } finally {
            setSendingRequest(false);
          }
        }}
      />
    </div>
  );
}