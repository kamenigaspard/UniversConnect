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
  getMessagingProfile,
  getUserConversations,
  getConversationMessages,
  createPrivateConversation,
  createConnectionRequest,
  createMessageRequest,
  sendMessage,
  markConversationAsRead,
  subscribeToUserMessages,
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
  const activeConversationIdRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const conversationsRef = useRef([]);

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
  const [realtimeStatus, setRealtimeStatus] = useState("CONNECTING");

  const loadConversations = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      setLoadingConversations(true);
      setError("");
      const data = await getUserConversations(currentUser.id);
      setConversations(data || []);
      return data || [];
    } catch (err) {
      console.error("Failed to load conversations:", err);
      setError(err?.message || "Unable to load your conversations.");
      return [];
    } finally {
      setLoadingConversations(false);
    }
  }, [currentUser?.id]);

  const loadMessages = useCallback(
    async (conversationId) => {
      if (!conversationId || !currentUser?.id) return;

      try {
        setLoadingMessages(true);
        setError("");

        const data = await getConversationMessages({
          conversationId,
          currentUserId: currentUser.id,
        });

        setMessages(data || []);

        await markConversationAsRead({
          conversationId,
          currentUserId: currentUser.id,
        });

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

  const loadMessagingState = useCallback(
    async (targetUser) => {
      if (!currentUser?.id || !targetUser?.id) return null;

      try {
        setLoadingUser(true);
        const state = await getMessagingState({
          currentUser: currentUser,
          targetUserId: targetUser.id,
        });
        setMessagingState(state);
        return state;
      } catch (err) {
        console.error("Failed to load messaging state:", err);
        setError(err?.message || "Unable to determine messaging permissions.");
        return null;
      } finally {
        setLoadingUser(false);
      }
    },
    [currentUser]
  );

  useEffect(() => {
    if (!currentUser?.id) return;
    loadConversations();
  }, [currentUser?.id, loadConversations]);

  const mergeRealtimeMessageIntoList = useCallback((incomingMessage) => {
    if (!incomingMessage?.id) return;

    setMessages((prev) => {
      const existingIndex = prev.findIndex(
        (message) => message.id === incomingMessage.id
      );

      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = { ...next[existingIndex], ...incomingMessage };
        return next.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }

      return [...prev, incomingMessage].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }, []);

  const updateConversationFromRealtimeMessage = useCallback(
    (incomingMessage) => {
      if (!incomingMessage?.id || !incomingMessage?.conversation_id) return;

      const isCurrentConversation =
        activeConversationIdRef.current === incomingMessage.conversation_id;
      const isOwnMessage =
        incomingMessage.sender_id === currentUserIdRef.current;
      const conversationWasKnown = conversationsRef.current.some(
        (conversation) => conversation.id === incomingMessage.conversation_id
      );

      setConversations((prev) => {
        if (!conversationWasKnown) {
          return prev;
        }

        return [...prev]
          .map((conversation) => {
            if (conversation.id !== incomingMessage.conversation_id) {
              return conversation;
            }

            const currentUnread = Number(conversation.unreadCount) || 0;
            const shouldIncrementUnread =
              !isOwnMessage && !isCurrentConversation;

            return {
              ...conversation,
              lastMessage: incomingMessage,
              updated_at:
                incomingMessage.created_at || conversation.updated_at,
              unreadCount: shouldIncrementUnread
                ? currentUnread + 1
                : isCurrentConversation
                ? 0
                : currentUnread,
            };
          })
          .sort(
            (a, b) =>
              new Date(b.updated_at || 0).getTime() -
              new Date(a.updated_at || 0).getTime()
          );
      });

      if (!conversationWasKnown) {
        loadConversations().catch((err) => {
          console.error(
            "Unable to refresh conversations after a realtime message:",
            err
          );
        });
      }
    },
    [loadConversations]
  );

  useEffect(() => {
    activeConversationIdRef.current = activeConversation?.id || null;
    currentUserIdRef.current = currentUser?.id || null;
    conversationsRef.current = conversations;
  }, [activeConversation?.id, currentUser?.id, conversations]);

  useEffect(() => {
    if (!currentUser?.id) return undefined;

    let disposed = false;

    const unsubscribe = subscribeToUserMessages({
      currentUserId: currentUser.id,
      onInsert: (incomingMessage) => {
        if (disposed) return;

        const isCurrentConversation =
          activeConversationIdRef.current === incomingMessage?.conversation_id;

        if (isCurrentConversation) {
          mergeRealtimeMessageIntoList(incomingMessage);
        }
        updateConversationFromRealtimeMessage(incomingMessage);

        if (isCurrentConversation && incomingMessage?.sender_id !== currentUserIdRef.current) {
          markConversationAsRead({
            conversationId: incomingMessage.conversation_id,
            currentUserId: currentUserIdRef.current,
          }).catch((err) => {
            console.error("Unable to mark realtime message as read:", err);
          });
        }
      },
      onUpdate: (incomingMessage) => {
        if (disposed || !incomingMessage) return;

        if (activeConversationIdRef.current === incomingMessage.conversation_id) {
          mergeRealtimeMessageIntoList(incomingMessage);
        }

        updateConversationFromRealtimeMessage(incomingMessage);
      },
      onDelete: (deletedMessage) => {
        if (disposed || !deletedMessage?.id) return;

        if (activeConversationIdRef.current === deletedMessage.conversation_id) {
          setMessages((prev) =>
            prev.filter((message) => message.id !== deletedMessage.id)
          );
        }

        setConversations((prev) =>
          prev.map((conversation) => {
            if (conversation.id !== deletedMessage.conversation_id) {
              return conversation;
            }

            if (conversation.lastMessage?.id !== deletedMessage.id) {
              return conversation;
            }

            return {
              ...conversation,
              lastMessage: null,
            };
          })
        );
      },
      onStatusChange: (status, subscriptionError) => {
        setRealtimeStatus(status);

        if (subscriptionError) {
          console.error("Realtime status error:", subscriptionError);
        }
      },
    });

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [
    currentUser?.id,
    mergeRealtimeMessageIntoList,
    updateConversationFromRealtimeMessage,
  ]);

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

  const findConversationWithUser = useCallback(
    (list, targetUserId) =>
      (list || []).find(
        (conversation) => conversation.otherUser?.id === targetUserId
      ) || null,
    [],
  );

  const handleCreateConnectionRequest = async (targetUser) => {
    if (!targetUser?.id || !currentUser?.id) return;

    try {
      setSendingRequest(true);
      setError("");
      setNotice("");
      setConnectionNotice("");

      await createConnectionRequest({
        currentUser,
        targetUserId: targetUser.id,
      });

      setNotice("Connection request sent successfully.");
      await loadMessagingState(targetUser);
    } catch (err) {
      console.error("Failed to create connection request:", err);
      setError(err?.message || "Unable to send connection request.");
    } finally {
      setSendingRequest(false);
    }
  };

  const handleSelectUser = async (targetUser) => {
    if (!targetUser?.id || !currentUser?.id) return;

    setError("");
    setNotice("");
    setConnectionNotice("");
    setMessageText("");
    setSelectedUser(targetUser);

    const state = await loadMessagingState(targetUser);
    if (!state) return;

    if (!state.rule?.allowed) {
      setConnectionNotice(
        state.rule?.reason || "Messaging with this user is not available."
      );
      setShowConversation(true);
      return;
    }

    const existingConversation = findConversationWithUser(
      conversations,
      targetUser.id
    );

    if (existingConversation) {
      setActiveConversation(existingConversation);
      setShowConversation(true);
      await loadMessages(existingConversation.id);
      return;
    }

    if (state.canMessage) {
      try {
        const created = await createPrivateConversation({
          currentUser,
          targetUserId: targetUser.id,
        });

        const createdConversationId =
          typeof created === "string"
            ? created
            : created?.id || created?.conversation_id || created?.[0]?.id;

        const freshConversations = await loadConversations();
        const conversation =
          findConversationWithUser(freshConversations, targetUser.id) ||
          (createdConversationId
            ? freshConversations.find((item) => item.id === createdConversationId)
            : null);

        if (!conversation) {
          throw new Error("The conversation was created but could not be loaded.");
        }

        setActiveConversation(conversation);
        setSelectedUser(conversation.otherUser || targetUser);
        setShowConversation(true);
        await loadMessages(conversation.id);
        return;
      } catch (err) {
        console.error("Failed to create conversation:", err);
        setError(err?.message || "Unable to start this conversation.");
        setShowConversation(true);
        return;
      }
    }

    if (canRequestMessage(state.rule)) {
      if (state.activeSession) {
        setNotice("You already have an active messaging session with this user.");
        return;
      }

      if (state.pendingRequest) {
        setNotice(
          state.pendingRequestDirection === "incoming"
            ? "This user has sent you a message request. Open Requests to respond."
            : "You already have a pending message request with this user."
        );
        return;
      }

      setRequestUser(targetUser);
      setRequestMessage("");
      setShowConversation(true);
      return;
    }

    if (canRequestConnection(state.rule)) {
      if (state.connected) {
        setNotice("You are already connected with this user.");
        return;
      }

      if (state.pendingRequest) {
        setConnectionNotice(
          state.pendingRequestDirection === "incoming"
            ? "This user has already sent you a connection request. Open Requests to respond."
            : "You already have a pending connection request with this user."
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

    setConnectionNotice(
      state.rule?.reason || "You cannot message this user."
    );
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeConversation?.id || !selectedUser?.id) {
      return;
    }

    try {
      setSendingMessage(true);
      setError("");

      const newMessage = await sendMessage({
        currentUser,
        conversationId: activeConversation.id,
        targetUserId: selectedUser.id,
        content: messageText.trim(),
      });

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

      setActiveConversation((prev) =>
        prev
          ? { ...prev, lastMessage: newMessage, updated_at: newMessage.created_at }
          : prev
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

  useEffect(() => {
    const userId = searchParams.get("user");

    if (!userId || !currentUser?.id || urlUserHandledRef.current === userId) {
      return;
    }

    urlUserHandledRef.current = userId;

    const openUrlUser = async () => {
      try {
        if (userId === currentUser.id) {
          setError("You cannot message yourself.");
          return;
        }

        const targetUser = await getMessagingProfile(userId);

        if (targetUser?.id) {
          await handleSelectUser(targetUser);
        } else {
          setError("The requested user could not be found.");
        }
      } catch (err) {
        console.error("Unable to open requested user:", err);
        setError(err?.message || "Unable to open the requested user.");
      } finally {
        setSearchParams({}, { replace: true });
      }
    };

    openUrlUser();
  }, [
    searchParams,
    currentUser?.id,
    handleSelectUser,
    setSearchParams,
  ]);

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

  const getComposerState = () => {
    if (!selectedUser) {
      return {
        disabled: true,
        message: "Select a conversation to start messaging.",
      };
    }

    if (!messagingState?.rule?.allowed) {
      return {
        disabled: true,
        message:
          messagingState?.rule?.reason ||
          "Messaging with this user is not available.",
      };
    }

    if (messagingState?.rule?.requiresMessageRequest) {
      if (messagingState.activeSession) {
        return { disabled: false, message: "" };
      }

      if (messagingState.sessionExpired) {
        return {
          disabled: true,
          message:
            "Your messaging session has expired. Send a new message request to continue.",
        };
      }

      if (messagingState.pendingRequest) {
        return {
          disabled: true,
          message:
            messagingState.pendingRequestDirection === "incoming"
              ? "Respond to the message request from this user in Requests."
              : "Your message request is waiting for acceptance.",
        };
      }

      return {
        disabled: true,
        message: "Send a message request and wait for it to be accepted.",
      };
    }

    if (
      messagingState.rule?.requiresConnection &&
      !messagingState.connected
    ) {
      return {
        disabled: true,
        message: "You must be connected with this user before messaging.",
      };
    }

    if (!messagingState.canMessage) {
      return {
        disabled: true,
        message: "Messaging with this user is not currently available.",
      };
    }

    return { disabled: false, message: "" };
  };

  const composerState = getComposerState();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-white font-sans text-gray-900">
      <aside
        className={`flex w-full flex-col border-r border-gray-100 bg-white md:w-[350px] lg:w-[390px] ${
          showConversation ? "hidden md:flex" : "flex"
        }`}
      >
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
            type="button"
            title="New Message"
            onClick={() => setNotice("Select a person from your conversations or search to start a message.")}
            className="rounded-full p-2 text-purple-600 transition hover:bg-purple-50 active:scale-95"
          >
            <Edit3 size={20} />
          </button>
        </div>

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

      <main
        className={`flex min-w-0 flex-1 flex-col bg-white ${
          showConversation ? "flex" : "hidden md:flex"
        }`}
      >
        {!activeConversation && !selectedUser ? (
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
            <header className="flex h-16 items-center gap-3 border-b border-gray-100 px-5">
              <button
                type="button"
                onClick={handleBack}
                className="rounded-full p-2 text-purple-600 transition hover:bg-purple-50 md:hidden"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 ring-2 ring-purple-500/20">
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
                <h2 className="truncate text-sm font-semibold text-gray-900">
                  {selectedUser?.full_name ||
                    selectedUser?.username ||
                    activeConversation?.name ||
                    "Conversation"}
                </h2>
                {selectedUser?.role && (
                  <p className="text-xs font-medium capitalize text-purple-600">
                    {selectedUser.role.replace("_", " ")}
                  </p>
                )}
              </div>

              <div
                className={`hidden items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium sm:flex ${
                  realtimeStatus === "SUBSCRIBED"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : realtimeStatus === "CONNECTING"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
                title={
                  realtimeStatus === "SUBSCRIBED"
                    ? "Real-time messaging is connected"
                    : "Real-time messaging is reconnecting"
                }
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    realtimeStatus === "SUBSCRIBED"
                      ? "bg-emerald-500"
                      : realtimeStatus === "CONNECTING"
                      ? "animate-pulse bg-amber-500"
                      : "bg-red-500"
                  }`}
                />
                {realtimeStatus === "SUBSCRIBED"
                  ? "Live"
                  : realtimeStatus === "CONNECTING"
                  ? "Connecting"
                  : "Reconnecting"}
              </div>

              {messagingState?.activeSession && (
                <div className="hidden items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 sm:flex">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-purple-600" />
                  Active Session
                </div>
              )}
            </header>

            {(notice || connectionNotice || error) && (
              <div className="border-b border-gray-100 px-5 py-3">
                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
                    <span>{error}</span>
                  </div>
                )}

                {!error && notice && (
                  <div className="flex items-center gap-2 rounded-xl border border-purple-100 bg-purple-50 p-3 text-sm font-medium text-purple-800">
                    <Sparkles size={16} className="text-purple-600" />
                    <span>{notice}</span>
                  </div>
                )}

                {!error && !notice && connectionNotice && (
                  <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-3 text-sm text-purple-900">
                    {connectionNotice}
                  </div>
                )}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-2">
              <MessageList
                messages={messages}
                currentUserId={currentUser?.id}
                loading={loadingMessages}
                error=""
              />
              <div ref={messagesEndRef} />
            </div>

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
          setRequestMessage(message || "");

          try {
            setSendingRequest(true);
            setError("");

            await createMessageRequest({
              currentUser,
              targetUserId: requestUser.id,
              initialMessage: message?.trim() || "",
            });

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
