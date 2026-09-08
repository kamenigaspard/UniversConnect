import React, { useEffect, useState } from "react";
import {
  X,
  Send,
  Loader2,
  User,
  MessageCircle,
} from "lucide-react";

export default function MessageRequestModal({
  open = false,
  user = null,
  onClose,
  onSubmit,
  submitting = false,
  initialMessage = "",
}) {
  const [message, setMessage] =
    useState(initialMessage);

  useEffect(() => {
    if (open) {
      setMessage(initialMessage || "");
    }
  }, [open, initialMessage]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const displayName =
    user?.full_name ||
    user?.username ||
    "this user";

  const avatar = user?.avatar_url || null;

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedMessage = message.trim();

    onSubmit?.(trimmedMessage);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-4 py-6 backdrop-blur-xs"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-50 text-purple-600 ring-2 ring-purple-500/10">
              <MessageCircle size={18} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Send message request
              </h2>

              <p className="text-xs text-gray-500">
                Start a conversation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-purple-50 hover:text-purple-600 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </div>

        {/* User */}
        <div className="px-5 pt-5">
          <div className="flex items-center gap-3 rounded-xl bg-purple-50/50 border border-purple-100/60 p-3">
            {avatar ? (
              <img
                src={avatar}
                alt={displayName}
                className="h-11 w-11 rounded-full object-cover ring-2 ring-purple-500/20"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-100 text-purple-600 ring-2 ring-purple-500/20">
                <User size={20} />
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-900">
                {displayName}
              </p>

              {user?.role && (
                <p className="mt-0.5 text-xs font-medium capitalize text-purple-600">
                  {user.role.replace("_", " ")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="px-5 pb-5 pt-4"
        >
          <label
            htmlFor="message-request"
            className="mb-2 block text-sm font-medium text-gray-800"
          >
            Message
          </label>

          <textarea
            id="message-request"
            value={message}
            onChange={(event) =>
              setMessage(event.target.value)
            }
            rows={4}
            maxLength={1000}
            disabled={submitting}
            placeholder={`Write a message to ${displayName}...`}
            className="w-full resize-none rounded-xl border border-gray-200 bg-purple-50/30 px-3 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-purple-300 focus:bg-white focus:ring-2 focus:ring-purple-100"
          />

          <div className="mt-1 text-right text-[10px] text-gray-400">
            {message.length}/1000
          </div>

          {/* Information */}
          <div className="mt-3 rounded-xl bg-purple-50/60 border border-purple-100/80 p-3">
            <p className="text-xs leading-relaxed text-purple-900">
              Your request will be sent to{" "}
              <span className="font-semibold text-purple-950">
                {displayName}
              </span>
              . You can start messaging once the request
              is accepted.
            </p>
          </div>

          {/* Buttons */}
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-xs transition hover:bg-purple-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-purple-300 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={17} />
                  Send request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}