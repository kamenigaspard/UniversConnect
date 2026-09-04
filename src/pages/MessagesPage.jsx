// ============================================================
// MessagesPage.jsx
// ============================================================
//
// This page handles:
//
// 1. Displaying the user's conversations
// 2. Searching for other university users
// 3. Starting private conversations
// 4. Sending messages
// 5. Loading messages
// 6. Message requests
// 7. Temporary messaging sessions
// 8. Session expiration
// 9. Re-requesting after expiration
// 10. Opening conversations from /messages?user=USER_ID
//
// IMPORTANT:
// The database remains the final security authority.
// Frontend checks improve the user experience, while
// Supabase RLS/RPC functions enforce the real permissions.
//
// ============================================================

import {
  useEffect,
  useState,
  useCallback,
} from "react";

import {
  Search,
  Send,
  MessageCircle,
  ArrowLeft,
  User,
  Loader2,
  AlertCircle,
  Clock,
  RefreshCw,
} from "lucide-react";

import {
  useSearchParams,
} from "react-router-dom";

import {
  supabase,
} from "../lib/supabase";

import {
  useAuth,
} from "../contexts/AuthContext";


// ============================================================
// MAIN COMPONENT
// ============================================================

export default function MessagesPage() {

  // ----------------------------------------------------------
  // Authentication information
  // ----------------------------------------------------------

  const {
    user,
    profile,
  } = useAuth();


  // ----------------------------------------------------------
  // URL parameters
  //
  // Example:
  //
  // /messages?user=USER_ID
  //
  // This allows RequestsPage and other pages to open
  // a conversation with a specific user.
  // ----------------------------------------------------------

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const userFromUrl =
    searchParams.get("user");


  // ==========================================================
  // STATE
  // ==========================================================

  // Existing conversations.
  const [
    conversations,
    setConversations,
  ] = useState([]);


  // Currently selected conversation.
  const [
    activeConversation,
    setActiveConversation,
  ] = useState(null);


  // Messages in selected conversation.
  const [
    messages,
    setMessages,
  ] = useState([]);


  // Message input.
  const [
    messageText,
    setMessageText,
  ] = useState("");


  // User search.
  const [
    searchText,
    setSearchText,
  ] = useState("");


  // Search results.
  const [
    searchResults,
    setSearchResults,
  ] = useState([]);


  // Loading states.
  const [
    loadingConversations,
    setLoadingConversations,
  ] = useState(true);

  const [
    loadingMessages,
    setLoadingMessages,
  ] = useState(false);

  const [
    searching,
    setSearching,
  ] = useState(false);

  const [
    sending,
    setSending,
  ] = useState(false);


  // General error.
  const [
    error,
    setError,
  ] = useState("");


  // Success message.
  const [
    success,
    setSuccess,
  ] = useState("");


  // User who needs a request.
  const [
    requestUser,
    setRequestUser,
  ] = useState(null);


  // Request introductory message.
  const [
    requestMessage,
    setRequestMessage,
  ] = useState("");


  // Request sending state.
  const [
    sendingRequest,
    setSendingRequest,
  ] = useState(false);


  // Current temporary messaging session.
  const [
    activeSession,
    setActiveSession,
  ] = useState(null);


  // Current time.
  //
  // This is updated every second so that the session
  // countdown remains accurate.
  const [
    currentTime,
    setCurrentTime,
  ] = useState(Date.now());


  // ==========================================================
  // CURRENT TIME
  // ==========================================================

  useEffect(() => {

    const timer =
      setInterval(() => {

        setCurrentTime(
          Date.now()
        );

      }, 1000);


    return () => {
      clearInterval(timer);
    };

  }, []);


  // ==========================================================
  // HELPERS
  // ==========================================================

  // ----------------------------------------------------------
  // Format time
  // ----------------------------------------------------------

  function formatTime(date) {

    if (!date) {
      return "";
    }

    return new Date(
      date
    ).toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }


  // ----------------------------------------------------------
  // Format date
  // ----------------------------------------------------------

  function formatDate(date) {

    if (!date) {
      return "";
    }

    return new Date(
      date
    ).toLocaleString(
      [],
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }


  // ----------------------------------------------------------
  // Role label
  // ----------------------------------------------------------

  function roleLabel(role) {

    if (!role) {
      return "";
    }

    return role
      .replace("_", " ")
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );
  }


  // ----------------------------------------------------------
  // Determine whether a session is active
  // ----------------------------------------------------------

  function isSessionActive(session) {

    if (!session) {
      return false;
    }

    if (!session.is_active) {
      return false;
    }

    if (!session.expires_at) {
      return false;
    }

    return (
      new Date(
        session.expires_at
      ).getTime() > currentTime
    );
  }


  // ----------------------------------------------------------
  // Remaining session time
  // ----------------------------------------------------------

  function getRemainingSessionTime() {

    if (!activeSession) {
      return "";
    }

    const expires =
      new Date(
        activeSession.expires_at
      ).getTime();

    const difference =
      expires - currentTime;


    if (difference <= 0) {
      return "Expired";
    }


    const totalSeconds =
      Math.floor(
        difference / 1000
      );


    const hours =
      Math.floor(
        totalSeconds / 3600
      );


    const minutes =
      Math.floor(
        (totalSeconds % 3600) / 60
      );


    const seconds =
      totalSeconds % 60;


    if (hours > 0) {

      return `${hours}h ${minutes}m ${seconds}s`;

    }


    if (minutes > 0) {

      return `${minutes}m ${seconds}s`;

    }


    return `${seconds}s`;
  }


  // ----------------------------------------------------------
  // Determine whether a request is required
  // ----------------------------------------------------------
  //
  // Teacher/Admin -> Student:
  // No request required.
  //
  // Everything else:
  // Request/session required.
  //
  // Super Admin is handled separately.
  // ----------------------------------------------------------

  function requiresMessagingRequest(otherUser) {

    if (!otherUser) {
      return false;
    }


    // Super Admin has a separate messaging system.
    if (
      otherUser.role === "super_admin"
    ) {
      return true;
    }


    // Teacher/Admin can directly message students.
    if (
      (
        profile?.role === "teacher" ||
        profile?.role === "admin"
      ) &&
      otherUser.role === "student"
    ) {

      return false;
    }


    // All other combinations require
    // an accepted temporary messaging session.
    return true;
  }


  // ==========================================================
  // LOAD CONVERSATIONS
  // ==========================================================

  const loadConversations =
    useCallback(
      async () => {

        if (!user?.id) {
          return;
        }


        try {

          setLoadingConversations(
            true
          );

          setError("");


          // --------------------------------------------------
          // Get active conversation memberships.
          // --------------------------------------------------

          const {
            data: memberships,
            error: membershipError,
          } = await supabase
            .from(
              "conversation_members"
            )
            .select(`
              conversation_id,
              last_read_at,
              is_muted
            `)
            .eq(
              "user_id",
              user.id
            )
            .eq(
              "is_active",
              true
            );


          if (membershipError) {
            throw membershipError;
          }


          if (
            !memberships ||
            memberships.length === 0
          ) {

            setConversations([]);

            return;
          }


          // --------------------------------------------------
          // Extract conversation IDs.
          // --------------------------------------------------

          const conversationIds =
            memberships.map(
              (item) =>
                item.conversation_id
            );


          // --------------------------------------------------
          // Load conversations.
          // --------------------------------------------------

          const {
            data: conversationRows,
            error: conversationError,
          } = await supabase
            .from(
              "conversations"
            )
            .select(`
              id,
              participant_one_id,
              participant_two_id,
              type,
              name,
              description,
              avatar_url,
              updated_at
            `)
            .in(
              "id",
              conversationIds
            )
            .order(
              "updated_at",
              {
                ascending: false,
              }
            );


          if (conversationError) {
            throw conversationError;
          }


          // --------------------------------------------------
          // Find other participants.
          // --------------------------------------------------

          const otherUserIds =
            (conversationRows || [])
              .map(
                (conversation) => {

                  if (
                    conversation.participant_one_id ===
                    user.id
                  ) {

                    return conversation.participant_two_id;

                  }

                  return conversation.participant_one_id;

                }
              )
              .filter(Boolean);


          const uniqueUserIds =
            [
              ...new Set(
                otherUserIds
              ),
            ];


          // --------------------------------------------------
          // Load profiles.
          // --------------------------------------------------

          let profileRows = [];


          if (
            uniqueUserIds.length > 0
          ) {

            const {
              data,
              error: profileError,
            } = await supabase
              .from(
                "profiles"
              )
              .select(`
                id,
                full_name,
                username,
                avatar_url,
                role,
                school_id
              `)
              .in(
                "id",
                uniqueUserIds
              );


            if (profileError) {
              throw profileError;
            }


            profileRows =
              data || [];
          }


          // --------------------------------------------------
          // Combine conversation/profile information.
          // --------------------------------------------------

          const formattedConversations =
            (
              conversationRows || []
            ).map(
              (conversation) => {

                const otherUserId =
                  conversation
                    .participant_one_id ===
                  user.id
                    ? conversation
                        .participant_two_id
                    : conversation
                        .participant_one_id;


                const otherUser =
                  profileRows.find(
                    (item) =>
                      item.id ===
                      otherUserId
                  );


                return {
                  ...conversation,
                  otherUser:
                    otherUser || null,
                };

              }
            );


          setConversations(
            formattedConversations
          );

        } catch (err) {

          console.error(
            "Error loading conversations:",
            err
          );


          setError(
            err?.message ||
            "Unable to load your conversations."
          );

        } finally {

          setLoadingConversations(
            false
          );
        }

      },
      [user?.id]
    );


  // ==========================================================
  // INITIAL CONVERSATION LOAD
  // ==========================================================

  useEffect(() => {

    if (!user?.id) {
      return;
    }

    loadConversations();

  }, [
    user?.id,
    loadConversations,
  ]);


  // ==========================================================
  // LOAD ACTIVE MESSAGING SESSION
  // ==========================================================

  const loadActiveSession =
    useCallback(
      async (
        otherUserId
      ) => {

        if (
          !user?.id ||
          !otherUserId
        ) {

          setActiveSession(null);

          return;
        }


        try {

          const {
            data,
            error: sessionError,
          } = await supabase
            .from(
              "messaging_sessions"
            )
            .select(`
              id,
              requester_id,
              receiver_id,
              request_id,
              conversation_id,
              started_at,
              expires_at,
              duration_hours,
              is_active,
              created_at
            `)
            .or(
              `and(requester_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},receiver_id.eq.${user.id})`
            )
            .eq(
              "is_active",
              true
            )
            .gt(
              "expires_at",
              new Date().toISOString()
            )
            .order(
              "expires_at",
              {
                ascending: false,
              }
            )
            .limit(1)
            .maybeSingle();


          if (sessionError) {
            throw sessionError;
          }


          setActiveSession(
            data || null
          );

        } catch (err) {

          console.error(
            "Error loading messaging session:",
            err
          );

          setActiveSession(null);
        }

      },
      [user?.id]
    );


  // ==========================================================
  // LOAD MESSAGES
  // ==========================================================

  async function loadMessages(
    conversation
  ) {

    if (!conversation) {
      return;
    }


    try {

      setLoadingMessages(true);

      setError("");
      setSuccess("");


      // ------------------------------------------------------
      // Load messages.
      // ------------------------------------------------------

      const {
        data,
        error: messageError,
      } = await supabase
        .from(
          "messages"
        )
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          media_url,
          media_type,
          is_deleted,
          created_at
        `)
        .eq(
          "conversation_id",
          conversation.id
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        );


      if (messageError) {
        throw messageError;
      }


      setMessages(
        data || []
      );


      // ------------------------------------------------------
      // Mark conversation as read.
      // ------------------------------------------------------

      const {
        error: readError,
      } = await supabase
        .from(
          "conversation_members"
        )
        .update({
          last_read_at:
            new Date().toISOString(),
        })
        .eq(
          "conversation_id",
          conversation.id
        )
        .eq(
          "user_id",
          user.id
        );


      if (readError) {

        console.warn(
          "Unable to update read status:",
          readError
        );

      }


    } catch (err) {

      console.error(
        "Error loading messages:",
        err
      );


      setError(
        err?.message ||
        "Unable to load messages."
      );

    } finally {

      setLoadingMessages(
        false
      );
    }
  }


  // ==========================================================
  // SELECT CONVERSATION
  // ==========================================================

  async function selectConversation(
    conversation
  ) {

    setActiveConversation(
      conversation
    );

    setRequestUser(null);

    setError("");

    setSuccess("");

    setMessages([]);


    await loadMessages(
      conversation
    );


    await loadActiveSession(
      conversation.otherUser?.id
    );
  }


  // ==========================================================
  // SEARCH USERS
  // ==========================================================

  async function searchUsers(
    value
  ) {

    setSearchText(value);


    if (!value.trim()) {

      setSearchResults([]);

      return;
    }


    if (!user?.id) {
      return;
    }


    try {

      setSearching(true);

      setError("");


      const searchTerm =
        value.trim();


      const {
        data,
        error: searchError,
      } = await supabase
        .from(
          "profiles"
        )
        .select(`
          id,
          full_name,
          username,
          avatar_url,
          role,
          school_id
        `)
        .neq(
          "id",
          user.id
        )
        .eq(
          "is_active",
          true
        )
        .neq(
          "role",
          "super_admin"
        )
        .or(
          `full_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`
        )
        .limit(10);


      if (searchError) {
        throw searchError;
      }


      setSearchResults(
        data || []
      );

    } catch (err) {

      console.error(
        "User search error:",
        err
      );


      setError(
        err?.message ||
        "Unable to search users."
      );

    } finally {

      setSearching(false);
    }
  }


  // ==========================================================
  // START PRIVATE CONVERSATION
  // ==========================================================

  async function startConversation(
    selectedUser
  ) {

    if (!selectedUser?.id) {
      return;
    }


    if (!user?.id) {
      return;
    }


    try {

      setError("");

      setSuccess("");

      setRequestUser(null);


      // ------------------------------------------------------
      // Super Admin is intentionally separated.
      // ------------------------------------------------------

      if (
        selectedUser.role ===
        "super_admin"
      ) {

        setError(
          "Super Admin messaging will be implemented separately."
        );

        return;
      }


      // ------------------------------------------------------
      // Check whether this relationship requires an
      // accepted temporary messaging session.
      // ------------------------------------------------------

      const needsRequest =
        requiresMessagingRequest(
          selectedUser
        );


      if (needsRequest) {

        await loadActiveSession(
          selectedUser.id
        );


        // ----------------------------------------------------
        // Check for active session.
        // ----------------------------------------------------

        const {
          data: existingSession,
          error: sessionError,
        } = await supabase
          .from(
            "messaging_sessions"
          )
          .select(`
            id,
            requester_id,
            receiver_id,
            request_id,
            conversation_id,
            started_at,
            expires_at,
            duration_hours,
            is_active,
            created_at
          `)
          .or(
            `and(requester_id.eq.${user.id},receiver_id.eq.${selectedUser.id}),and(requester_id.eq.${selectedUser.id},receiver_id.eq.${user.id})`
          )
          .eq(
            "is_active",
            true
          )
          .gt(
            "expires_at",
            new Date().toISOString()
          )
          .order(
            "expires_at",
            {
              ascending: false,
            }
          )
          .limit(1)
          .maybeSingle();


        if (sessionError) {
          throw sessionError;
        }


        if (!existingSession) {

          // --------------------------------------------------
          // There is no active session.
          //
          // Show request modal instead of opening an old
          // conversation and allowing the user to type.
          // --------------------------------------------------

          setRequestUser(
            selectedUser
          );

          return;
        }


        setActiveSession(
          existingSession
        );
      }


      // ------------------------------------------------------
      // Ask database to create/retrieve private conversation.
      // ------------------------------------------------------

      const {
        data: conversationId,
        error: conversationError,
      } = await supabase.rpc(
        "create_private_conversation",
        {
          p_receiver_id:
            selectedUser.id,
        }
      );


      if (conversationError) {

        if (
          conversationError.message
            ?.toLowerCase()
            .includes(
              "accepted request is required"
            )
        ) {

          setRequestUser(
            selectedUser
          );

          return;
        }


        throw conversationError;
      }


      // ------------------------------------------------------
      // Refresh conversation list.
      // ------------------------------------------------------

      await loadConversations();


      // ------------------------------------------------------
      // Load conversation.
      // ------------------------------------------------------

      const {
        data: conversation,
        error: fetchError,
      } = await supabase
        .from(
          "conversations"
        )
        .select(`
          id,
          participant_one_id,
          participant_two_id,
          type,
          name,
          description,
          avatar_url,
          updated_at
        `)
        .eq(
          "id",
          conversationId
        )
        .single();


      if (fetchError) {
        throw fetchError;
      }


      const completeConversation = {
        ...conversation,
        otherUser:
          selectedUser,
      };


      setActiveConversation(
        completeConversation
      );


      await loadMessages(
        completeConversation
      );


      await loadActiveSession(
        selectedUser.id
      );


      // ------------------------------------------------------
      // Clear search.
      // ------------------------------------------------------

      setSearchText("");

      setSearchResults([]);


      // ------------------------------------------------------
      // Remove ?user= from URL.
      // ------------------------------------------------------

      setSearchParams({});

    } catch (err) {

      console.error(
        "Start conversation error:",
        err
      );


      setError(
        err?.message ||
        "Unable to start conversation."
      );
    }
  }


  // ==========================================================
  // SEND MESSAGE REQUEST
  // ==========================================================

  async function sendMessageRequest() {

    if (!requestUser) {
      return;
    }


    if (!user?.id) {
      return;
    }


    try {

      setSendingRequest(true);

      setError("");

      setSuccess("");


      // ------------------------------------------------------
      // Super Admin protection.
      // ------------------------------------------------------

      if (
        requestUser.role ===
        "super_admin"
      ) {

        setError(
          "Super Admin messaging will be implemented separately."
        );

        return;
      }


      // ------------------------------------------------------
      // Check active session.
      // ------------------------------------------------------

      const {
        data: activeSessions,
        error: sessionError,
      } = await supabase
        .from(
          "messaging_sessions"
        )
        .select("id")
        .or(
          `and(requester_id.eq.${user.id},receiver_id.eq.${requestUser.id}),and(requester_id.eq.${requestUser.id},receiver_id.eq.${user.id})`
        )
        .eq(
          "is_active",
          true
        )
        .gt(
          "expires_at",
          new Date().toISOString()
        )
        .limit(1);


      if (sessionError) {
        throw sessionError;
      }


      if (
        activeSessions &&
        activeSessions.length > 0
      ) {

        setError(
          "You already have an active messaging session with this user."
        );

        return;
      }


      // ------------------------------------------------------
      // Check pending MESSAGE request.
      //
      // Notice that type = "message" is explicitly checked.
      // ------------------------------------------------------

      const {
        data: existingRequest,
        error: existingError,
      } = await supabase
        .from(
          "requests"
        )
        .select("id")
        .eq(
          "sender_id",
          user.id
        )
        .eq(
          "receiver_id",
          requestUser.id
        )
        .eq(
          "type",
          "message"
        )
        .eq(
          "status",
          "pending"
        )
        .limit(1);


      if (existingError) {
        throw existingError;
      }


      if (
        existingRequest &&
        existingRequest.length > 0
      ) {

        setError(
          "You already have a pending message request with this user."
        );

        return;
      }


      // ------------------------------------------------------
      // Create message request.
      // ------------------------------------------------------

      const {
        error: requestError,
      } = await supabase
        .from(
          "requests"
        )
        .insert({
          sender_id:
            user.id,

          receiver_id:
            requestUser.id,

          type:
            "message",

          status:
            "pending",

          initial_message:
            requestMessage.trim() ||
            null,
        });


      if (requestError) {
        throw requestError;
      }


      // ------------------------------------------------------
      // Clear request form.
      // ------------------------------------------------------

      setRequestMessage("");

      setRequestUser(null);


      setSuccess(
        "Message request sent successfully."
      );

    } catch (err) {

      console.error(
        "Send request error:",
        err
      );


      setError(
        err?.message ||
        "Unable to send message request."
      );

    } finally {

      setSendingRequest(false);
    }
  }


  // ==========================================================
  // SEND MESSAGE
  // ==========================================================

  async function sendMessage(
    event
  ) {

    event.preventDefault();


    if (!messageText.trim()) {
      return;
    }


    if (!activeConversation) {
      return;
    }


    if (!user?.id) {
      return;
    }


    // --------------------------------------------------------
    // Determine whether this conversation requires a session.
    // --------------------------------------------------------

    const otherUser =
      activeConversation.otherUser;


    const needsSession =
      requiresMessagingRequest(
        otherUser
      );


    // --------------------------------------------------------
    // If a session is required, make sure it is still active.
    // --------------------------------------------------------

    if (needsSession) {

      if (
        !isSessionActive(
          activeSession
        )
      ) {

        setError(
          "Your messaging session has expired. Please send a new request to continue."
        );

        return;
      }
    }


    try {

      setSending(true);

      setError("");

      setSuccess("");


      // ------------------------------------------------------
      // Insert message.
      //
      // RLS remains the final security check.
      // ------------------------------------------------------

      const {
        data: newMessage,
        error: messageError,
      } = await supabase
        .from(
          "messages"
        )
        .insert({
          conversation_id:
            activeConversation.id,

          sender_id:
            user.id,

          content:
            messageText.trim(),

          media_url:
            null,

          media_type:
            null,

          is_deleted:
            false,
        })
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          media_url,
          media_type,
          is_deleted,
          created_at
        `)
        .single();


      if (messageError) {
        throw messageError;
      }


      // ------------------------------------------------------
      // Immediately add message to UI.
      // ------------------------------------------------------

      setMessages(
        (previousMessages) => [
          ...previousMessages,
          newMessage,
        ]
      );


      // ------------------------------------------------------
      // Update conversation timestamp.
      // ------------------------------------------------------

      const {
        error: updateError,
      } = await supabase
        .from(
          "conversations"
        )
        .update({
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          activeConversation.id
        );


      if (updateError) {

        console.warn(
          "Unable to update conversation timestamp:",
          updateError
        );

      }


      // ------------------------------------------------------
      // Clear message input.
      // ------------------------------------------------------

      setMessageText("");

    } catch (err) {

      console.error(
        "Send message error:",
        err
      );


      setError(
        err?.message ||
        "Unable to send message."
      );

    } finally {

      setSending(false);
    }
  }


  // ==========================================================
  // OPEN USER FROM URL
  // ==========================================================

  useEffect(() => {

    if (
      !userFromUrl ||
      !user?.id
    ) {
      return;
    }


    let cancelled = false;


    async function openUserFromUrl() {

      try {

        const {
          data: selectedUser,
          error: userError,
        } = await supabase
          .from(
            "profiles"
          )
          .select(`
            id,
            full_name,
            username,
            avatar_url,
            role,
            school_id
          `)
          .eq(
            "id",
            userFromUrl
          )
          .eq(
            "is_active",
            true
          )
          .maybeSingle();


        if (userError) {
          throw userError;
        }


        if (!selectedUser) {

          throw new Error(
            "The selected user could not be found."
          );
        }


        if (!cancelled) {

          await startConversation(
            selectedUser
          );

        }

      } catch (err) {

        if (cancelled) {
          return;
        }


        console.error(
          "URL conversation error:",
          err
        );


        setError(
          err?.message ||
          "Unable to open this conversation."
        );
      }
    }


    openUserFromUrl();


    return () => {

      cancelled = true;

    };

  }, [
    userFromUrl,
    user?.id,
  ]);


  // ==========================================================
  // AUTOMATIC SESSION REFRESH
  // ==========================================================
  //
  // When the active session approaches/ reaches expiration,
  // reload it from Supabase.
  //
  // This is especially useful while the user remains on the
  // Messages page for a long period.
  // ==========================================================

  useEffect(() => {

    if (
      !activeConversation?.otherUser?.id
    ) {
      return;
    }


    const timer =
      setInterval(() => {

        loadActiveSession(
          activeConversation
            .otherUser
            .id
        );

      }, 30000);


    return () => {

      clearInterval(timer);

    };

  }, [
    activeConversation,
    loadActiveSession,
  ]);


  // ==========================================================
  // PROFILE LOADING
  // ==========================================================

  if (!profile) {

    return (
      <div className="min-h-screen flex items-center justify-center">

        <Loader2
          className="animate-spin"
          size={32}
        />

      </div>
    );
  }


  // ==========================================================
  // DETERMINE WHETHER CURRENT CHAT CAN SEND
  // ==========================================================

  const activeUser =
    activeConversation?.otherUser;


  const activeChatRequiresSession =
    activeUser
      ? requiresMessagingRequest(
          activeUser
        )
      : false;


  const sessionCurrentlyActive =
    activeChatRequiresSession
      ? isSessionActive(
          activeSession
        )
      : true;


  const canSendMessage =
    Boolean(
      activeConversation &&
      (
        !activeChatRequiresSession ||
        sessionCurrentlyActive
      )
    );


  // ==========================================================
  // USER INTERFACE
  // ==========================================================

  return (

    <div className="h-[calc(100vh-64px)] bg-gray-50">

      <div className="h-full max-w-7xl mx-auto flex">


        {/* ==================================================
            LEFT SIDE — CONVERSATIONS
        ================================================== */}

        <aside
          className={`
            w-full
            md:w-80
            lg:w-96
            border-r
            bg-white
            flex
            flex-col
            ${
              activeConversation
                ? "hidden md:flex"
                : "flex"
            }
          `}
        >

          {/* Header */}

          <div className="p-4 border-b">

            <h1 className="text-xl font-bold">
              Messages
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Connect with people in your university
            </p>

          </div>


          {/* Search */}

          <div className="p-3 border-b">

            <div className="relative">

              <Search
                size={18}
                className="
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-gray-400
                "
              />

              <input
                type="text"
                value={searchText}
                onChange={(event) =>
                  searchUsers(
                    event.target.value
                  )
                }
                placeholder="Search people..."
                className="
                  w-full
                  pl-10
                  pr-4
                  py-2.5
                  rounded-xl
                  bg-gray-100
                  border
                  border-transparent
                  focus:border-blue-500
                  focus:outline-none
                "
              />

            </div>


            {/* Search results */}

            {searchText.trim() && (

              <div className="mt-2 space-y-1">

                {searching && (

                  <div className="p-3 text-center">

                    <Loader2
                      size={20}
                      className="animate-spin mx-auto"
                    />

                  </div>

                )}


                {!searching &&
                  searchResults.length === 0 && (

                    <p className="p-3 text-sm text-gray-500">
                      No users found.
                    </p>

                  )}


                {searchResults.map(
                  (person) => (

                    <button
                      key={person.id}
                      type="button"
                      onClick={() =>
                        startConversation(
                          person
                        )
                      }
                      className="
                        w-full
                        flex
                        items-center
                        gap-3
                        p-3
                        rounded-xl
                        hover:bg-gray-100
                        text-left
                      "
                    >

                      {person.avatar_url ? (

                        <img
                          src={
                            person.avatar_url
                          }
                          alt=""
                          className="
                            w-10
                            h-10
                            rounded-full
                            object-cover
                          "
                        />

                      ) : (

                        <div
                          className="
                            w-10
                            h-10
                            rounded-full
                            bg-gray-200
                            flex
                            items-center
                            justify-center
                          "
                        >
                          <User
                            size={20}
                          />
                        </div>

                      )}


                      <div>

                        <p className="font-medium">
                          {person.full_name}
                        </p>

                        <p className="text-xs text-gray-500">
                          @
                          {person.username ||
                            "user"}
                          {" · "}
                          {roleLabel(
                            person.role
                          )}
                        </p>

                      </div>

                    </button>

                  )
                )}

              </div>

            )}

          </div>


          {/* Conversation list */}

          <div className="flex-1 overflow-y-auto">

            {loadingConversations && (

              <div className="flex justify-center p-6">

                <Loader2
                  className="animate-spin"
                />

              </div>

            )}


            {!loadingConversations &&
              conversations.length === 0 && (

                <div className="p-6 text-center">

                  <MessageCircle
                    size={40}
                    className="mx-auto text-gray-300"
                  />

                  <p className="mt-3 font-medium">
                    No conversations yet
                  </p>

                  <p className="text-sm text-gray-500 mt-1">
                    Search for someone above to
                    start a conversation.
                  </p>

                </div>

              )}


            {conversations.map(
              (conversation) => (

                <button
                  key={conversation.id}
                  type="button"
                  onClick={() =>
                    selectConversation(
                      conversation
                    )
                  }
                  className={`
                    w-full
                    flex
                    items-center
                    gap-3
                    p-4
                    border-b
                    text-left
                    hover:bg-gray-50
                    ${
                      activeConversation?.id ===
                      conversation.id
                        ? "bg-gray-100"
                        : ""
                    }
                  `}
                >

                  {conversation.otherUser
                    ?.avatar_url ? (

                    <img
                      src={
                        conversation
                          .otherUser
                          .avatar_url
                      }
                      alt=""
                      className="
                        w-12
                        h-12
                        rounded-full
                        object-cover
                      "
                    />

                  ) : (

                    <div
                      className="
                        w-12
                        h-12
                        rounded-full
                        bg-gray-200
                        flex
                        items-center
                        justify-center
                      "
                    >
                      <User />
                    </div>

                  )}


                  <div className="flex-1 min-w-0">

                    <div className="flex justify-between">

                      <p className="font-medium truncate">
                        {
                          conversation
                            .otherUser
                            ?.full_name ||
                          "Unknown user"
                        }
                      </p>

                      <span className="text-xs text-gray-400">
                        {formatTime(
                          conversation.updated_at
                        )}
                      </span>

                    </div>

                    <p className="text-sm text-gray-500 truncate">

                      @
                      {
                        conversation
                          .otherUser
                          ?.username ||
                        "user"
                      }

                    </p>

                  </div>

                </button>

              )
            )}

          </div>

        </aside>


        {/* ==================================================
            RIGHT SIDE — CHAT
        ================================================== */}

        <main
          className={`
            flex-1
            flex
            flex-col
            bg-white
            ${
              activeConversation
                ? "flex"
                : "hidden md:flex"
            }
          `}
        >

          {!activeConversation ? (

            <div
              className="
                flex-1
                flex
                items-center
                justify-center
                text-center
                p-6
              "
            >

              <div>

                <MessageCircle
                  size={64}
                  className="mx-auto text-gray-300"
                />

                <h2 className="text-xl font-semibold mt-4">
                  Your Messages
                </h2>

                <p className="text-gray-500 mt-2">
                  Select a conversation or search
                  for someone to start messaging.
                </p>

              </div>

            </div>

          ) : (

            <>

              {/* ==================================================
                  CHAT HEADER
              ================================================== */}

              <header
                className="
                  h-16
                  border-b
                  flex
                  items-center
                  gap-3
                  px-4
                "
              >

                <button
                  type="button"
                  className="md:hidden"
                  onClick={() =>
                    setActiveConversation(
                      null
                    )
                  }
                >
                  <ArrowLeft />
                </button>


                {activeConversation
                  .otherUser
                  ?.avatar_url ? (

                  <img
                    src={
                      activeConversation
                        .otherUser
                        .avatar_url
                    }
                    alt=""
                    className="
                      w-10
                      h-10
                      rounded-full
                      object-cover
                    "
                  />

                ) : (

                  <div
                    className="
                      w-10
                      h-10
                      rounded-full
                      bg-gray-200
                      flex
                      items-center
                      justify-center
                    "
                  >
                    <User size={20} />
                  </div>

                )}


                <div className="flex-1">

                  <p className="font-semibold">
                    {
                      activeConversation
                        .otherUser
                        ?.full_name
                    }
                  </p>

                  <p className="text-xs text-gray-500">
                    @
                    {
                      activeConversation
                        .otherUser
                        ?.username ||
                      "user"
                    }
                  </p>

                </div>


                {/* ------------------------------------------------
                    Temporary session indicator
                ------------------------------------------------ */}

                {activeChatRequiresSession && (

                  <div className="hidden sm:flex items-center gap-2">

                    {sessionCurrentlyActive ? (

                      <div className="flex items-center gap-1 rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-600">

                        <Clock size={13} />

                        {getRemainingSessionTime()}

                      </div>

                    ) : (

                      <div className="flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-600">

                        <Clock size={13} />

                        Expired

                      </div>

                    )}

                  </div>

                )}

              </header>


              {/* ==================================================
                  SUCCESS MESSAGE
              ================================================== */}

              {success && (

                <div
                  className="
                    mx-4
                    mt-3
                    p-3
                    rounded-xl
                    bg-green-50
                    text-green-700
                    text-sm
                  "
                >
                  {success}
                </div>

              )}


              {/* ==================================================
                  ERROR MESSAGE
              ================================================== */}

              {error && (

                <div
                  className="
                    mx-4
                    mt-3
                    p-3
                    rounded-xl
                    bg-red-50
                    text-red-700
                    text-sm
                    flex
                    items-start
                    gap-2
                  "
                >

                  <AlertCircle
                    size={18}
                    className="mt-0.5"
                  />

                  <span>
                    {error}
                  </span>

                </div>

              )}


              {/* ==================================================
                  SESSION EXPIRED NOTICE
              ================================================== */}

              {activeChatRequiresSession &&
                !sessionCurrentlyActive && (

                  <div
                    className="
                      mx-4
                      mt-3
                      rounded-xl
                      bg-orange-50
                      border
                      border-orange-100
                      p-4
                    "
                  >

                    <div className="flex items-start gap-3">

                      <Clock
                        size={20}
                        className="text-orange-500 mt-0.5"
                      />

                      <div>

                        <p className="font-semibold text-orange-700">
                          Messaging session expired
                        </p>

                        <p className="text-sm text-orange-600 mt-1">
                          Your temporary messaging
                          session has expired. Send a
                          new request to continue this
                          conversation.
                        </p>

                      </div>

                    </div>

                  </div>

                )}


              {/* ==================================================
                  MESSAGES
              ================================================== */}

              <div
                className="
                  flex-1
                  overflow-y-auto
                  p-4
                  space-y-3
                "
              >

                {loadingMessages && (

                  <div className="flex justify-center">

                    <Loader2
                      className="animate-spin"
                    />

                  </div>

                )}


                {!loadingMessages &&
                  messages.length === 0 && (

                    <div
                      className="
                        h-full
                        flex
                        items-center
                        justify-center
                        text-center
                      "
                    >

                      <div>

                        <MessageCircle
                          size={48}
                          className="
                            mx-auto
                            text-gray-300
                          "
                        />

                        <p className="mt-3 font-medium">
                          No messages yet
                        </p>

                        <p className="text-sm text-gray-500">
                          Send the first message.
                        </p>

                      </div>

                    </div>

                  )}


                {messages.map(
                  (message) => {

                    const isMine =
                      message.sender_id ===
                      user.id;


                    return (

                      <div
                        key={message.id}
                        className={`
                          flex
                          ${
                            isMine
                              ? "justify-end"
                              : "justify-start"
                          }
                        `}
                      >

                        <div
                          className={`
                            max-w-[75%]
                            px-4
                            py-2.5
                            rounded-2xl
                            ${
                              isMine
                                ? "bg-blue-600 text-white rounded-br-md"
                                : "bg-gray-100 text-gray-900 rounded-bl-md"
                            }
                          `}
                        >

                          {message.is_deleted ? (

                            <p className="italic text-sm">
                              Message deleted
                            </p>

                          ) : (

                            <p className="whitespace-pre-wrap break-words">
                              {message.content}
                            </p>

                          )}


                          <p
                            className={`
                              text-[10px]
                              mt-1
                              ${
                                isMine
                                  ? "text-blue-100"
                                  : "text-gray-400"
                              }
                            `}
                          >
                            {formatTime(
                              message.created_at
                            )}
                          </p>

                        </div>

                      </div>

                    );
                  }
                )}

              </div>


              {/* ==================================================
                  MESSAGE COMPOSER
              ================================================== */}

              {canSendMessage ? (

                <form
                  onSubmit={sendMessage}
                  className="
                    border-t
                    p-3
                    flex
                    gap-2
                  "
                >

                  <input
                    type="text"
                    value={messageText}
                    onChange={(event) =>
                      setMessageText(
                        event.target.value
                      )
                    }
                    placeholder="Write a message..."
                    className="
                      flex-1
                      px-4
                      py-3
                      rounded-full
                      bg-gray-100
                      focus:outline-none
                      focus:ring-2
                      focus:ring-blue-500
                    "
                  />


                  <button
                    type="submit"
                    disabled={
                      sending ||
                      !messageText.trim()
                    }
                    className="
                      w-12
                      h-12
                      rounded-full
                      bg-blue-600
                      text-white
                      flex
                      items-center
                      justify-center
                      disabled:opacity-50
                    "
                  >

                    {sending ? (

                      <Loader2
                        size={20}
                        className="animate-spin"
                      />

                    ) : (

                      <Send size={20} />

                    )}

                  </button>

                </form>

              ) : (

                <div
                  className="
                    border-t
                    bg-orange-50
                    p-4
                    text-center
                  "
                >

                  <p className="text-sm font-medium text-orange-700">
                    This messaging session has expired.
                  </p>

                  <p className="text-xs text-orange-600 mt-1">
                    Send a new message request to
                    continue messaging.
                  </p>

                </div>

              )}

            </>

          )}

        </main>

      </div>


      {/* ======================================================
          MESSAGE REQUEST MODAL
      ====================================================== */}

      {requestUser && (

        <div
          className="
            fixed
            inset-0
            bg-black/50
            flex
            items-center
            justify-center
            p-4
            z-50
          "
        >

          <div
            className="
              w-full
              max-w-md
              bg-white
              rounded-2xl
              p-6
              shadow-xl
            "
          >

            <h2 className="text-xl font-bold">
              Message Request
            </h2>


            <div className="mt-3 flex items-center gap-3">

              {requestUser.avatar_url ? (

                <img
                  src={
                    requestUser.avatar_url
                  }
                  alt=""
                  className="
                    w-11
                    h-11
                    rounded-full
                    object-cover
                  "
                />

              ) : (

                <div
                  className="
                    w-11
                    h-11
                    rounded-full
                    bg-gray-100
                    flex
                    items-center
                    justify-center
                  "
                >
                  <User size={20} />
                </div>

              )}


              <div>

                <p className="font-semibold">
                  {requestUser.full_name}
                </p>

                <p className="text-xs text-gray-500">
                  @
                  {requestUser.username ||
                    "user"}
                  {" · "}
                  {roleLabel(
                    requestUser.role
                  )}
                </p>

              </div>

            </div>


            <p className="text-gray-600 mt-4">

              You need an accepted request before
              messaging{" "}

              <strong>
                {requestUser.full_name}
              </strong>
              .

            </p>


            <textarea
              value={requestMessage}
              onChange={(event) =>
                setRequestMessage(
                  event.target.value
                )
              }
              placeholder="Write an introductory message..."
              rows={4}
              className="
                w-full
                mt-4
                p-3
                rounded-xl
                border
                focus:outline-none
                focus:ring-2
                focus:ring-blue-500
              "
            />


            <div className="flex gap-3 mt-4">

              <button
                type="button"
                onClick={() => {

                  setRequestUser(null);

                  setRequestMessage("");

                }}
                className="
                  flex-1
                  px-4
                  py-2.5
                  rounded-xl
                  border
                  hover:bg-gray-50
                "
              >
                Cancel
              </button>


              <button
                type="button"
                onClick={
                  sendMessageRequest
                }
                disabled={
                  sendingRequest
                }
                className="
                  flex-1
                  px-4
                  py-2.5
                  rounded-xl
                  bg-blue-600
                  text-white
                  disabled:opacity-50
                "
              >

                {sendingRequest
                  ? "Sending..."
                  : "Send Request"}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );
}