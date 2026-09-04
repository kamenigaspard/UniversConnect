// ============================================================
// MessagesPage.jsx
// ============================================================
// This page handles:
// 1. Displaying the user's conversations
// 2. Searching for other users
// 3. Starting a private conversation
// 4. Sending messages
// 5. Displaying messages in the selected conversation
//
// IMPORTANT:
// The database function create_private_conversation()
// controls whether the user is allowed to start the conversation.
// ============================================================

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  Search,
  Send,
  MessageCircle,
  ArrowLeft,
  User,
  Loader2,
  AlertCircle,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";


// ============================================================
// MAIN COMPONENT
// ============================================================

export default function MessagesPage() {

  // ----------------------------------------------------------
  // Get the authenticated user.
  // ----------------------------------------------------------

  const { user, profile } = useAuth();

  // ----------------------------------------------------------
  // Read URL parameters.
  //
  // Example:
  //
  // /messages?user=USER_ID
  //
  // This allows another page, such as RequestsPage,
  // to open a conversation with a specific user.
  // ----------------------------------------------------------

  const [searchParams, setSearchParams] = useSearchParams();

  const userFromUrl = searchParams.get("user");


  // ==========================================================
  // STATE
  // ==========================================================

  // List of existing conversations.
  const [conversations, setConversations] = useState([]);

  // Currently selected conversation.
  const [activeConversation, setActiveConversation] = useState(null);

  // Messages belonging to the active conversation.
  const [messages, setMessages] = useState([]);

  // Message currently being typed.
  const [messageText, setMessageText] = useState("");

  // Search text for finding users.
  const [searchText, setSearchText] = useState("");

  // Search results.
  const [searchResults, setSearchResults] = useState([]);

  // Loading states.
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);

  // General error message.
  const [error, setError] = useState("");

  // User that requires an accepted request.
  const [requestUser, setRequestUser] = useState(null);

  // Text that will accompany a message request.
  const [requestMessage, setRequestMessage] = useState("");

  // Whether a request is currently being sent.
  const [sendingRequest, setSendingRequest] = useState(false);


  // ==========================================================
  // LOAD CONVERSATIONS
  // ==========================================================

  useEffect(() => {

    if (!user) {
      return;
    }

    loadConversations();

  }, [user]);


  // ==========================================================
  // LOAD CONVERSATIONS FUNCTION
  // ==========================================================

  async function loadConversations() {

    try {

      setLoadingConversations(true);
      setError("");

      // ------------------------------------------------------
      // Get all active conversation memberships belonging
      // to the current user.
      // ------------------------------------------------------

      const { data: memberships, error: membershipError } =
        await supabase
          .from("conversation_members")
          .select(`
            conversation_id,
            last_read_at,
            is_muted
          `)
          .eq("user_id", user.id)
          .eq("is_active", true);

      if (membershipError) {
        throw membershipError;
      }

      // No conversations yet.
      if (!memberships || memberships.length === 0) {

        setConversations([]);

        return;
      }


      // ------------------------------------------------------
      // Extract conversation IDs.
      // ------------------------------------------------------

      const conversationIds =
        memberships.map((item) => item.conversation_id);


      // ------------------------------------------------------
      // Load the conversations.
      // ------------------------------------------------------

      const { data: conversationRows, error: conversationError } =
        await supabase
          .from("conversations")
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
          .in("id", conversationIds)
          .order("updated_at", {
            ascending: false,
          });

      if (conversationError) {
        throw conversationError;
      }


      // ------------------------------------------------------
      // Find the other participant for every conversation.
      // ------------------------------------------------------

      const otherUserIds = conversationRows
        .map((conversation) => {

          if (
            conversation.participant_one_id === user.id
          ) {
            return conversation.participant_two_id;
          }

          return conversation.participant_one_id;

        })
        .filter(Boolean);


      // ------------------------------------------------------
      // Remove duplicate user IDs.
      // ------------------------------------------------------

      const uniqueUserIds = [...new Set(otherUserIds)];


      // ------------------------------------------------------
      // Load profiles of conversation participants.
      // ------------------------------------------------------

      let profileRows = [];

      if (uniqueUserIds.length > 0) {

        const { data, error: profileError } =
          await supabase
            .from("profiles")
            .select(`
              id,
              full_name,
              username,
              avatar_url,
              role,
              school_id
            `)
            .in("id", uniqueUserIds);

        if (profileError) {
          throw profileError;
        }

        profileRows = data || [];
      }


      // ------------------------------------------------------
      // Combine conversations with participant profiles.
      // ------------------------------------------------------

      const formattedConversations =
        conversationRows.map((conversation) => {

          const otherUserId =
            conversation.participant_one_id === user.id
              ? conversation.participant_two_id
              : conversation.participant_one_id;

          const otherProfile =
            profileRows.find(
              (item) => item.id === otherUserId
            );

          return {
            ...conversation,
            otherUser: otherProfile || null,
          };

        });


      setConversations(formattedConversations);

    } catch (err) {

      console.error(
        "Error loading conversations:",
        err
      );

      setError(
        err.message ||
        "Unable to load your conversations."
      );

    } finally {

      setLoadingConversations(false);
    }
  }


  // ==========================================================
  // LOAD MESSAGES
  // ==========================================================

  async function loadMessages(conversation) {

    if (!conversation) {
      return;
    }

    try {

      setLoadingMessages(true);
      setError("");

      const { data, error: messageError } =
        await supabase
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
          .eq(
            "conversation_id",
            conversation.id
          )
          .order("created_at", {
            ascending: true,
          });

      if (messageError) {
        throw messageError;
      }


      // ------------------------------------------------------
      // Do not display soft-deleted messages as normal text.
      // ------------------------------------------------------

      setMessages(data || []);


      // ------------------------------------------------------
      // Mark the conversation as read.
      // ------------------------------------------------------

      await supabase
        .from("conversation_members")
        .update({
          last_read_at: new Date().toISOString(),
        })
        .eq("conversation_id", conversation.id)
        .eq("user_id", user.id);

    } catch (err) {

      console.error(
        "Error loading messages:",
        err
      );

      setError(
        err.message ||
        "Unable to load messages."
      );

    } finally {

      setLoadingMessages(false);
    }
  }


  // ==========================================================
  // SELECT CONVERSATION
  // ==========================================================

  async function selectConversation(conversation) {

    setActiveConversation(conversation);

    // Clear any previous request notice.
    setRequestUser(null);

    await loadMessages(conversation);
  }


  // ==========================================================
  // SEARCH USERS
  // ==========================================================

  async function searchUsers(value) {

    setSearchText(value);

    // Clear results when search is empty.
    if (!value.trim()) {

      setSearchResults([]);

      return;
    }

    try {

      setSearching(true);
      setError("");

      const searchTerm =
        value.trim();


      const { data, error: searchError } =
        await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            username,
            avatar_url,
            role,
            school_id
          `)
          .neq("id", user.id)
          .eq("is_active", true)
          .neq("role", "super_admin")
          .or(
            `full_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`
          )
          .limit(10);

      if (searchError) {
        throw searchError;
      }

      setSearchResults(data || []);

    } catch (err) {

      console.error(
        "User search error:",
        err
      );

      setError(
        err.message ||
        "Unable to search users."
      );

    } finally {

      setSearching(false);
    }
  }


  // ==========================================================
  // START PRIVATE CONVERSATION
  // ==========================================================

  async function startConversation(selectedUser) {

    try {

      setError("");
      setRequestUser(null);

      // ------------------------------------------------------
      // Call the PostgreSQL function we created earlier.
      //
      // The function decides whether messaging is allowed.
      // ------------------------------------------------------

      const {
        data: conversationId,
        error: conversationError,
      } = await supabase.rpc(
        "create_private_conversation",
        {
          p_receiver_id: selectedUser.id,
        }
      );


      // ------------------------------------------------------
      // If the database rejects the conversation because an
      // accepted request is required, show the request UI.
      // ------------------------------------------------------

      if (conversationError) {

        if (
          conversationError.message?.includes(
            "accepted request is required"
          )
        ) {

          setRequestUser(selectedUser);

          return;
        }

        throw conversationError;
      }


      // ------------------------------------------------------
      // Find the newly opened conversation in our list.
      // ------------------------------------------------------

      await loadConversations();


      const { data: conversation, error: fetchError } =
        await supabase
          .from("conversations")
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
          .eq("id", conversationId)
          .single();


      if (fetchError) {
        throw fetchError;
      }


      // ------------------------------------------------------
      // Attach the selected user's profile.
      // ------------------------------------------------------

      const completeConversation = {
        ...conversation,
        otherUser: selectedUser,
      };


      setActiveConversation(
        completeConversation
      );

      await loadMessages(
        completeConversation
      );


      // ------------------------------------------------------
      // Clear search.
      // ------------------------------------------------------

      setSearchText("");
      setSearchResults([]);

      // Remove ?user= from the URL.
      setSearchParams({});

    } catch (err) {

      console.error(
        "Start conversation error:",
        err
      );

      setError(
        err.message ||
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

    try {

      setSendingRequest(true);
      setError("");

      // ------------------------------------------------------
      // Check whether a pending request already exists.
      // ------------------------------------------------------

      const {
        data: existingRequest,
        error: existingError,
      } = await supabase
        .from("requests")
        .select("id")
        .eq("sender_id", user.id)
        .eq("receiver_id", requestUser.id)
        .eq("status", "pending")
        .limit(1);

      if (existingError) {
        throw existingError;
      }


      // ------------------------------------------------------
      // Don't create duplicate requests.
      // ------------------------------------------------------

      if (
        existingRequest &&
        existingRequest.length > 0
      ) {

        setError(
          "You already have a pending request with this user."
        );

        return;
      }


      // ------------------------------------------------------
      // Create the message request.
      // ------------------------------------------------------

      const { error: requestError } =
        await supabase
          .from("requests")
          .insert({
            sender_id: user.id,
            receiver_id: requestUser.id,
            type: "message",
            status: "pending",
            initial_message:
              requestMessage.trim() || null,
          });

      if (requestError) {
        throw requestError;
      }


      // ------------------------------------------------------
      // Request successfully created.
      // ------------------------------------------------------

      setRequestMessage("");

      setError(
        "Message request sent successfully."
      );

      setRequestUser(null);

    } catch (err) {

      console.error(
        "Send request error:",
        err
      );

      setError(
        err.message ||
        "Unable to send message request."
      );

    } finally {

      setSendingRequest(false);
    }
  }


  // ==========================================================
  // SEND MESSAGE
  // ==========================================================

  async function sendMessage(event) {

    event.preventDefault();

    // Don't send empty messages.
    if (!messageText.trim()) {
      return;
    }

    // No active conversation.
    if (!activeConversation) {
      return;
    }

    try {

      setSending(true);
      setError("");


      // ------------------------------------------------------
      // Insert the message.
      // ------------------------------------------------------

      const { data: newMessage, error: messageError } =
        await supabase
          .from("messages")
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
      // Add the new message immediately to the UI.
      //
      // This gives the user an instant response while
      // Realtime will be added later.
      // ------------------------------------------------------

      setMessages((previousMessages) => [
        ...previousMessages,
        newMessage,
      ]);


      // ------------------------------------------------------
      // Update conversation timestamp.
      // ------------------------------------------------------

      await supabase
        .from("conversations")
        .update({
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          activeConversation.id
        );


      // Clear the input.
      setMessageText("");

    } catch (err) {

      console.error(
        "Send message error:",
        err
      );

      setError(
        err.message ||
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

    if (!userFromUrl || !user) {
      return;
    }

    async function openUserFromUrl() {

      try {

        const { data: selectedUser, error: userError } =
          await supabase
            .from("profiles")
            .select(`
              id,
              full_name,
              username,
              avatar_url,
              role,
              school_id
            `)
            .eq("id", userFromUrl)
            .single();

        if (userError) {
          throw userError;
        }

        await startConversation(
          selectedUser
        );

      } catch (err) {

        console.error(
          "URL conversation error:",
          err
        );

        setError(
          err.message ||
          "Unable to open this conversation."
        );
      }
    }

    openUserFromUrl();

  }, [userFromUrl, user]);


  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  function formatTime(date) {

    if (!date) {
      return "";
    }

    return new Date(date).toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }


  // ==========================================================
  // ROLE LABEL
  // ==========================================================

  function roleLabel(role) {

    if (!role) {
      return "";
    }

    return role
      .replace("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }


  // ==========================================================
  // LOADING SCREEN
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
            ${activeConversation ? "hidden md:flex" : "flex"}
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


                {searchResults.map((person) => (

                  <button
                    key={person.id}
                    onClick={() =>
                      startConversation(person)
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
                        src={person.avatar_url}
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


                    <div>

                      <p className="font-medium">
                        {person.full_name}
                      </p>

                      <p className="text-xs text-gray-500">
                        @{person.username || "user"}
                        {" · "}
                        {roleLabel(person.role)}
                      </p>

                    </div>

                  </button>

                ))}

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
                    Search for someone above to start
                    a conversation.
                  </p>

                </div>

              )}


            {conversations.map((conversation) => (

              <button
                key={conversation.id}
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

                {conversation.otherUser?.avatar_url ? (

                  <img
                    src={
                      conversation.otherUser.avatar_url
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
                        conversation.otherUser
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
                      conversation.otherUser
                        ?.username ||
                      "user"
                    }

                  </p>

                </div>

              </button>

            ))}

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
                  Select a conversation or search for
                  someone to start messaging.
                </p>

              </div>

            </div>

          ) : (

            <>

              {/* Chat header */}

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
                  className="md:hidden"
                  onClick={() =>
                    setActiveConversation(null)
                  }
                >
                  <ArrowLeft />
                </button>


                {activeConversation.otherUser
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


                <div>

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

              </header>


              {/* Error / information */}

              {error && (

                <div
                  className="
                    mx-4
                    mt-3
                    p-3
                    rounded-xl
                    bg-blue-50
                    text-blue-700
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


              {/* Messages */}

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


                {messages.map((message) => {

                  const isMine =
                    message.sender_id === user.id;

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

                })}

              </div>


              {/* Message composer */}

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

            <p className="text-gray-600 mt-2">

              You need an accepted request before
              messaging{" "}

              <strong>
                {requestUser.full_name}
              </strong>.

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
                onClick={() =>
                  setRequestUser(null)
                }
                className="
                  flex-1
                  px-4
                  py-2.5
                  rounded-xl
                  border
                "
              >
                Cancel
              </button>


              <button
                onClick={sendMessageRequest}
                disabled={sendingRequest}
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