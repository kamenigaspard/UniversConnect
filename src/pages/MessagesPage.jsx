import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { AlertCircle, ArrowLeft, Edit3, MessageCircle, Sparkles, User } from "lucide-react";
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
import { canRequestConnection, canRequestMessage } from "../services/messaging/messagingPermissions";

export default function MessagesPage() {
  const navigate = useNavigate();
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

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const findConversationWithUser = useCallback((list, targetUserId) => {
    if (!targetUserId) return null;
    return (list || []).find((c) => c?.otherUser?.id === targetUserId) || null;
  }, []);

  const loadConversations = useCallback(async () => {
    if (!currentUserId) return [];
    try {
      setLoadingConversations(true);
      const data = await getUserConversations(currentUserId);
      if (mountedRef.current) setConversations(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      if (mountedRef.current) setError(err?.message || "Unable to load conversations.");
      return [];
    } finally {
      if (mountedRef.current) setLoadingConversations(false);
    }
  }, [currentUserId]);

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId || !currentUserId) return [];
    try {
      setLoadingMessages(true);
      setError("");
      const data = await getConversationMessages(conversationId);
      if (mountedRef.current) setMessages(Array.isArray(data) ? data : []);
      try { await markConversationAsRead(conversationId, currentUserId); } catch {}
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c));
      return data;
    } catch (err) {
      if (mountedRef.current) setError(err?.message || "Unable to load messages.");
      return [];
    } finally {
      if (mountedRef.current) setLoadingMessages(false);
    }
  }, [currentUserId]);

  // ✅ FIX 2: loadMessagingState now depends only on stable values
  const loadMessagingState = useCallback(async (targetUser) => {
    if (!currentUserId || !targetUser?.id) return null;
    try {
      setLoadingUser(true);
      // service accepts (currentUser, targetUser) — this is correct
      const state = await getMessagingState(currentUser, targetUser);
      if (mountedRef.current) setMessagingState(state);
      return state;
    } catch (err) {
      return null;
    } finally {
      if (mountedRef.current) setLoadingUser(false);
    }
  }, [currentUserId, currentUser]); // currentUser is now stable via useMemo

  // initial load
  useEffect(() => {
    if (currentUserId) loadConversations();
  }, [currentUserId, loadConversations]);

  // realtime conversation list
  useEffect(() => {
    if (!currentUserId) return;
    let sub = null;
    const timer = setTimeout(() => {
      sub = subscribeToUserConversations(currentUserId, () => {
        loadConversations();
      });
    }, 500);
    return () => {
      clearTimeout(timer);
      if (sub?.unsubscribe) sub.unsubscribe();
    };
  }, [currentUserId, loadConversations]);

  // realtime messages
  useEffect(() => {
    if (!activeConversation?.id) return;
    const sub = subscribeToConversationMessages(activeConversation.id, (newMessage) => {
      if (newMessage.sender_id === currentUserId) return;
      setMessages(prev => prev.some(m => m.id === newMessage.id) ? prev : [...prev, newMessage]);
      loadConversations();
    });
    return () => { if (sub?.unsubscribe) sub.unsubscribe(); };
  }, [activeConversation?.id, currentUserId, loadConversations]);

  // ✅ FIX 3: location.state effect — stable deps, no cascade
  useEffect(() => {
    const activeId = location.state?.activeConversationId;
    if (!activeId || conversations.length === 0) return;
    const conv = conversations.find(c => c.id === activeId);
    if (conv) {
      setActiveConversation(conv);
      setSelectedUser(conv.otherUser || null);
      setShowConversation(true);
      loadMessages(conv.id);
      if (conv.otherUser) loadMessagingState(conv.otherUser);
    }
  }, [location.state, conversations, loadMessages, loadMessagingState]);

  // ?user= legacy link
  const urlUserId = searchParams.get("user");
  useEffect(() => {
    if (!urlUserId || !currentUserId || conversations.length === 0) return;
    let cancelled = false;
    const open = async () => {
      try {
        const existing = conversations.find(c => c.otherUser?.id === urlUserId);
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
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setSearchParams({}, { replace: true });
      }
    };
    open();
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, [urlUserId]);

  const handleSelectConversation = async (conversation) => {
    if (!conversation?.id) return;
    setError(""); setNotice(""); setConnectionNotice(""); setMessageText("");
    setActiveConversation(conversation);
    setSelectedUser(conversation.otherUser || null);
    setShowConversation(true);
    await loadMessages(conversation.id);
    if (conversation.otherUser) await loadMessagingState(conversation.otherUser);
  };

  const handleSelectUser = async (targetUser) => {
    if (!targetUser?.id || targetUser.id === currentUserId) return;
    setError(""); setNotice(""); setConnectionNotice("");
    setSelectedUser(targetUser);
    setShowConversation(true);

    const state = await loadMessagingState(targetUser);
    if (!state) return;

    const existing = conversations.find(c => c.otherUser?.id === targetUser.id);
    if (existing) {
      setActiveConversation(existing);
      await loadMessages(existing.id);
      return;
    }

    if (state.status === "connected" || state.status === "session_active" || state.status === "direct") {
      try {
        setLoadingMessages(true);
        const conv = await createPrivateConversation(currentUserId, targetUser.id);
        const fresh = await loadConversations();
        const found = fresh.find(c => c.id === conv?.id) || fresh.find(c => c.otherUser?.id === targetUser.id);
        if (found) {
          setActiveConversation(found);
          await loadMessages(found.id);
        }
      } catch (e) { setError(e.message); }
      finally { setLoadingMessages(false); }
      return;
    }

    if (["request_required", "session_expired", "connection_required"].includes(state.status)) {
      setRequestUser(targetUser);
      return;
    }

    setConnectionNotice(state.reason || "Messaging not available");
  };

  const handleSendMessage = async () => {
    const content = messageText.trim();
    if (!content || !activeConversation?.id || sendingMessage) return;
    try {
      setSendingMessage(true);
      const newMsg = await sendMessage({
        conversationId: activeConversation.id,
        senderId: currentUserId,
        content,
      });
      if (mountedRef.current) {
        setMessages(prev => [...prev, newMsg]);
        setMessageText("");
        setConversations(prev =>
          prev.map(c => c.id === activeConversation.id
            ? { ...c, lastMessage: newMsg, updated_at: newMsg.created_at }
            : c
          ).sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
        );
      }
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) { setError(e.message); }
    finally { if (mountedRef.current) setSendingMessage(false); }
  };

  const handleAttach = async (file) => {
    if (!file || !activeConversation?.id) return;
    try {
      setUploading(true);
      setError("");
      const media = await uploadMessageMedia(file, activeConversation.id, currentUserId);
      const newMsg = await sendMessage({
        conversationId: activeConversation.id,
        senderId: currentUserId,
        content: "",
        media_url: media.media_url,
        media_type: media.media_type,
      });
      if (mountedRef.current) {
        setMessages(prev => [...prev, newMsg]);
        setConversations(prev => prev.map(c => c.id === activeConversation.id ? { ...c, lastMessage: newMsg } : c));
      }
    } catch (e) { setError(e.message); }
    finally { setUploading(false); }
  };

  const handleBack = () => {
    setShowConversation(false);
    setActiveConversation(null);
    setSelectedUser(null);
    setMessages([]);
    setMessagingState(null);
    setMessageText("");
    setError(""); setNotice(""); setConnectionNotice("");
  };

  const composerState = useMemo(() => {
    if (!selectedUser) return { disabled: true, message: "Select a conversation" };
    if (!messagingState) return { disabled: true, message: "Loading..." };
    if (messagingState.status === "request_pending") return { disabled: true, message: "Request pending..." };
    if (messagingState.status === "session_expired") return { disabled: true, message: "Session expired. Send new request." };
    if (["connected", "session_active", "direct"].includes(messagingState.status)) return { disabled: false, message: "" };
    if (messagingState.status === "unavailable") return { disabled: true, message: "Unavailable" };
    return { disabled: true, message: "Send a request to start messaging" };
  }, [selectedUser, messagingState]);

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-white">
      <aside className={`flex w-full flex-col border-r border-gray-100 bg-white md:w-[350px] lg:w-[390px] ${showConversation ? "hidden md:flex" : "flex"}`}>
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="rounded-full p-2 text-purple-600 hover:bg-purple-50">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold">@{currentUser?.username || "Direct"}</h1>
          </div>
          <button onClick={() => navigate("/search")} className="rounded-full p-2 text-purple-600 hover:bg-purple-50">
            <Edit3 size={20} />
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

      <main className={`flex min-w-0 flex-1 flex-col bg-white ${showConversation ? "flex" : "hidden md:flex"}`}>
        {!activeConversation && !selectedUser ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full border-2 border-purple-500 bg-purple-50">
              <MessageCircle size={48} className="text-purple-600" />
            </div>
            <h2 className="text-xl font-bold">Your Messages</h2>
            <p className="mt-2 max-w-xs text-sm text-gray-500">Select a conversation or search for someone.</p>
            <button onClick={() => navigate("/search")} className="mt-4 rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white">
              Search people
            </button>
          </div>
        ) : (
          <>
            <header className="flex h-16 items-center gap-3 border-b border-gray-100 px-5">
              <button onClick={handleBack} className="rounded-full p-2 text-purple-600 hover:bg-purple-50 md:hidden">
                <ArrowLeft size={20} />
              </button>
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-100">
                {selectedUser?.avatar_url
                  ? <img src={selectedUser.avatar_url} alt="" className="h-full w-full object-cover" />
                  : <User size={18} className="text-purple-600" />}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold">{selectedUser?.full_name || selectedUser?.username}</h2>
                {selectedUser?.role && <p className="text-xs capitalize text-purple-600">{selectedUser.role.replace("_", " ")}</p>}
              </div>
            </header>

            {(error || notice || connectionNotice) && (
              <div className="border-b border-gray-100 px-5 py-3">
                {error && <div className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={18} />{error}</div>}
                {notice && <div className="flex gap-2 rounded-xl bg-purple-50 p-3 text-sm text-purple-800"><Sparkles size={16} />{notice}</div>}
                {connectionNotice && <div className="rounded-xl bg-purple-50 p-3 text-sm text-purple-900">{connectionNotice}</div>}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-2">
              <MessageList messages={messages} currentUserId={currentUserId} loading={loadingMessages} />
              <div ref={messagesEndRef} />
            </div>

            <MessageComposer
              value={messageText}
              onChange={setMessageText}
              onSend={handleSendMessage}
              onAttach={handleAttach}
              disabled={composerState.disabled || sendingMessage || uploading}
              disabledMessage={composerState.message}
              sending={sendingMessage || uploading}
              placeholder={uploading ? "Uploading..." : "Write a message..."}
            />
          </>
        )}
      </main>

      <MessageRequestModal
        open={Boolean(requestUser)}
        user={requestUser}
        initialMessage={requestMessage}
        submitting={sendingRequest}
        onClose={() => { if (sendingRequest) return; setRequestUser(null); }}
        onSubmit={async (msg) => {
          if (!requestUser?.id) return;
          const targetForReload = requestUser;
          try {
            setSendingRequest(true);
            if (messagingState?.status === "connection_required") {
              await createConnectionRequest({ requesterId: currentUserId, targetId: requestUser.id, message: msg });
            } else {
              await createMessageRequest({ requesterId: currentUserId, targetId: requestUser.id, message: msg });
            }
            setRequestUser(null);
            setNotice("Request sent successfully");
            await loadMessagingState(targetForReload);
          } catch (e) { setError(e.message); }
          finally { setSendingRequest(false); }
        }}
      />
    </div>
  );
}
