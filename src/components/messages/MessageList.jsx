import React, { useRef, useEffect, useMemo } from "react";
import { MessageCircle, Loader2, AlertCircle } from "lucide-react";

export default function MessageList({ messages = [], currentUserId, loading = false, error = null }) {
  const bottomRef = useRef(null);

  // SAFE: filter out nulls that realtime might send
  const safeMessages = useMemo(() => {
    if (!Array.isArray(messages)) return [];
    return messages.filter(m => m && m.id);
  }, [messages]);

  useEffect(() => {
    if (safeMessages.length) {
      // use setTimeout to avoid startTime React Profiler bug
      const t = setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" }), 50);
      return () => clearTimeout(t);
    }
  }, [safeMessages]);

  const formatTime = (date) => {
    if (!date) return "";
    try {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  const formatDateSeparator = (date) => {
    if (!date) return "";
    try {
      const d = new Date(date);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) return "Today";
      const yesterday = new Date(); yesterday.setDate(now.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
      return d.toLocaleDateString([], { month: "long", day: "numeric", year: d.getFullYear()!== now.getFullYear()? "numeric" : undefined });
    } catch { return ""; }
  };

  const grouped = useMemo(() => {
    let lastDate = null;
    return safeMessages.map((msg) => {
      try {
        const dateStr = msg.created_at? new Date(msg.created_at).toDateString() : "";
        const showSeparator = dateStr && dateStr!== lastDate;
        lastDate = dateStr || lastDate;
        return {...msg, showSeparator };
      } catch {
        return {...msg, showSeparator: false };
      }
    });
  }, [safeMessages]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600"><AlertCircle size={22} /></div>
          <h3 className="text-sm font-semibold">Unable to load messages</h3>
          <p className="mt-1 text-xs text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!safeMessages.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-20">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-purple-600"><MessageCircle size={22} /></div>
        <h3 className="text-sm font-bold">No messages yet</h3>
        <p className="mt-1 text-xs text-gray-500">Send a message to start</p>
        <div ref={bottomRef} />
      </div>
    );
  }

  return (
    <div className="bg-white px-3 py-4 sm:px-4">
      <div className="mx-auto flex max-w-4xl flex-col gap-2">
        {grouped.map((message) => {
          const isMine = String(message.sender_id) === String(currentUserId);
          const isDeleted = message.is_deleted;
          const hasMedia = Boolean(message.media_url);

          return (
            <React.Fragment key={message.id || Math.random()}>
              {message.showSeparator && (
                <div className="my-3 flex justify-center">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-medium text-gray-500">
                    {formatDateSeparator(message.created_at)}
                  </span>
                </div>
              )}

              <div className={`flex ${isMine? "justify-end" : "justify-start"}`}>
                <div className="max-w-[82%] sm:max-w-[68%]">
                  {hasMedia &&!isDeleted && (
                    <div className={`mb-1 overflow-hidden rounded-2xl border ${isMine? "rounded-br-md border-purple-600" : "rounded-bl-md border-purple-100"}`}>
                      {message.media_type?.startsWith("image/")? <img src={message.media_url} alt="" className="max-h-80 w-auto max-w-full object-cover" loading="lazy" /> : message.media_type?.startsWith("video/")? <video src={message.media_url} controls className="max-h-80 w-full" /> : <a href={message.media_url} target="_blank" rel="noreferrer" className="block bg-purple-50 px-4 py-3 text-sm text-purple-700 underline">Open attachment</a>}
                    </div>
                  )}
                  {(message.content || isDeleted) && (
                    <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${isDeleted? "bg-gray-100 italic text-gray-500" : isMine? "rounded-br-md bg-purple-600 text-white" : "rounded-bl-md bg-gray-100 text-gray-900"}`}>
                      <p className="whitespace-pre-wrap break-words">{isDeleted? "This message was deleted" : message.content}</p>
                    </div>
                  )}
                  <div className={`mt-1 text-[10px] text-gray-400 ${isMine? "text-right" : "text-left"}`}>{formatTime(message.created_at)}{message.pending? " • Sending..." : ""}</div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}