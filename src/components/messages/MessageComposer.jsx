import React, { useRef, useEffect } from "react";
import { Send, Paperclip, Loader2, Lock } from "lucide-react";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_FILE_MB = 15;

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
  const fileRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + "px";
    }
  }, [value]);

  const handleChange = (e) => {
    const next = e.target.value || "";
    if (next.length > MAX_MESSAGE_LENGTH) return;
    onChange?.(next);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" &&!e.shiftKey) {
      e.preventDefault();
      if (!disabled &&!sending && value.trim()) onSend?.();
    }
  };

  const handleSend = () => {
    if (disabled || sending ||!value.trim()) return;
    onSend?.();
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      alert(`File too large (max ${MAX_FILE_MB}MB)`);
      e.target.value = "";
      return;
    }
    onAttach?.(file);
    e.target.value = "";
  };

  // If disabled, show lock + disabled composer (not hide it)
  if (disabled && disabledMessage) {
    return (
      <div className="border-t border-gray-100 bg-white p-3">
        <div className="flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
          <Lock size={14} className="shrink-0 text-amber-600" />
          <p className="text-xs font-medium text-amber-800">{disabledMessage}</p>
        </div>
        {/* keep textarea disabled so layout doesn't jump */}
        <div className="mt-2 flex items-end gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-2 opacity-60">
          <div className="h-10 w-10" />
          <div className="flex-1 py-2 text-sm text-gray-400">{placeholder}</div>
          <div className="h-10 w-10 rounded-full bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-100 bg-white p-3">
      <div className="mx-auto max-w-4xl">
        <div className={`flex items-end gap-2 rounded-2xl border bg-white p-2 shadow-sm transition ${disabled? "border-gray-100 bg-gray-50" : "border-gray-200 focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-100"}`}>
          {allowAttachments && (
            <>
              <input ref={fileRef} type="file" accept="image/*,video/*,.pdf" className="hidden" onChange={handleFileChange} disabled={disabled || sending} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={disabled || sending} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-purple-600 disabled:opacity-40">
                <Paperclip size={18} />
              </button>
            </>
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled || sending}
            rows={1}
            placeholder={placeholder}
            className="max-h-32 min-h-9 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-[14px] text-gray-900 outline-none placeholder:text-gray-400"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || sending ||!value.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white hover:bg-purple-700 active:scale-95 disabled:bg-gray-300"
          >
            {sending? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        {value.length > 0 && <div className="mt-1 text-right text-[10px] text-gray-400">{value.length}/{MAX_MESSAGE_LENGTH}</div>}
      </div>
    </div>
  );
}