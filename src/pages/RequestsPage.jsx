import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertCircle,
  Check,
  Clock,
  Loader2,
  MessageCircle,
  RefreshCw,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  acceptConnectionRequest,
  acceptMessageRequest,
  rejectConnectionRequest,
  rejectMessageRequest,
  cancelRequest,
  createConnectionRequest,
  createMessageRequest,
  getRequestSuggestions,
} from "../services/messaging/messagingService";
import { getMessagingRule } from "../services/messaging/messagingPermissions";

export default function RequestPage() {
  const { user, profile } = useAuth();

  const currentUser = useMemo(() => {
    if (!user?.id) return null;
    return {...user,...(profile || {}), id: user.id };
  }, [user, profile]);

  
  const [requests, setRequests] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [processingSuggestionId, setProcessingSuggestionId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRequests = useCallback(
    async ({ refresh = false } = {}) => {
      if (!currentUser?.id) return;
      try {
        if (refresh) setRefreshing(true);
        else setLoading(true);
        setError("");

        const { data: requestData, error: requestError } = await supabase
         .from("requests")
         .select(`id,sender_id,receiver_id,type,status,initial_message,created_at,updated_at`)
         .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
         .order("created_at", { ascending: false });

        if (requestError) throw requestError;
        if (!requestData?.length) { setRequests([]); return; }

        const userIds = [...new Set(requestData.flatMap((r) => [r.sender_id, r.receiver_id]))];
        const { data: profiles, error: profilesError } = await supabase
         .from("profiles")
         .select(`id,full_name,username,avatar_url,role,school_id,is_active`)
         .in("id", userIds);

        if (profilesError) throw profilesError;
        const profileMap = new Map((profiles || []).map((item) => [item.id, item]));

        const enriched = requestData.map((request) => ({
         ...request,
          sender: profileMap.get(request.sender_id) || null,
          receiver: profileMap.get(request.receiver_id) || null,
          isIncoming: request.receiver_id === currentUser.id,
          isOutgoing: request.sender_id === currentUser.id,
        }));
        setRequests(enriched);
      } catch (err) {
        console.error("Failed to load requests:", err);
        setError(err?.message || "Unable to load your requests.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentUser?.id]
  );

  const loadSuggestions = useCallback(async () => {
    if (!currentUser?.id) {
      setSuggestedUsers([]);
      setLoadingSuggestions(false);
      return;
    }
    try {
      setLoadingSuggestions(true);
      // USE SERVICE - no duplication, uses same rules as messagingService.js
      const users = await getRequestSuggestions(currentUser);
      setSuggestedUsers(users || []);
    } catch (err) {
      console.error("Failed to load suggestions:", err);
      setSuggestedUsers([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.id) return;
    loadRequests();
    loadSuggestions();
  }, [currentUser?.id, loadRequests, loadSuggestions]);

  // REALTIME FOR REQUESTS
  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = supabase
     .channel(`requests-${currentUser.id}`)
     .on("postgres_changes", { event: "*", schema: "public", table: "requests", filter: `receiver_id=eq.${currentUser.id}` }, () => loadRequests({ refresh: true }))
     .on("postgres_changes", { event: "*", schema: "public", table: "requests", filter: `sender_id=eq.${currentUser.id}` }, () => loadRequests({ refresh: true }))
     .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, loadRequests]);

  const incomingRequests = useMemo(() => requests.filter((r) => r.isIncoming && r.status === "pending"), [requests]);
  const outgoingRequests = useMemo(() => requests.filter((r) => r.isOutgoing && r.status === "pending"), [requests]);
  const sameSchoolSuggestions = useMemo(() => suggestedUsers.filter((u) => u.school_id === currentUser?.school_id), [suggestedUsers, currentUser?.school_id]);
  const otherSchoolSuggestions = useMemo(() => suggestedUsers.filter((u) => u.school_id!== currentUser?.school_id), [suggestedUsers, currentUser?.school_id]);

  const handleAccept = async (request) => {
    if (!request?.id) return;
    try {
      setProcessingRequestId(request.id); setError(""); setNotice("");
      if (request.type === "connection") { await acceptConnectionRequest(request.id); setNotice("Connection request accepted."); }
      if (request.type === "message") { await acceptMessageRequest(request.id); setNotice("Message request accepted. You can now message this user."); }
      await loadRequests({ refresh: true }); await loadSuggestions();
    } catch (err) { setError(err?.message || "Unable to accept this request."); } finally { setProcessingRequestId(null); }
  };

  const handleReject = async (request) => {
    if (!request?.id) return;
    try {
      setProcessingRequestId(request.id); setError(""); setNotice("");
      if (request.type === "connection") { await rejectConnectionRequest(request.id); setNotice("Connection request rejected."); }
      if (request.type === "message") { await rejectMessageRequest(request.id); setNotice("Message request rejected."); }
      await loadRequests({ refresh: true }); await loadSuggestions();
    } catch (err) { setError(err?.message || "Unable to reject this request."); } finally { setProcessingRequestId(null); }
  };

  const handleCancel = async (request) => {
    if (!request?.id) return;
    if (!window.confirm("Cancel this request?")) return;
    try {
      setProcessingRequestId(request.id); setError(""); setNotice("");
      await cancelRequest(request.id);
      setNotice("Request cancelled successfully.");
      await loadRequests({ refresh: true }); await loadSuggestions();
    } catch (err) { setError(err?.message || "Unable to cancel this request."); } finally { setProcessingRequestId(null); }
  };
  const handleSendSuggestionRequest = async (targetUser) => {
    if (!targetUser?.id) return;
    try {
      setProcessingSuggestionId(targetUser.id);
      setError("");
      setNotice("");
      
      const rule = getMessagingRule(currentUser, targetUser);
      
      if (rule.requiresConnection) {
        await createConnectionRequest({ 
          requesterId: currentUser.id, 
          targetId: targetUser.id, 
          message: "" 
        });
        setNotice(`Connection request sent to ${targetUser.full_name || targetUser.username}.`);
      } else if (rule.requiresMessageRequest) {
        await createMessageRequest({ 
          requesterId: currentUser.id, 
          targetId: targetUser.id, 
          message: "" 
        });
        setNotice(`Message request sent to ${targetUser.full_name || targetUser.username}.`);
      } else if (rule.canMessage) {
        setNotice(`You can message ${targetUser.full_name || targetUser.username} directly from Messages.`);
      } else {
        throw new Error("A request cannot be sent to this user.");
      }
      
      await loadRequests({ refresh: true });
      await loadSuggestions();
    } catch (err) {
      setError(err?.message || "Unable to send request.");
    } finally {
      setProcessingSuggestionId(null);
    }
  };

  const formatDate = (date) => date? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(date)) : "";
  const getOtherUser = (request) => request.isIncoming? request.sender : request.receiver;

  const UserInfo = ({ request }) => {
    const otherUser = getOtherUser(request);
    if (!otherUser) return <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-50"><User size={20} className="text-purple-600" /></div>;
    return (
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-50">
          {otherUser.avatar_url? <img src={otherUser.avatar_url} alt="" className="h-full w-full object-cover" /> : <User size={20} className="text-purple-600" />}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">{otherUser.full_name || otherUser.username || "Unknown user"}</p>
          {otherUser.username && <p className="truncate text-sm text-gray-500">@{otherUser.username}</p>}
          <p className="text-xs capitalize text-gray-400">{otherUser.role?.replace("_", " ")}</p>
        </div>
      </div>
    );
  };

  const RequestIcon = ({ type }) => (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-50">
      {type === "connection"? <UserPlus size={19} className="text-purple-600" /> : <MessageCircle size={19} className="text-purple-600" />}
    </div>
  );

  const RequestCard = ({ request, incoming = false }) => {
    const processing = processingRequestId === request.id;
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <RequestIcon type={request.type} />
          <div className="min-w-0 flex-1">
            <UserInfo request={request} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium capitalize text-purple-700">{request.type === "connection"? "Connection request" : "Message request"}</span>
              <span className="text-xs text-gray-400">{formatDate(request.created_at)}</span>
            </div>
            {request.type === "message" && request.initial_message && (
              <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">“{request.initial_message}”</div>
            )}
            {incoming? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={processing} onClick={() => handleAccept(request)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700 disabled:opacity-50">
                  {processing? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Accept
                </button>
                <button type="button" disabled={processing} onClick={() => handleReject(request)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  <X size={16} /> Reject
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <button type="button" disabled={processing} onClick={() => handleCancel(request)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  {processing? <Loader2 size={16} className="animate-spin" /> : <X size={16} />} Cancel request
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const SuggestionCard = ({ targetUser }) => {
    const processing = processingSuggestionId === targetUser.id;
    const rule = getMessagingRule(currentUser, targetUser);
    const isMessageRequest = rule?.requiresMessageRequest;
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-50">
              {targetUser.avatar_url? <img src={targetUser.avatar_url} alt="" className="h-full w-full object-cover" /> : <User size={25} className="text-purple-600" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-gray-900">{targetUser.full_name || targetUser.username}</p>
              {targetUser.username && <p className="truncate text-sm text-gray-500">@{targetUser.username}</p>}
              <p className="mt-0.5 text-xs capitalize text-gray-400">{targetUser.role?.replace("_", " ")}</p>
              {targetUser.schools?.name && <p className="mt-1 truncate text-xs text-gray-500">{targetUser.schools.name}</p>}
            </div>
          </div>
        </div>
        <div className="border-t border-gray-100 p-3">
          <button type="button" disabled={processing} onClick={() => handleSendSuggestionRequest(targetUser)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
            {processing? <Loader2 size={17} className="animate-spin" /> : isMessageRequest? <MessageCircle size={17} /> : <UserPlus size={17} />}
            {isMessageRequest? "Send message request" : "Send connection request"}
          </button>
        </div>
      </div>
    );
  };

  const EmptyState = ({ icon: Icon, title, description }) => (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-50"><Icon size={22} className="text-purple-600" /></div>
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">{description}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 size={28} className="animate-spin text-purple-600" />
          <p className="text-sm">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Requests</h1>
            <p className="mt-1 text-sm text-gray-500">Manage your connection and message requests.</p>
          </div>
          <button type="button" disabled={refreshing || loadingSuggestions} onClick={async () => { await loadRequests({ refresh: true }); await loadSuggestions(); }} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-purple-600 hover:bg-purple-50 disabled:opacity-50" title="Refresh">
            <RefreshCw size={18} className={refreshing || loadingSuggestions? "animate-spin" : ""} />
          </button>
        </div>

        {error && <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={19} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
        {notice &&!error && <div className="mb-5 flex items-center gap-3 rounded-xl border border-purple-100 bg-purple-50 p-4 text-sm text-purple-700"><Check size={18} className="shrink-0" /><span>{notice}</span></div>}

        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div><h2 className="text-lg font-semibold text-gray-900">Incoming requests</h2><p className="text-sm text-gray-500">People who want to connect or message you.</p></div>
            {incomingRequests.length > 0 && <span className="rounded-full bg-purple-600 px-2.5 py-1 text-xs font-semibold text-white">{incomingRequests.length}</span>}
          </div>
          {incomingRequests.length === 0? <EmptyState icon={Clock} title="No pending requests" description="You don't have any new connection or message requests." /> : <div className="space-y-3">{incomingRequests.map((r) => <RequestCard key={r.id} request={r} incoming={true} />)}</div>}
        </section>

        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <div><h2 className="text-lg font-semibold text-gray-900">Sent requests</h2><p className="text-sm text-gray-500">Requests waiting for a response.</p></div>
            {outgoingRequests.length > 0 && <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">{outgoingRequests.length}</span>}
          </div>
          {outgoingRequests.length === 0? <EmptyState icon={UserPlus} title="No sent requests" description="You don't have any pending requests that you've sent." /> : <div className="space-y-3">{outgoingRequests.map((r) => <RequestCard key={r.id} request={r} incoming={false} />)}</div>}
        </section>

        <section className="border-t border-gray-200 pt-8">
          <div className="mb-6"><h2 className="text-xl font-bold text-gray-900">People You May Know</h2><p className="mt-1 text-sm text-gray-500">Discover people from your university community.</p></div>
          {loadingSuggestions? (
            <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white py-12"><div className="flex items-center gap-3 text-sm text-gray-500"><Loader2 size={20} className="animate-spin text-purple-600" /> Finding people you may know...</div></div>
          ) : suggestedUsers.length === 0? <EmptyState icon={UserPlus} title="No suggestions right now" description="We'll show people you can connect or message as they become available." /> : (
            <div className="space-y-8">
              {sameSchoolSuggestions.length > 0 && <div><div className="mb-4"><h3 className="text-sm font-semibold uppercase tracking-wide text-purple-600">From your school</h3></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{sameSchoolSuggestions.map((u) => <SuggestionCard key={u.id} targetUser={u} />)}</div></div>}
              {otherSchoolSuggestions.length > 0 && <div><div className="mb-4"><h3 className="text-sm font-semibold uppercase tracking-wide text-purple-600">From other schools</h3></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{otherSchoolSuggestions.map((u) => <SuggestionCard key={u.id} targetUser={u} />)}</div></div>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}