import React, { useRef } from "react";
import {
  Send,
  Paperclip,
  Loader2,
  Lock,
} from "lucide-react";

const MAX_MESSAGE_LENGTH = 2000;

export default function MessageComposer({
  value = "",
  onChange,
  onSend,
  onAttach,
  disabled = false,
  sending = false,
  placeholder = "Write a message...",
  disabledMessage = null,
  allowAttachments = true,
}) {
  const textareaRef = useRef(null);

  const handleChange = (event) => {
    const nextValue = event.target.value;

    if (nextValue.length > MAX_MESSAGE_LENGTH) {
      return;
    }

    onChange?.(nextValue);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (!disabled && !sending && value.trim()) {
        onSend?.();
      }
    }
  };

  const handleSend = () => {
    if (disabled || sending || !value.trim()) {
      return;
    }

    onSend?.();

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  if (disabled && disabledMessage) {
    return (
      <div className="border-t border-gray-100 bg-white p-3">
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-purple-50/70 border border-purple-100 px-4 py-3 text-center">
          <Lock
            size={16}
            className="shrink-0 text-purple-600"
          />

          <p className="text-xs font-medium text-purple-900">
            {disabledMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-100 bg-white p-3">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-end gap-2 rounded-2xl border border-purple-100 bg-purple-50/40 p-2 transition-all focus-within:border-purple-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-100/50 shadow-xs">
          {/* Attachment */}
          {allowAttachments && (
            <>
              <input
                id="message-attachment"
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={onAttach}
              />

              <label
                htmlFor="message-attachment"
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-400 transition hover:bg-purple-100/60 hover:text-purple-600"
                title="Attach media"
              >
                <Paperclip size={19} />
              </label>
            </>
          )}

          {/* Text input */}
          <div className="min-w-0 flex-1">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              disabled={disabled || sending}
              rows={1}
              placeholder={placeholder}
              className="max-h-32 min-h-10 w-full resize-none border-0 bg-transparent px-2 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
            />

            {value.length > 0 && (
              <div className="px-2 pb-1 text-right text-[10px] text-gray-400">
                {value.length}/{MAX_MESSAGE_LENGTH}
              </div>
            )}
          </div>

          {/* Send */}
          <button
            type="button"
            onClick={handleSend}
            disabled={
              disabled ||
              sending ||
              !value.trim()
            }
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white shadow-xs transition hover:bg-purple-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-purple-300 disabled:opacity-50 disabled:scale-100"
            title="Send message"
          >
            {sending ? (
              <Loader2
                size={18}
                className="animate-spin"
              />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>

        <p className="mt-1.5 px-2 text-[10px] text-gray-400">
          Press Enter to send · Shift + Enter for a new line
        </p>
      </div>
    </div>
  );
}