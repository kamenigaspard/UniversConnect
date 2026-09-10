import { supabase } from "../../lib/supabase";

import {
  getMessagingRule,
  canRequestConnection,
  canRequestMessage,
} from "./messagingPermissions";

/* =========================================================
   HELPERS
========================================================= */

function throwIfError(error, fallbackMessage) {
  if (error) {
    console.error(fallbackMessage, error);
    throw new Error(error.message || fallbackMessage);
  }
}

function requireUser(user) {
  if (!user?.id) {
    throw new Error(
      "You must be authenticated to use messaging."
    );
  }

  return user;
}

/*
 * connections.user_one_id must always be smaller than
 * connections.user_two_id.
 */
function normalizeUserIdPair(userOneId, userTwoId) {
  if (!userOneId || !userTwoId) {
    throw new Error("Both user IDs are required.");
  }

  if (userOneId === userTwoId) {
    throw new Error(
      "A user cannot connect with themselves."
    );
  }

  return userOneId < userTwoId
    ? {
        userOneId,
        userTwoId,
      }
    : {
        userOneId: userTwoId,
        userTwoId: userOneId,
      };
}

/* =========================================================
   GET PROFILE
========================================================= */

export async function getMessagingProfile(userId) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const {
    data,
    error,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      username,
      email,
      avatar_url,
      bio,
      role,
      school_id,
      is_active
    `)
    .eq("id", userId)
    .eq("is_active", true)
    .maybeSingle();

  throwIfError(
    error,
    "Unable to load user profile."
  );

  return data || null;
}

/* =========================================================
   SEARCH USERS
========================================================= */

export async function searchMessagingUsers({
  currentUserId,
  search = "",
  limit = 20,
}) {
  if (!currentUserId) {
    return [];
  }

  let query = supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      username,
      email,
      avatar_url,
      bio,
      role,
      school_id,
      is_active
    `)
    .eq("is_active", true)
    .neq("id", currentUserId)
    .neq("role", "super_admin")
    .limit(limit);

  const trimmedSearch = search.trim();

  if (trimmedSearch) {
    query = query.or(
      `full_name.ilike.%${trimmedSearch}%,username.ilike.%${trimmedSearch}%`
    );
  }

  const {
    data,
    error,
  } = await query;

  throwIfError(
    error,
    "Unable to search users."
  );

  return data || [];
}

/* =========================================================
   GET REQUEST SUGGESTIONS
========================================================= */

export async function getRequestSuggestions(
  currentUser
) {
  requireUser(currentUser);

  const {
    data: users,
    error: usersError,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      username,
      email,
      avatar_url,
      bio,
      role,
      school_id,
      is_active,
      schools (
        id,
        name,
        code,
        logo_url
      )
    `)
    .eq("is_active", true)
    .neq("id", currentUser.id)
    .neq("role", "super_admin");

  throwIfError(
    usersError,
    "Unable to load people you may know."
  );

  if (!users?.length) {
    return [];
  }

  /* ---------------------------------------------------------
     Existing requests
  --------------------------------------------------------- */

  const {
    data: existingRequests,
    error: requestError,
  } = await supabase
    .from("requests")
    .select(`
      id,
      sender_id,
      receiver_id,
      type,
      status
    `)
    .or(
      `sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`
    );

  throwIfError(
    requestError,
    "Unable to load existing requests."
  );

  /*
   * IMPORTANT:
   *
   * Pending requests exclude the user.
   *
   * Accepted CONNECTION requests exclude the user permanently.
   *
   * Accepted MESSAGE requests DO NOT exclude the user,
   * because the messaging session can expire and a new
   * message request can later be created.
   */

  const excludedUserIds = new Set();

  (existingRequests || []).forEach(
    (request) => {
      const otherUserId =
        request.sender_id === currentUser.id
          ? request.receiver_id
          : request.sender_id;

      if (request.status === "pending") {
        excludedUserIds.add(otherUserId);
      }

      if (
        request.type === "connection" &&
        request.status === "accepted"
      ) {
        excludedUserIds.add(otherUserId);
      }
    }
  );

  /* ---------------------------------------------------------
     Existing permanent connections
  --------------------------------------------------------- */

  const {
    data: connections,
    error: connectionsError,
  } = await supabase
    .from("connections")
    .select(`
      user_one_id,
      user_two_id
    `)
    .or(
      `user_one_id.eq.${currentUser.id},user_two_id.eq.${currentUser.id}`
    );

  throwIfError(
    connectionsError,
    "Unable to load connections."
  );

  const connectedUserIds = new Set();

  (connections || []).forEach(
    (connection) => {
      if (
        connection.user_one_id ===
        currentUser.id
      ) {
        connectedUserIds.add(
          connection.user_two_id
        );
      } else {
        connectedUserIds.add(
          connection.user_one_id
        );
      }
    }
  );

  /* ---------------------------------------------------------
     Filter users according to messaging rules
  --------------------------------------------------------- */

  const requestableUsers = users.filter(
    (targetUser) => {
      if (!targetUser?.id) {
        return false;
      }

      if (
        targetUser.id === currentUser.id
      ) {
        return false;
      }

      if (
        targetUser.role === "super_admin"
      ) {
        return false;
      }

      if (
        excludedUserIds.has(targetUser.id)
      ) {
        return false;
      }

      if (
        connectedUserIds.has(targetUser.id)
      ) {
        return false;
      }

      const rule = getMessagingRule(
        currentUser,
        targetUser
      );

      if (!rule || !rule.allowed) {
        return false;
      }

      return (
        rule.requiresConnection ||
        rule.requiresMessageRequest
      );
    }
  );

  /* ---------------------------------------------------------
     Same school first
  --------------------------------------------------------- */

  const currentSchoolId =
    currentUser.school_id;

  requestableUsers.sort((a, b) => {
    const aSameSchool =
      a.school_id === currentSchoolId;

    const bSameSchool =
      b.school_id === currentSchoolId;

    if (
      aSameSchool &&
      !bSameSchool
    ) {
      return -1;
    }

    if (
      !aSameSchool &&
      bSameSchool
    ) {
      return 1;
    }

    const nameA = (
      a.full_name ||
      a.username ||
      ""
    ).toLowerCase();

    const nameB = (
      b.full_name ||
      b.username ||
      ""
    ).toLowerCase();

    return nameA.localeCompare(nameB);
  });

  return requestableUsers;
}

/* =========================================================
   CONNECTION STATUS
========================================================= */

export async function areUsersConnected(
  userOneId,
  userTwoId
) {
  const {
    userOneId: normalizedOne,
    userTwoId: normalizedTwo,
  } = normalizeUserIdPair(
    userOneId,
    userTwoId
  );

  const {
    data,
    error,
  } = await supabase
    .from("connections")
    .select("id, created_at")
    .eq(
      "user_one_id",
      normalizedOne
    )
    .eq(
      "user_two_id",
      normalizedTwo
    )
    .maybeSingle();

  throwIfError(
    error,
    "Unable to check connection."
  );

  return data || null;
}

export async function getConnectionStatus(
  userOneId,
  userTwoId
) {
  const connection =
    await areUsersConnected(
      userOneId,
      userTwoId
    );

  return {
    connected: Boolean(connection),
    connection,
  };
}

/* =========================================================
   PENDING REQUEST
========================================================= */

export async function getPendingRequest({
  senderId,
  receiverId,
  type,
  direction = "any",
}) {
  if (
    !senderId ||
    !receiverId ||
    !type
  ) {
    throw new Error(
      "Sender, receiver and request type are required."
    );
  }

  let query = supabase
    .from("requests")
    .select(`
      id,
      sender_id,
      receiver_id,
      type,
      status,
      initial_message,
      created_at,
      updated_at
    `)
    .eq("type", type)
    .eq("status", "pending");

  /*
   * Connection requests are effectively symmetric.
   *
   * Message requests are directional.
   */

  if (direction === "outgoing") {
    query = query
      .eq("sender_id", senderId)
      .eq("receiver_id", receiverId);
  } else if (direction === "incoming") {
    query = query
      .eq("sender_id", receiverId)
      .eq("receiver_id", senderId);
  } else {
    query = query.or(
      `and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`
    );
  }

  const {
    data,
    error,
  } = await query
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  throwIfError(
    error,
    "Unable to check pending request."
  );

  return data || null;
}

/* =========================================================
   CREATE CONNECTION REQUEST
========================================================= */

export async function createConnectionRequest({
  currentUser,
  targetUserId,
}) {
  requireUser(currentUser);

  const targetUser =
    await getMessagingProfile(
      targetUserId
    );

  if (!targetUser) {
    throw new Error(
      "The target user could not be found."
    );
  }

  if (
    !canRequestConnection(
      currentUser,
      targetUser
    )
  ) {
    throw new Error(
      "You cannot send a connection request to this user."
    );
  }

  const existingConnection =
    await areUsersConnected(
      currentUser.id,
      targetUser.id
    );

  if (existingConnection) {
    throw new Error(
      "You are already connected with this user."
    );
  }

  const pendingRequest =
    await getPendingRequest({
      senderId: currentUser.id,
      receiverId: targetUser.id,
      type: "connection",
      direction: "any",
    });

  if (pendingRequest) {
    if (
      pendingRequest.sender_id ===
      currentUser.id
    ) {
      throw new Error(
        "You already sent a connection request to this user."
      );
    }

    throw new Error(
      "This user has already sent you a connection request."
    );
  }

  /*
   * Request creation is handled by the
   * SECURITY DEFINER RPC.
   */

  const {
    data,
    error,
  } = await supabase.rpc(
    "create_connection_request",
    {
      p_receiver_id:
        targetUser.id,
    }
  );

  throwIfError(
    error,
    "Unable to send connection request."
  );

  return data;
}

/* =========================================================
   ACCEPT CONNECTION REQUEST
========================================================= */

export async function acceptConnectionRequest(
  requestId
) {
  if (!requestId) {
    throw new Error(
      "Request ID is required."
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "accept_connection_request",
    {
      p_request_id: requestId,
    }
  );

  throwIfError(
    error,
    "Unable to accept connection request."
  );

  return data;
}

/* =========================================================
   REJECT CONNECTION REQUEST
========================================================= */

export async function rejectConnectionRequest(
  requestId
) {
  if (!requestId) {
    throw new Error(
      "Request ID is required."
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "reject_connection_request",
    {
      p_request_id: requestId,
    }
  );

  throwIfError(
    error,
    "Unable to reject connection request."
  );

  return data;
}

/* =========================================================
   CREATE MESSAGE REQUEST
========================================================= */

export async function createMessageRequest({
  currentUser,
  targetUserId,
  initialMessage = "",
}) {
  requireUser(currentUser);

  const targetUser =
    await getMessagingProfile(
      targetUserId
    );

  if (!targetUser) {
    throw new Error(
      "The target user could not be found."
    );
  }

  if (
    !canRequestMessage(
      currentUser,
      targetUser
    )
  ) {
    throw new Error(
      "You cannot send a message request to this user."
    );
  }

  const pendingRequest =
    await getPendingRequest({
      senderId: currentUser.id,
      receiverId: targetUser.id,
      type: "message",
      direction: "outgoing",
    });

  if (pendingRequest) {
    throw new Error(
      "You already sent a message request to this user."
    );
  }

  const cleanMessage =
    initialMessage?.trim() || null;

  if (
    cleanMessage &&
    cleanMessage.length > 1000
  ) {
    throw new Error(
      "The initial message cannot exceed 1000 characters."
    );
  }

  /*
   * The database RPC checks:
   *
   * student -> teacher/admin
   * active users
   * no super admin
   * no active session
   * no duplicate pending request
   */

  const {
    data,
    error,
  } = await supabase.rpc(
    "create_message_request",
    {
      p_receiver_id:
        targetUser.id,

      p_initial_message:
        cleanMessage,
    }
  );

  throwIfError(
    error,
    "Unable to send message request."
  );

  return data;
}

/* =========================================================
   ACCEPT MESSAGE REQUEST
========================================================= */

export async function acceptMessageRequest(
  requestId
) {
  if (!requestId) {
    throw new Error(
      "Request ID is required."
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "accept_message_request",
    {
      p_request_id: requestId,
    }
  );

  throwIfError(
    error,
    "Unable to accept message request."
  );

  return data;
}

/* =========================================================
   REJECT MESSAGE REQUEST
========================================================= */

export async function rejectMessageRequest(
  requestId
) {
  if (!requestId) {
    throw new Error(
      "Request ID is required."
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "reject_message_request",
    {
      p_request_id: requestId,
    }
  );

  throwIfError(
    error,
    "Unable to reject message request."
  );

  return data;
}

/* =========================================================
   CANCEL REQUEST
========================================================= */

export async function cancelRequest(
  requestId
) {
  if (!requestId) {
    throw new Error(
      "Request ID is required."
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "cancel_request",
    {
      p_request_id: requestId,
    }
  );

  throwIfError(
    error,
    "Unable to cancel request."
  );

  return data;
}

/* =========================================================
   ACTIVE MESSAGE SESSION
========================================================= */

export async function hasActiveMessagingSession(
  userOneId,
  userTwoId
) {
  if (
    !userOneId ||
    !userTwoId
  ) {
    return false;
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "has_active_messaging_session",
    {
      p_user_id: userOneId,
      p_other_user_id: userTwoId,
    }
  );

  throwIfError(
    error,
    "Unable to check messaging session."
  );

  return Boolean(data);
}

export async function getActiveMessagingSession(
  userOneId,
  userTwoId
) {
  if (
    !userOneId ||
    !userTwoId
  ) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from("messaging_sessions")
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
    .eq("is_active", true)
    .gt(
      "expires_at",
      new Date().toISOString()
    )
    .or(
      `and(requester_id.eq.${userOneId},receiver_id.eq.${userTwoId}),and(requester_id.eq.${userTwoId},receiver_id.eq.${userOneId})`
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  throwIfError(
    error,
    "Unable to load messaging session."
  );

  return data || null;
}

/* =========================================================
   CREATE PRIVATE CONVERSATION
========================================================= */

export async function createPrivateConversation({
  currentUser,
  targetUserId,
}) {
  requireUser(currentUser);

  const targetUser =
    await getMessagingProfile(
      targetUserId
    );

  if (!targetUser) {
    throw new Error(
      "Target user was not found."
    );
  }

  const rule =
    getMessagingRule(
      currentUser,
      targetUser
    );

  if (!rule?.allowed) {
    throw new Error(
      rule?.reason ||
        "Messaging is not available between these users."
    );
  }

  /* Student <-> Student or staff <-> staff */

  if (rule.requiresConnection) {
    const connected =
      await areUsersConnected(
        currentUser.id,
        targetUser.id
      );

    if (!connected) {
      throw new Error(
        "An accepted connection is required before messaging."
      );
    }
  }

  /* Student -> Teacher/Admin */

  if (rule.requiresMessageRequest) {
    const activeSession =
      await hasActiveMessagingSession(
        currentUser.id,
        targetUser.id
      );

    if (!activeSession) {
      throw new Error(
        "An accepted message request with an active messaging session is required."
      );
    }
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "create_private_conversation",
    {
      p_receiver_id:
        targetUser.id,
    }
  );

  throwIfError(
    error,
    "Unable to create private conversation."
  );

  return data;
}

/* =========================================================
   REALTIME MESSAGE SUBSCRIPTION
========================================================= */

export function subscribeToUserMessages({
  currentUserId,
  onInsert,
  onUpdate,
  onDelete,
  onStatusChange,
}) {
  if (!currentUserId) {
    return () => {};
  }

  const channel = supabase
    .channel(`user-messages:${currentUserId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        onInsert?.(payload.new, payload);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        onUpdate?.(payload.new, payload);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        onDelete?.(payload.old, payload);
      }
    )
    .subscribe((status, error) => {
      if (error) {
        console.error("Realtime messaging subscription error:", error);
      }
      onStatusChange?.(status, error || null);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/* =========================================================
   GET USER CONVERSATIONS
========================================================= */

export async function getUserConversations(
  userId
) {
  if (!userId) {
    return [];
  }

  const {
    data: memberships,
    error: membershipError,
  } = await supabase
    .from("conversation_members")
    .select(`
      id,
      conversation_id,
      user_id,
      role,
      joined_at,
      last_read_at,
      is_muted,
      is_active
    `)
    .eq("user_id", userId)
    .eq("is_active", true);

  throwIfError(
    membershipError,
    "Unable to load conversation memberships."
  );

  if (!memberships?.length) {
    return [];
  }

  const conversationIds =
    memberships.map(
      (membership) =>
        membership.conversation_id
    );

  const {
    data: conversations,
    error,
  } = await supabase
    .from("conversations")
    .select(`
      id,
      participant_one_id,
      participant_two_id,
      created_at,
      updated_at,
      type,
      name,
      description,
      avatar_url,
      created_by
    `)
    .in("id", conversationIds)
    .eq("type", "direct")
    .order("updated_at", {
      ascending: false,
    });

  throwIfError(
    error,
    "Unable to load conversations."
  );

  if (!conversations?.length) {
    return [];
  }

  const otherUserIds = conversations.map(
    (conversation) =>
      conversation.participant_one_id ===
      userId
        ? conversation.participant_two_id
        : conversation.participant_one_id
  );

  const uniqueUserIds = [
    ...new Set(otherUserIds),
  ];

  const {
    data: profiles,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      username,
      avatar_url,
      role,
      school_id,
      is_active
    `)
    .in("id", uniqueUserIds);

  throwIfError(
    profileError,
    "Unable to load conversation users."
  );

  const profileMap = new Map(
    (profiles || []).map(
      (profile) => [
        profile.id,
        profile,
      ]
    )
  );

  const {
    data: messages,
    error: messagesError,
  } = await supabase
    .from("messages")
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
    .in(
      "conversation_id",
      conversationIds
    )
    .order("created_at", {
      ascending: false,
    });

  throwIfError(
    messagesError,
    "Unable to load conversation messages."
  );

  const latestMessageMap =
    new Map();

  for (
    const message of messages || []
  ) {
    if (
      !latestMessageMap.has(
        message.conversation_id
      )
    ) {
      latestMessageMap.set(
        message.conversation_id,
        message
      );
    }
  }

  const unreadCounts = new Map();

  for (
    const membership of memberships
  ) {
    const lastRead = membership.last_read_at
      ? new Date(
          membership.last_read_at
        ).getTime()
      : 0;

    const conversationMessages =
      (messages || []).filter(
        (message) =>
          message.conversation_id ===
            membership.conversation_id &&
          message.sender_id !== userId &&
          !message.is_deleted &&
          new Date(
            message.created_at
          ).getTime() > lastRead
      );

    unreadCounts.set(
      membership.conversation_id,
      conversationMessages.length
    );
  }

  return conversations.map(
    (conversation) => {
      const otherUserId =
        conversation.participant_one_id ===
        userId
          ? conversation.participant_two_id
          : conversation.participant_one_id;

      return {
        ...conversation,
        otherUser:
          profileMap.get(
            otherUserId
          ) || null,
        lastMessage:
          latestMessageMap.get(
            conversation.id
          ) || null,
        unreadCount:
          unreadCounts.get(
            conversation.id
          ) || 0,
      };
    }
  );
}

/* =========================================================
   GET CONVERSATION MESSAGES
========================================================= */

export async function getConversationMessages({
  conversationId,
  currentUserId,
}) {
  if (!conversationId || !currentUserId) {
    throw new Error("Conversation and user are required.");
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, participant_one_id, participant_two_id, type")
    .eq("id", conversationId)
    .eq("type", "direct")
    .maybeSingle();

  throwIfError(conversationError, "Unable to verify conversation.");

  if (!conversation) {
    throw new Error("Conversation could not be found.");
  }

  const isParticipant =
    conversation.participant_one_id === currentUserId ||
    conversation.participant_two_id === currentUserId;

  if (!isParticipant) {
    throw new Error("You are not a participant in this conversation.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("conversation_members")
    .select("id,is_active")
    .eq("conversation_id", conversationId)
    .eq("user_id", currentUserId)
    .eq("is_active", true)
    .maybeSingle();

  throwIfError(membershipError, "Unable to verify conversation access.");

  if (!membership) {
    throw new Error("You are not a member of this conversation.");
  }

  const { data, error } = await supabase
    .from("messages")
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
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  throwIfError(error, "Unable to load messages.");

  return data || [];
}

/* =========================================================
   SEND MESSAGE
========================================================= */

export async function sendMessage({
  currentUser,
  conversationId,
  targetUserId,
  content = "",
  mediaUrl = null,
  mediaType = null,
}) {
  requireUser(currentUser);

  if (!conversationId) {
    throw new Error(
      "Conversation ID is required."
    );
  }

  if (!targetUserId) {
    throw new Error(
      "Recipient is required."
    );
  }

  const cleanContent =
    content?.trim() || null;

  if (
    !cleanContent &&
    !mediaUrl
  ) {
    throw new Error(
      "A message must contain text or media."
    );
  }

  if (
    cleanContent &&
    cleanContent.length > 2000
  ) {
    throw new Error(
      "Message cannot exceed 2000 characters."
    );
  }

  const targetUser =
    await getMessagingProfile(
      targetUserId
    );

  if (!targetUser) {
    throw new Error(
      "Recipient could not be found."
    );
  }

  const rule =
    getMessagingRule(
      currentUser,
      targetUser
    );

  if (!rule?.allowed) {
    throw new Error(
      rule?.reason ||
        "You cannot message this user."
    );
  }

  /* Connection required */

  if (rule.requiresConnection) {
    const connection =
      await areUsersConnected(
        currentUser.id,
        targetUser.id
      );

    if (!connection) {
      throw new Error(
        "You must be connected before sending messages."
      );
    }
  }

  /* Temporary message session */

  if (rule.requiresMessageRequest) {
    const activeSession =
      await hasActiveMessagingSession(
        currentUser.id,
        targetUser.id
      );

    if (!activeSession) {
      throw new Error(
        "Your messaging session has expired. Send a new message request."
      );
    }
  }

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("conversation_members")
    .select("id")
    .eq(
      "conversation_id",
      conversationId
    )
    .eq(
      "user_id",
      currentUser.id
    )
    .eq("is_active", true)
    .maybeSingle();

  throwIfError(
    membershipError,
    "Unable to verify conversation membership."
  );

  if (!membership) {
    throw new Error(
      "You are not a member of this conversation."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("messages")
    .insert({
      conversation_id:
        conversationId,

      sender_id:
        currentUser.id,

      content:
        cleanContent,

      media_url:
        mediaUrl,

      media_type:
        mediaType,

      is_deleted: false,
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

  throwIfError(
    error,
    "Unable to send message."
  );

  const {
    error: updateError,
  } = await supabase
    .from("conversations")
    .update({
      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      conversationId
    );

  throwIfError(
    updateError,
    "Message was sent, but conversation activity could not be updated."
  );

  return data;
}

/* =========================================================
   MARK CONVERSATION AS READ
========================================================= */

export async function markConversationAsRead({
  conversationId,
  currentUserId,
}) {
  if (
    !conversationId ||
    !currentUserId
  ) {
    return false;
  }

  const {
    error,
  } = await supabase
    .from("conversation_members")
    .update({
      last_read_at:
        new Date().toISOString(),
    })
    .eq(
      "conversation_id",
      conversationId
    )
    .eq(
      "user_id",
      currentUserId
    )
    .eq("is_active", true);

  throwIfError(
    error,
    "Unable to mark conversation as read."
  );

  return true;
}

/* =========================================================
   DELETE MESSAGE
========================================================= */

export async function deleteMessage({
  messageId,
  currentUserId,
}) {
  if (
    !messageId ||
    !currentUserId
  ) {
    throw new Error(
      "Message and user are required."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("messages")
    .update({
      is_deleted: true,
    })
    .eq("id", messageId)
    .eq(
      "sender_id",
      currentUserId
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
    .single();

  throwIfError(
    error,
    "Unable to delete message."
  );

  return data;
}

/* =========================================================
   GET MESSAGING STATE
========================================================= */

export async function getMessagingState({
  currentUser,
  targetUserId,
}) {
  requireUser(currentUser);

  const targetUser = await getMessagingProfile(targetUserId);

  if (!targetUser) {
    throw new Error("Target user could not be found.");
  }

  const rule = getMessagingRule(currentUser, targetUser);

  if (!rule?.allowed) {
    return {
      rule,
      targetUser,
      connected: false,
      activeSession: null,
      sessionExpired: false,
      pendingRequest: null,
      pendingRequestDirection: null,
      canMessage: false,
      status: "blocked",
    };
  }

  let connected = false;
  let activeSession = null;
  let sessionExpired = false;
  let pendingRequest = null;
  let pendingRequestDirection = null;

  if (rule.requiresConnection) {
    connected = Boolean(
      await areUsersConnected(currentUser.id, targetUser.id)
    );

    if (connected) {
      return {
        rule,
        targetUser,
        connected: true,
        activeSession: null,
        sessionExpired: false,
        pendingRequest: null,
        pendingRequestDirection: null,
        canMessage: true,
        status: "connected",
      };
    }

    pendingRequest = await getPendingRequest({
      senderId: currentUser.id,
      receiverId: targetUser.id,
      type: "connection",
      direction: "any",
    });

    if (pendingRequest) {
      pendingRequestDirection =
        pendingRequest.sender_id === currentUser.id
          ? "outgoing"
          : "incoming";
    }
  }

  if (rule.requiresMessageRequest) {
    activeSession = await getActiveMessagingSession(
      currentUser.id,
      targetUser.id
    );

    if (activeSession) {
      return {
        rule,
        targetUser,
        connected: false,
        activeSession,
        sessionExpired: false,
        pendingRequest: null,
        pendingRequestDirection: null,
        canMessage: true,
        status: "session_active",
      };
    }

    const { data: previousSession, error: previousSessionError } =
      await supabase
        .from("messaging_sessions")
        .select("id, requester_id, receiver_id, conversation_id, started_at, expires_at, duration_hours, is_active, created_at")
        .or(
          `and(requester_id.eq.${currentUser.id},receiver_id.eq.${targetUser.id}),and(requester_id.eq.${targetUser.id},receiver_id.eq.${currentUser.id})`
        )
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    throwIfError(
      previousSessionError,
      "Unable to check previous messaging sessions."
    );

    sessionExpired = Boolean(
      previousSession &&
      previousSession.expires_at &&
      new Date(previousSession.expires_at).getTime() <= Date.now()
    );

    pendingRequest = await getPendingRequest({
      senderId: currentUser.id,
      receiverId: targetUser.id,
      type: "message",
      direction: "outgoing",
    });

    if (pendingRequest) {
      pendingRequestDirection = "outgoing";
    }

    if (!pendingRequest) {
      const incomingRequest = await getPendingRequest({
        senderId: currentUser.id,
        receiverId: targetUser.id,
        type: "message",
        direction: "incoming",
      });

      if (incomingRequest) {
        pendingRequest = incomingRequest;
        pendingRequestDirection = "incoming";
      }
    }

    return {
      rule,
      targetUser,
      connected: false,
      activeSession: null,
      sessionExpired,
      pendingRequest,
      pendingRequestDirection,
      canMessage: false,
      status: pendingRequest
        ? "request_pending"
        : sessionExpired
          ? "session_expired"
          : "request_required",
    };
  }

  if (rule.canMessage) {
    return {
      rule,
      targetUser,
      connected: false,
      activeSession: null,
      sessionExpired: false,
      pendingRequest: null,
      pendingRequestDirection: null,
      canMessage: true,
      status: "direct",
    };
  }

  return {
    rule,
    targetUser,
    connected,
    activeSession,
    sessionExpired,
    pendingRequest,
    pendingRequestDirection,
    canMessage: false,
    status: pendingRequest
      ? "request_pending"
      : rule.requiresConnection
        ? "connection_required"
        : "unavailable",
  };
}
