



import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftCircle, Search, Loader2, User, MessageSquare, UserPlus, Clock, XCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { searchMessagingUsers, getMessagingState, createPrivateConversation, createConnectionRequest, createMessageRequest } from "../services/messaging/messagingService";
import { getMessagingRule } from "../services/messaging/messagingPermissions";
import MessageRequestModal from "../components/messages/MessageRequestModal";

function SearchPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const messagingUser = useMemo(() => {
    if (!user?.id) return null;
    return { ...(profile || {}), ...user, id: user.id };
  }, [user, profile]);

  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [userStates, setUserStates] = useState({});
  const [startingId, setStartingId] = useState(null);
  const [modal, setModal] = useState({ open: false, user: null, type: null });
  const [submitting, setSubmitting] = useState(false);
  const [schools, setSchools] = useState({});

  // DEBOUNCED SEARCH
  useEffect(() => {
    if (!messagingUser?.id) { setSearchResults([]); return; }
    const trimmed = searchText.trim();
    if (!trimmed) { setSearchResults([]); setSearchingUsers(false); setSearchError(""); setUserStates({}); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setSearchingUsers(true);
        setSearchError("");
        const results = await searchMessagingUsers({ currentUserId: messagingUser.id, search: trimmed, limit: 30 });
        if (!cancelled) setSearchResults(results || []);
      } catch (e) {
        if (!cancelled) { setSearchResults([]); setSearchError(e?.message || "Unable to search"); }
      } finally {
        if (!cancelled) setSearchingUsers(false);
      }
    }, 600);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchText, messagingUser?.id]);

  // FETCH STATES
  useEffect(() => {
    if (!searchResults.length || !messagingUser?.id) { setUserStates({}); return; }
    let cancelled = false;
    const loadStates = async () => {
      const states = {};
      for (let i = 0; i < searchResults.length; i += 5) {
        if (cancelled) break;
        const chunk = searchResults.slice(i, i + 5);
        const chunkStates = await Promise.all(
          chunk.map(async (u) => {
            try {
              const state = await getMessagingState(messagingUser, u);
              return [u.id, state];
            } catch (err) {
              return [u.id, { status: "unavailable", canMessage: false }];
            }
          })
        );
        if (cancelled) break;
        chunkStates.forEach(([id, st]) => { states[id] = st; });
        setUserStates(prev => ({ ...prev, ...states }));
        await new Promise(r => setTimeout(r, 200));
      }
    };
    loadStates();
    return () => { cancelled = true; };
  }, [searchResults, messagingUser]);

  // Load school names for display
  useEffect(() => {
    if (!searchResults.length) return;
    const schoolIds = [...new Set(searchResults.map(u => u.school_id).filter(Boolean))];
    if (!schoolIds.length) return;
    // School names would come from a schools table join in a real implementation
    // For now, we track school_ids for display
  }, [searchResults]);

  const getUserAction = (targetUser) => {
    const state = userStates[targetUser.id];
    const rule = getMessagingRule(messagingUser, targetUser);
    if (!rule?.allowed) return { type: "none", label: "Unavailable", icon: XCircle, disabled: true };
    if (!state) return { type: "loading", label: "...", icon: Loader2, disabled: true };
    if (state.status === "request_pending") {
      return { type: "pending", label: state.pendingRequestDirection === "outgoing" ? "Pending" : "Respond", icon: Clock, disabled: false };
    }
    if (["connected", "session_active", "direct"].includes(state.status)) {
      return { type: "message", label: "Message", icon: MessageSquare, disabled: false };
    }
    if (state.status === "session_expired") return { type: "message_request", label: "Request again", icon: MessageSquare, disabled: false };
    if (state.status === "connection_required") return { type: "connection", label: "Connect", icon: UserPlus, disabled: false };
    if (state.status === "request_required") return { type: "message_request", label: "Request", icon: MessageSquare, disabled: false };
    return { type: "none", label: "Unavailable", icon: User, disabled: true };
  };

  const handleSelectUser = async (targetUser) => {
    if (!targetUser?.id || !messagingUser) return;
    const action = getUserAction(targetUser);

    if (action.type === "pending") { navigate("/requests"); return; }
    if (action.type === "connection") { setModal({ open: true, user: targetUser, type: "connection" }); return; }
    if (action.type === "message_request") { setModal({ open: true, user: targetUser, type: "message_request" }); return; }
    // direct message
    try {
      setStartingId(targetUser.id);
      const conv = await createPrivateConversation(messagingUser.id, targetUser.id);
      navigate("/messages", { state: { activeConversationId: conv.id } });
    } catch (e) { setSearchError(e.message); }
    finally { setStartingId(null); }
  };

  const handleModalSubmit = async (text) => {
    if (!modal.user) return;
    try {
      setSubmitting(true);
      if (modal.type === "connection") {
        await createConnectionRequest({ requesterId: messagingUser.id, targetId: modal.user.id, message: text });
      } else {
        await createMessageRequest({ requesterId: messagingUser.id, targetId: modal.user.id, message: text });
      }
      setUserStates(prev => ({ ...prev, [modal.user.id]: { status: "request_pending", pendingRequestDirection: "outgoing" } }));
      setModal({ open: false, user: null, type: null });
    } catch (e) { setSearchError(e.message); }
    finally { setSubmitting(false); }
  };

  const getRoleBadge = (role) => {
    if (!role) return null;
    const colors = {
      student: "bg-blue-50 text-blue-700",
      teacher: "bg-green-50 text-green-700",
      admin: "bg-amber-50 text-amber-700",
    };
    return (
      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${colors[role] || "bg-gray-50 text-gray-600"}`}>
        {role.replace("_", " ")}
      </span>
    );
  };

  if (!messagingUser?.id) {
    return (
      <div className="min-h-screen bg-white px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <User size={40} className="mx-auto mb-3 text-violet-600" />
            <h2 className="text-lg font-semibold">Sign in required</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => window.history.length > 2 ? navigate(-1) : navigate("/")} className="rounded-full p-2 text-violet-600 hover:bg-violet-50">
            <ArrowLeftCircle size={28} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Search People</h1>
            <p className="text-sm text-slate-500">Find students, teachers and administrators</p>
          </div>
        </div>

        <div className="relative mt-6">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-600" />
          <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search by name or username..." className="w-full rounded-2xl border border-violet-100 bg-violet-50/40 py-3 pl-11 pr-12 outline-none focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100" autoFocus />
          {searchText && !searchingUsers && <button onClick={() => { setSearchText(""); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs font-medium text-violet-600 hover:bg-violet-100">Clear</button>}
        </div>

        {searchingUsers && <div className="mt-3 flex items-center gap-2 text-sm text-violet-600"><Loader2 size={16} className="animate-spin" /> Searching...</div>}
        {searchError && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{searchError}</div>}

        <div className="mt-6">
          {!searchText.trim() && <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-8 text-center"><Search size={38} className="mx-auto mb-3 text-violet-500" /><h2 className="font-semibold">Search for people</h2></div>}
          {searchText.trim() && !searchingUsers && !searchError && searchResults.length === 0 && <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center"><User size={38} className="mx-auto mb-3 text-violet-500" /><h2 className="font-semibold">No people found</h2></div>}

          <div className="grid gap-3 sm:grid-cols-2">
            {searchResults.map((u) => {
              const action = getUserAction(u);
              const Icon = action.icon;
              return (
                <div key={u.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:border-violet-200">
                  <div className="flex min-w-0 flex-1 items-center gap-3.5">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-violet-100 ring-2 ring-violet-500/20 flex items-center justify-center">
                      {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" /> : <User size={22} className="text-violet-600" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{u.full_name || u.username}</p>
                      <p className="truncate text-xs text-slate-500">@{u.username}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        {getRoleBadge(u.role)}
                        {u.school_id && <span className="text-[10px] text-slate-400">School #{u.school_id.slice(0, 8)}</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleSelectUser(u)} disabled={action.disabled || startingId === u.id} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold ${action.type === "pending" ? "bg-amber-100 text-amber-700" : "bg-violet-600 text-white hover:bg-violet-700"}`}>
                    <Icon size={14} className={action.type === "loading" ? "animate-spin" : ""} />
                    {startingId === u.id ? "Opening..." : action.label}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FIXED: Now passes type prop to MessageRequestModal */}
      <MessageRequestModal
        open={modal.open}
        user={modal.user}
        type={modal.type}
        submitting={submitting}
        onClose={() => setModal({ open: false, user: null, type: null })}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
}

export default SearchPage;
