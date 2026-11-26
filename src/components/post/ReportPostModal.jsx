
import React from "react";
import { X, Check } from "lucide-react";

const REPORT_REASONS = [
  "Spam",
  "Harassment",
  "Inappropriate content",
  "False information",
  "Other",
];

const primaryButtonClass =
  "flex-1 px-4 py-3 rounded-xl border border-white/85 bg-gradient-to-br from-violet-400 via-purple-600 to-fuchsia-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.45),0_0_28px_rgba(124,58,237,0.25)] transition duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(192,132,252,0.75),0_0_36px_rgba(124,58,237,0.45)] active:scale-95 disabled:opacity-50 disabled:hover:scale-100";

const secondaryButtonClass =
  "flex-1 px-4 py-3 rounded-xl border theme-border text-primary transition hover:bg-[var(--surface-hover)] disabled:opacity-50";

const ReportPostModal = ({
  reportReason,
  setReportReason,
  reportDescription,
  setReportDescription,
  reporting,
  reportMessage,
  reportSuccess,
  onClose,
  onSubmit,
}) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md rounded-2xl shadow-xl border theme-border"
        style={{ background: "var(--surface-solid)" }}
      >
        <div className="flex items-center justify-between p-5 border-b theme-border">
          <div>
            <h2 className="font-semibold text-lg text-primary">
              Report Post
            </h2>

            <p className="text-sm text-secondary">
              Tell us what is wrong with this post.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={reporting}
            className="p-2 rounded-full text-secondary transition hover:bg-[var(--surface-hover)] hover:text-[var(--accent-strong)]"
            aria-label="Close report modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5">
          <label className="block text-sm font-medium text-primary mb-2">
            Reason
          </label>

          <div className="space-y-2 mb-5">
            {REPORT_REASONS.map((reason) => {
              const selected = reportReason === reason;

              return (
                <label
                  key={reason}
                  className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition"
                  style={{
                    borderColor: selected
                      ? "var(--accent)"
                      : "var(--border-color)",
                    background: selected
                      ? "var(--accent-light)"
                      : "transparent",
                  }}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason}
                    checked={selected}
                    onChange={(event) =>
                      setReportReason(event.target.value)
                    }
                    style={{ accentColor: "var(--accent-strong)" }}
                  />

                  <span className="text-primary">{reason}</span>
                </label>
              );
            })}
          </div>

          <label className="block text-sm font-medium text-primary mb-2">
            Additional information
            <span className="font-normal text-muted">
              {" "}(optional)
            </span>
          </label>

          <textarea
            value={reportDescription}
            onChange={(event) =>
              setReportDescription(event.target.value)
            }
            rows={4}
            maxLength={1000}
            placeholder="Explain the problem..."
            className="glass-input p-3 resize-none"
          />

          {reportMessage && (
            <div
              className="mt-4 p-3 rounded-xl text-sm"
              style={{
                background: reportSuccess
                  ? "var(--success-bg)"
                  : "var(--error-bg)",
                color: reportSuccess
                  ? "var(--success-text)"
                  : "var(--error-text)",
              }}
            >
              {reportSuccess && (
                <Check size={18} className="inline mr-2" />
              )}

              {reportMessage}
            </div>
          )}

          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={reporting}
              className={secondaryButtonClass}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={reporting || !reportReason}
              className={primaryButtonClass}
            >
              {reporting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportPostModal;
