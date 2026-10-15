import React, { useMemo, useState } from "react";
import { Search, MessageCircle, Loader2, User } from "lucide-react";

export default function ConversationList({
  conversations = [],
  activeConversationId = null,
  searchText: externalSearchText,
  onSearchChange: externalOnSearchChange,
  onSelectConversation,
  loading = false,
}) {
  // allow internal search if parent doesn't control it
  const [internalSearch, setInternalSearch] = useState("");
  const isControlled = typeof externalSearchText === "string" && typeof externalOnSearchChange === "function";
  const searchText = isControlled? externalSearchText : internalSearch;
  const onSearchChange = isControlled? externalOnSearchChange : setInternalSearch;

  const filteredConversations = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((c) => {
      const name = c?.otherUser?.full_name || c?.otherUser?.username || c?.name || "";
      const last = c?.lastMessage?.content || "";
      return name.toLowerCase().includes(query) || last.toLowerCase().includes(query);
    });
  }, [conversations, searchText]);

  const formatMessageTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="border-b border-gray-100 p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search"
            className="w-full rounded-xl border border-transparent bg-gray-100 py-2 pl-10 pr-3 text-sm outline-none placeholder:text-gray-400 focus:border-purple-300 focus:bg-white focus:ring-2 focus:ring-purple-100"
          />
        </div>
      </div>

      <div className="flex-1">
        {loading? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={22} className="animate-spin text-purple-600" />
          </div>
        ) : filteredConversations.length === 0? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-purple-600">
              <MessageCircle size={22} />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">{searchText? "No results" : "No conversations"}</h3>
            <p className="mt-1 text-xs text-gray-500">{searchText? `No match for "${searchText}"` : "Search for people to start chatting."}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100/60">
            {filteredConversations.map((conversation) => {
              const otherUser = conversation?.otherUser || {};
              const displayName = otherUser.full_name || otherUser.username || conversation.name || "Unknown";
              const avatar = otherUser.avatar_url || null;
              const isActive = conversation.id === activeConversationId;
              const unreadCount = Number(conversation.unreadCount) || 0;
              const lastMessage = conversation?.lastMessage?.content || (conversation?.lastMessage?.media_url? "📷 Media" : "No messages yet");

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => onSelectConversation?.(conversation)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${isActive? "bg-purple-50" : "hover:bg-gray-50"}`}
                >
                  <div className="relative shrink-0">
                    {avatar? <img src={avatar} alt={displayName} className="h-11 w-11 rounded-full object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-100 text-purple-600"><User size={18} /></div>}
                    {isActive && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-purple-600" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`truncate text-[14px] ${unreadCount>0? "font-bold text-gray-900" : "font-medium text-gray-900"}`}>{displayName}</h3>
                      <span className="shrink-0 text-[11px] text-gray-400">{formatMessageTime(conversation?.lastMessage?.created_at || conversation?.updated_at)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className={`truncate text-xs ${unreadCount>0? "font-medium text-gray-900" : "text-gray-500"}`}>{lastMessage}</p>
                      {unreadCount>0 && <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-purple-600 px-1.5 text-[10px] font-bold text-white">{unreadCount>99? "99+" : unreadCount}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}