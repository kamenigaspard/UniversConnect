// ============================================================
// RequestsPage.jsx
// ============================================================
// This page manages:
// 1. Received requests
// 2. Sent requests
// 3. Accepting message requests
// 4. Rejecting requests
// 5. Cancelling sent requests
// 6. Temporary messaging sessions
// 7. Opening an active messaging session
// 8. Sending a new request after a session expires
// ============================================================

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  Check,
  Clock,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Trash2,
  User,
  UserCheck,
  X,
  AlertCircle,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";


// ============================================================
// Helper: format a date
// ============================================================

function formatDate(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}


// ============================================================
// Helper: calculate remaining session time
// ============================================================

function formatRemainingTime(expiresAt, now) {
  if (!expiresAt) return "";

  const expiration = new Date(expiresAt).getTime();

  if (Number.isNaN(expiration)) {
    return "";
  }

  const difference = expiration - now;

  if (difference <= 0) {
    return "Expired";
  }

  const totalSeconds = Math.floor(difference / 1000);

  const hours = Math.floor(totalSeconds / 3600);

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}


// ============================================================
// Helper: determine whether a session is currently active
// ============================================================

function isSessionActive(session, now) {
  if (!session) return false;

  if (!session.is_active) {
    return false;
  }

  if (!session.expires_at) {
    return false;
  }

  return new Date(session.expires_at).getTime() > now;
}


// ============================================================
// Request card
// ============================================================

function RequestCard({
  request,
  currentUserId,
  sessions,
  now,
  onAccept,
  onReject,
  onCancel,
  onOpenConversation,
  onNewRequest,
  busyRequestId,
}) {
  const isReceived =
    request.receiver_id === currentUserId;

  const isSent =
    request.sender_id === currentUserId;

  const otherProfile = isReceived
    ? request.sender
    : request.receiver;

  const activeSession = sessions.find(
    (session) =>
      session.request_id === request.id &&
      isSessionActive(session, now)
  );

  const hasExpiredSession =
    request.status === "accepted" &&
    sessions.some(
      (session) =>
        session.request_id === request.id &&
        !isSessionActive(session, now)
    );

  const isBusy = busyRequestId === request.id;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      
      {/* ======================================================
          Profile section
          ====================================================== */}

      <div className="flex items-start gap-3">

        {/* Avatar */}
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100">
          {otherProfile?.avatar_url ? (
            <img
              src={otherProfile.avatar_url}
              alt={otherProfile.full_name || "User"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-400">
              <User size={22} />
            </div>
          )}
        </div>


        {/* Profile information */}
        <div className="min-w-0 flex-1">

          <div className="flex items-center gap-2">

            <h3 className="truncate font-semibold text-gray-900">
              {otherProfile?.full_name || "Unknown user"}
            </h3>

            {otherProfile?.role && (
              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-purple-600">
                {otherProfile.role}
              </span>
            )}

          </div>


          {otherProfile?.username && (
            <p className="text-xs text-gray-500">
              @{otherProfile.username}
            </p>
          )}


          <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">

            <span>
              {isReceived ? "Received" : "Sent"}
            </span>

            <span>•</span>

            <span>
              {request.type === "message"
                ? "Message request"
                : "Connection request"}
            </span>

          </div>

        </div>

      </div>


      {/* ======================================================
          Initial message
          ====================================================== */}

      {request.initial_message && (
        <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
          {request.initial_message}
        </div>
      )}


      {/* ======================================================
          Request date
          ====================================================== */}

      <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
        <Clock size={13} />
        {formatDate(request.created_at)}
      </div>


      {/* ======================================================
          PENDING RECEIVED MESSAGE REQUEST
          ====================================================== */}

      {isReceived &&
        request.status === "pending" &&
        request.type === "message" && (
          <div className="mt-4 flex gap-2">

            <button
              type="button"
              disabled={isBusy}
              onClick={() => onAccept(request)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <Check size={17} />
              )}

              Accept
            </button>


            <button
              type="button"
              disabled={isBusy}
              onClick={() => onReject(request)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
            >
              <X size={17} />
              Reject
            </button>

          </div>
        )}


      {/* ======================================================
          CONNECTION REQUEST
          ====================================================== */}
      {/* 
          We intentionally do NOT call
          accept_message_request() for connection requests.

          Connection handling can be implemented separately
          later if your application needs connection/follow
          relationships.
      */}

      {isReceived &&
        request.status === "pending" &&
        request.type === "connection" && (
          <div className="mt-4 rounded-xl bg-yellow-50 p-3 text-xs text-yellow-700">
            <div className="flex items-start gap-2">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />

              <p>
                Connection requests are not part of the
                temporary messaging-session system.
              </p>
            </div>
          </div>
        )}


      {/* ======================================================
          PENDING SENT REQUEST
          ====================================================== */}

      {isSent &&
        request.status === "pending" && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onCancel(request)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
          >
            {isBusy ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : (
              <Trash2 size={17} />
            )}

            Cancel request
          </button>
        )}


      {/* ======================================================
          ACTIVE TEMPORARY SESSION
          ====================================================== */}

      {request.type === "message" &&
        request.status === "accepted" &&
        activeSession && (
          <div className="mt-4 rounded-xl bg-green-50 p-4">

            <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
              <UserCheck size={17} />

              Messaging session active
            </div>


            <p className="mt-1 text-xs text-green-600">
              Time remaining:{" "}
              <strong>
                {formatRemainingTime(
                  activeSession.expires_at,
                  now
                )}
              </strong>
            </p>


            <button
              type="button"
              onClick={() =>
                onOpenConversation(otherProfile)
              }
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
            >
              <MessageCircle size={17} />

              Open Messages
            </button>

          </div>
        )}


      {/* ======================================================
          EXPIRED TEMPORARY SESSION
          ====================================================== */}

      {request.type === "message" &&
        request.status === "accepted" &&
        !activeSession &&
        hasExpiredSession && (
          <div className="mt-4 rounded-xl bg-orange-50 p-4">

            <div className="flex items-center gap-2 text-sm font-semibold text-orange-700">
              <Clock size={17} />

              Messaging session expired
            </div>


            <p className="mt-1 text-xs leading-5 text-orange-600">
              This temporary messaging session has expired.
              A new message request must be accepted before
              messaging can continue.
            </p>


            {/* Only the original requester can send the
                next request from this card. */}
            {isSent && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() =>
                  onNewRequest(otherProfile)
                }
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-60"
              >
                {isBusy ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Send size={17} />
                )}

                Send New Request
              </button>
            )}

          </div>
        )}


      {/* ======================================================
          ACCEPTED BUT SESSION MISSING
          ====================================================== */}

      {request.type === "message" &&
        request.status === "accepted" &&
        !activeSession &&
        !hasExpiredSession && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-600">
            The request was accepted, but no messaging
            session is currently available.
          </div>
        )}


      {/* ======================================================
          OTHER STATUS
          ====================================================== */}

      {request.status === "rejected" && (
        <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600">
          Request rejected.
        </div>
      )}


      {request.status === "cancelled" && (
        <div className="mt-4 rounded-xl bg-gray-50 p-3 text-xs font-medium text-gray-500">
          Request cancelled.
        </div>
      )}

    </div>
  );
}


// ============================================================
// Main Requests Page
// ============================================================

export default function RequestsPage() {

  const navigate = useNavigate();

  const { user, profile } = useAuth();


  // ==========================================================
  // State
  // ==========================================================

  const [requests, setRequests] = useState([]);

  const [sessions, setSessions] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [activeTab, setActiveTab] =
    useState("received");

  const [now, setNow] =
    useState(Date.now());

  const [busyRequestId, setBusyRequestId] =
    useState(null);


  // ==========================================================
  // Load requests
  // ==========================================================

  const loadRequests = useCallback(
    async (showLoader = true) => {

      if (!user?.id) {
        return;
      }


      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }


      setError("");


      try {

        // ------------------------------------------------------
        // Load requests involving current user
        // ------------------------------------------------------

        const {
          data: requestData,
          error: requestError,
        } = await supabase
          .from("requests")
          .select("*")
          .or(
            `sender_id.eq.${user.id},receiver_id.eq.${user.id}`
          )
          .order("created_at", {
            ascending: false,
          });


        if (requestError) {
          throw requestError;
        }


        // ------------------------------------------------------
        // Load messaging sessions involving current user
        // ------------------------------------------------------

        const {
          data: sessionData,
          error: sessionError,
        } = await supabase
          .from("messaging_sessions")
          .select("*")
          .or(
            `requester_id.eq.${user.id},receiver_id.eq.${user.id}`
          )
          .order("created_at", {
            ascending: false,
          });


        if (sessionError) {
          throw sessionError;
        }


        // ------------------------------------------------------
        // Collect all profile IDs
        // ------------------------------------------------------

        const profileIds = [
          ...(requestData || []).map(
            (request) => request.sender_id
          ),

          ...(requestData || []).map(
            (request) => request.receiver_id
          ),

          ...(sessionData || []).map(
            (session) => session.requester_id
          ),

          ...(sessionData || []).map(
            (session) => session.receiver_id
          ),
        ];


        const uniqueProfileIds = [
          ...new Set(
            profileIds.filter(Boolean)
          ),
        ];


        // ------------------------------------------------------
        // Load profiles
        // ------------------------------------------------------

        let profileMap = {};


        if (uniqueProfileIds.length > 0) {

          const {
            data: profileData,
            error: profileError,
          } = await supabase
            .from("profiles")
            .select(
              "id, full_name, username, avatar_url, role, school_id, is_active"
            )
            .in("id", uniqueProfileIds);


          if (profileError) {
            throw profileError;
          }


          profileMap = Object.fromEntries(
            (profileData || []).map(
              (item) => [item.id, item]
            )
          );
        }


        // ------------------------------------------------------
        // Enrich requests
        // ------------------------------------------------------

        const enrichedRequests =
          (requestData || []).map((request) => ({
            ...request,

            sender:
              profileMap[request.sender_id] || null,

            receiver:
              profileMap[request.receiver_id] || null,
          }));


        // ------------------------------------------------------
        // Enrich sessions
        // ------------------------------------------------------

        const enrichedSessions =
          (sessionData || []).map((session) => ({
            ...session,

            requester:
              profileMap[session.requester_id] || null,

            receiver:
              profileMap[session.receiver_id] || null,
          }));


        setRequests(enrichedRequests);

        setSessions(enrichedSessions);

      } catch (err) {

        console.error(
          "Error loading requests:",
          err
        );

        setError(
          err?.message ||
            "Unable to load requests."
        );

      } finally {

        setLoading(false);

        setRefreshing(false);
      }
    },
    [user?.id]
  );


  // ==========================================================
  // Initial load
  // ==========================================================

  useEffect(() => {

    loadRequests(true);

  }, [loadRequests]);


  // ==========================================================
  // Update current time every second
  // ==========================================================

  useEffect(() => {

    const timer = setInterval(() => {

      setNow(Date.now());

    }, 1000);


    return () => clearInterval(timer);

  }, []);


  // ==========================================================
  // Refresh database periodically
  // ==========================================================

  useEffect(() => {

    const timer = setInterval(() => {

      loadRequests(false);

    }, 60000);


    return () => clearInterval(timer);

  }, [loadRequests]);


  // ==========================================================
  // Received requests
  // ==========================================================

  const receivedRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.receiver_id === user?.id
      ),
    [requests, user?.id]
  );


  // ==========================================================
  // Sent requests
  // ==========================================================

  const sentRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.sender_id === user?.id
      ),
    [requests, user?.id]
  );


  // ==========================================================
  // Accept message request
  // ==========================================================

  const handleAccept = async (request) => {

    if (request.type !== "message") {

      setError(
        "Only message requests can create messaging sessions."
      );

      return;
    }


    setBusyRequestId(request.id);

    setError("");


    try {

      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "accept_message_request",
        {
          p_request_id: request.id,
        }
      );


      if (rpcError) {
        throw rpcError;
      }


      console.log(
        "Messaging session created:",
        data
      );


      await loadRequests(false);

    } catch (err) {

      console.error(
        "Accept request error:",
        err
      );

      setError(
        err?.message ||
          "Unable to accept this request."
      );

    } finally {

      setBusyRequestId(null);
    }
  };


  // ==========================================================
  // Reject request
  // ==========================================================

  const handleReject = async (request) => {

    if (request.receiver_id !== user?.id) {
      return;
    }


    setBusyRequestId(request.id);

    setError("");


    try {

      const {
        error: updateError,
      } = await supabase
        .from("requests")
        .update({
          status: "rejected",
        })
        .eq("id", request.id)
        .eq("receiver_id", user.id)
        .eq("status", "pending");


      if (updateError) {
        throw updateError;
      }


      await loadRequests(false);

    } catch (err) {

      console.error(
        "Reject request error:",
        err
      );

      setError(
        err?.message ||
          "Unable to reject this request."
      );

    } finally {

      setBusyRequestId(null);
    }
  };


  // ==========================================================
  // Cancel request
  // ==========================================================

  const handleCancel = async (request) => {

    if (request.sender_id !== user?.id) {
      return;
    }


    setBusyRequestId(request.id);

    setError("");


    try {

      // ------------------------------------------------------
      // We use "cancelled" instead of deleting the row.
      //
      // This preserves request history and is safer for
      // auditing later.
      // ------------------------------------------------------

      const {
        error: updateError,
      } = await supabase
        .from("requests")
        .update({
          status: "cancelled",
        })
        .eq("id", request.id)
        .eq("sender_id", user.id)
        .eq("status", "pending");


      if (updateError) {
        throw updateError;
      }


      await loadRequests(false);

    } catch (err) {

      console.error(
        "Cancel request error:",
        err
      );

      setError(
        err?.message ||
          "Unable to cancel this request."
      );

    } finally {

      setBusyRequestId(null);
    }
  };


  // ==========================================================
  // Open messages
  // ==========================================================

  const handleOpenConversation = (otherProfile) => {

    if (!otherProfile?.id) {
      return;
    }


    navigate(
      `/messages?user=${encodeURIComponent(
        otherProfile.id
      )}`
    );
  };


  // ==========================================================
  // Send a new request after session expiration
  // ==========================================================

  const handleNewRequest = async (otherProfile) => {

    if (!otherProfile?.id) {
      return;
    }


    if (!user?.id) {
      return;
    }


    // --------------------------------------------------------
    // Prevent self-request
    // --------------------------------------------------------

    if (otherProfile.id === user.id) {

      setError(
        "You cannot send a request to yourself."
      );

      return;
    }


    // --------------------------------------------------------
    // Prevent requests to super admin
    // --------------------------------------------------------

    if (otherProfile.role === "super_admin") {

      setError(
        "Super Admin messaging will be implemented separately."
      );

      return;
    }


    setBusyRequestId(otherProfile.id);

    setError("");


    try {

      // ------------------------------------------------------
      // Check whether an active session already exists
      // ------------------------------------------------------

      const {
        data: activeSession,
        error: sessionError,
      } = await supabase
        .from("messaging_sessions")
        .select("id")
        .or(
          `and(requester_id.eq.${user.id},receiver_id.eq.${otherProfile.id}),and(requester_id.eq.${otherProfile.id},receiver_id.eq.${user.id})`
        )
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .limit(1);


      if (sessionError) {
        throw sessionError;
      }


      if (activeSession?.length > 0) {

        setError(
          "You already have an active messaging session with this user."
        );

        return;
      }


      // ------------------------------------------------------
      // Check for an existing pending request in the same
      // direction.
      // ------------------------------------------------------

      const {
        data: existingRequest,
        error: existingError,
      } = await supabase
        .from("requests")
        .select("id")
        .eq("sender_id", user.id)
        .eq("receiver_id", otherProfile.id)
        .eq("type", "message")
        .eq("status", "pending")
        .limit(1);


      if (existingError) {
        throw existingError;
      }


      if (existingRequest?.length > 0) {

        setError(
          "You already have a pending request to this user."
        );

        return;
      }


      // ------------------------------------------------------
      // Create new message request
      // ------------------------------------------------------

      const {
        error: insertError,
      } = await supabase
        .from("requests")
        .insert({
          sender_id: user.id,
          receiver_id: otherProfile.id,
          type: "message",
          status: "pending",
          initial_message:
            "I would like to continue our conversation.",
        });


      if (insertError) {
        throw insertError;
      }


      await loadRequests(false);

      setActiveTab("sent");

    } catch (err) {

      console.error(
        "New request error:",
        err
      );

      setError(
        err?.message ||
          "Unable to send the request."
      );

    } finally {

      setBusyRequestId(null);
    }
  };


  // ==========================================================
  // Loading state
  // ==========================================================

  if (loading) {

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">

        <div className="flex items-center gap-3 text-gray-500">

          <Loader2
            size={22}
            className="animate-spin"
          />

          <span className="text-sm">
            Loading requests...
          </span>

        </div>

      </div>
    );
  }


  // ==========================================================
  // Main page
  // ==========================================================

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ======================================================
          Header
          ====================================================== */}

      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 backdrop-blur">

        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">

          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-full p-2 text-gray-600 transition hover:bg-gray-100"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>


            <div>

              <h1 className="font-bold text-gray-900">
                Requests
              </h1>

              <p className="text-xs text-gray-500">
                Manage your messaging requests
              </p>

            </div>

          </div>


          <button
            type="button"
            onClick={() => loadRequests(false)}
            disabled={refreshing}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
            aria-label="Refresh requests"
          >
            <RefreshCw
              size={18}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />
          </button>

        </div>

      </header>


      {/* ======================================================
          Main content
          ====================================================== */}

      <main className="mx-auto max-w-3xl px-4 py-5">


        {/* ====================================================
            Error
            ==================================================== */}

        {error && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}


        {/* ====================================================
            Tabs
            ==================================================== */}

        <div className="mb-5 grid grid-cols-2 rounded-xl bg-gray-100 p-1">

          <button
            type="button"
            onClick={() => setActiveTab("received")}
            className={`rounded-lg px-4 py-3 text-sm font-semibold transition ${
              activeTab === "received"
                ? "bg-white text-purple-600 shadow-sm"
                : "text-gray-500"
            }`}
          >
            Received

            {receivedRequests.length > 0 && (
              <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-600">
                {receivedRequests.length}
              </span>
            )}

          </button>


          <button
            type="button"
            onClick={() => setActiveTab("sent")}
            className={`rounded-lg px-4 py-3 text-sm font-semibold transition ${
              activeTab === "sent"
                ? "bg-white text-purple-600 shadow-sm"
                : "text-gray-500"
            }`}
          >
            Sent

            {sentRequests.length > 0 && (
              <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                {sentRequests.length}
              </span>
            )}

          </button>

        </div>


        {/* ====================================================
            Received tab
            ==================================================== */}

        {activeTab === "received" && (

          <section className="space-y-4">

            {receivedRequests.length === 0 ? (

              <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

                <UserCheck
                  size={36}
                  className="mx-auto text-gray-300"
                />

                <h2 className="mt-3 font-semibold text-gray-800">
                  No requests
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  You don't have any received requests yet.
                </p>

              </div>

            ) : (

              receivedRequests.map((request) => (

                <RequestCard
                  key={request.id}
                  request={request}
                  currentUserId={user.id}
                  sessions={sessions}
                  now={now}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onCancel={handleCancel}
                  onOpenConversation={
                    handleOpenConversation
                  }
                  onNewRequest={
                    handleNewRequest
                  }
                  busyRequestId={busyRequestId}
                />

              ))

            )}

          </section>
        )}


        {/* ====================================================
            Sent tab
            ==================================================== */}

        {activeTab === "sent" && (

          <section className="space-y-4">

            {sentRequests.length === 0 ? (

              <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

                <Send
                  size={36}
                  className="mx-auto text-gray-300"
                />

                <h2 className="mt-3 font-semibold text-gray-800">
                  No sent requests
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Requests you send will appear here.
                </p>

              </div>

            ) : (

              sentRequests.map((request) => (

                <RequestCard
                  key={request.id}
                  request={request}
                  currentUserId={user.id}
                  sessions={sessions}
                  now={now}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onCancel={handleCancel}
                  onOpenConversation={
                    handleOpenConversation
                  }
                  onNewRequest={
                    handleNewRequest
                  }
                  busyRequestId={busyRequestId}
                />

              ))

            )}

          </section>
        )}

      </main>

    </div>
  );
}