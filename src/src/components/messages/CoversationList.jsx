import React, { useMemo } from "react";
import {
  Search,
  MessageCircle,
  Loader2,
  User,
} from "lucide-react";

export default function ConversationList({
  conversations = [],
  activeConversationId = null,
  searchText = "",
  onSearchChange,
  onSelectConversation,
  loading = false,
}) {
  const filteredConversations = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const name =
        conversation?.otherUser?.full_name ||
        conversation?.otherUser?.username ||
        conversation?.name ||
        "";

      const lastMessage = conversation?.lastMessage?.content || "";

      return (
        name.toLowerCase().includes(query) ||
        lastMessage.toLowerCase().includes(query)
      );
    });
  }, [conversations, searchText]);

  const formatMessageTime = (date) => {
    if (!date) return "";

    const messageDate = new Date(date);

    if (Number.isNaN(messageDate.getTime())) {
      return "";
    }

    const now = new Date();

    const sameDay =
      messageDate.toDateString() === now.toDateString();

    if (sameDay) {
      return messageDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return messageDate.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex h-full w-full flex-col bg-white">
      {/* Header & Search (if search handlers are passed) */}
      {(onSearchChange || searchText) && (
        <div className="border-b border-gray-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Messages
              </h2>
              <p className="text-xs text-gray-500">
                Your conversations
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-50 text-purple-600 ring-2 ring-purple-500/10">
              <MessageCircle size={18} />
            </div>
          </div>

          <div className="relative">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400"
            />
            <input
              type="text"
              value={searchText}
              onChange={(event) =>
                onSearchChange?.(event.target.value)
              }
              placeholder="Search conversations..."
              className="w-full rounded-2xl border border-transparent bg-purple-50/50 py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-2 focus:ring-purple-100 placeholder:text-gray-400"
            />
          </div>
        </div>
      )}

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-full min-h-40 items-center justify-center py-8">
            <Loader2
              size={24}
              className="animate-spin text-purple-600"
            />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex min-h-60 flex-col items-center justify-center px-6 py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-purple-600 ring-2 ring-purple-500/20">
              <MessageCircle size={22} />
            </div>

            <h3 className="text-sm font-bold text-gray-900">
              {searchText
                ? "No conversations found"
                : "No conversations yet"}
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              {searchText
                ? "Try another search term."
                : "Start a conversation with someone."}
            </p>
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const otherUser = conversation?.otherUser || {};

            const displayName =
              otherUser.full_name ||
              otherUser.username ||
              conversation.name ||
              "Unknown user";

            const avatar =
              otherUser.avatar_url ||
              conversation.avatar_url ||
              null;

            const isActive =
              conversation.id === activeConversationId;

            const unreadCount =
              Number(conversation.unreadCount) || 0;

            const lastMessage =
              conversation?.lastMessage?.content ||
              "";

            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() =>
                  onSelectConversation?.(conversation)
                }
                className={`flex w-full items-center gap-3.5 border-b border-gray-100/60 px-4 py-3.5 text-left transition ${
                  isActive
                    ? "bg-purple-50/80 border-l-4 border-l-purple-600"
                    : "hover:bg-purple-50/40"
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={displayName}
                      className="h-12 w-12 rounded-full object-cover ring-2 ring-purple-500/20"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600 ring-2 ring-purple-500/20">
                      <User size={20} />
                    </div>
                  )}

                  {conversation.isOnline && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 ring-1 ring-emerald-400" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={`truncate text-sm ${
                        unreadCount > 0
                          ? "font-bold text-gray-900"
                          : isActive
                          ? "font-semibold text-purple-900"
                          : "font-medium text-gray-900"
                      }`}
                    >
                      {displayName}
                    </h3>

                    <span
                      className={`shrink-0 text-[11px] ${
                        unreadCount > 0
                          ? "font-semibold text-purple-600"
                          : "text-gray-400"
                      }`}
                    >
                      {formatMessageTime(
                        conversation?.lastMessage?.created_at ||
                          conversation?.updated_at
                      )}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p
                      className={`truncate text-xs ${
                        unreadCount > 0
                          ? "font-semibold text-gray-900"
                          : "text-gray-500"
                      }`}
                    >
                      {lastMessage || "No messages yet"}
                    </p>

                    {unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 px-1.5 text-[10px] font-bold text-white shadow-xs">
                        {unreadCount > 99
                          ? "99+"
                          : unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}