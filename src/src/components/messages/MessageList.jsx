import React, { useEffect, useRef } from "react";
import {
  MessageCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function MessageList({
  messages = [],
  currentUserId,
  loading = false,
  error = null,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const formatMessageTime = (date) => {
    if (!date) return "";

    const messageDate = new Date(date);

    if (Number.isNaN(messageDate.getTime())) {
      return "";
    }

    return messageDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-2">
          <Loader2
            size={25}
            className="animate-spin text-purple-600"
          />

          <p className="text-xs font-medium text-gray-500">
            Loading messages...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white px-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 ring-2 ring-red-500/20">
            <AlertCircle size={22} />
          </div>

          <h3 className="text-sm font-semibold text-gray-900">
            Unable to load messages
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white px-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-purple-600 ring-2 ring-purple-500/20">
            <MessageCircle size={22} />
          </div>

          <h3 className="text-sm font-bold text-gray-900">
            No messages yet
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            Send a message to start the conversation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white px-4 py-5">
      <div className="mx-auto flex max-w-4xl flex-col gap-3">
        {messages.map((message) => {
          const isMine =
            message.sender_id === currentUserId;

          const isDeleted = message.is_deleted;

          const hasMedia = Boolean(message.media_url);

          return (
            <div
              key={message.id}
              className={`flex ${
                isMine
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[82%] sm:max-w-[70%]`}
              >
                {/* Media */}
                {hasMedia && !isDeleted && (
                  <div
                    className={`mb-1 overflow-hidden rounded-2xl shadow-xs border border-purple-100 ${
                      isMine
                        ? "rounded-br-sm"
                        : "rounded-bl-sm"
                    }`}
                  >
                    {message.media_type?.startsWith(
                      "image/"
                    ) ? (
                      <img
                        src={message.media_url}
                        alt="Message attachment"
                        className="max-h-80 w-full object-cover"
                      />
                    ) : message.media_type?.startsWith(
                        "video/"
                      ) ? (
                      <video
                        src={message.media_url}
                        controls
                        className="max-h-80 w-full"
                      />
                    ) : (
                      <a
                        href={message.media_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block bg-purple-50 px-4 py-3 text-sm font-medium text-purple-700 underline hover:text-purple-800"
                      >
                        Open attachment
                      </a>
                    )}
                  </div>
                )}

                {/* Message bubble */}
                {(message.content || isDeleted) && (
                  <div
                    className={`rounded-2xl px-4 py-2.5 shadow-xs ${
                      isDeleted
                        ? "bg-gray-100 border border-gray-200 italic text-gray-500"
                        : isMine
                        ? "rounded-br-sm bg-purple-600 text-white"
                        : "rounded-bl-sm bg-purple-50/70 border border-purple-100/80 text-gray-900"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {isDeleted
                        ? "This message was deleted."
                        : message.content}
                    </p>
                  </div>
                )}

                {/* Time */}
                <div
                  className={`mt-1 text-[10px] font-medium text-gray-400 ${
                    isMine
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {formatMessageTime(
                    message.created_at
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}