
import React from "react";
import { X, Image as ImageIcon, Video } from "lucide-react";

const primaryButtonClass =
  "flex-1 px-4 py-3 rounded-xl border border-white/85 bg-gradient-to-br from-violet-400 via-purple-600 to-fuchsia-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.45),0_0_28px_rgba(124,58,237,0.25)] transition duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(192,132,252,0.75),0_0_36px_rgba(124,58,237,0.45)] active:scale-95 disabled:opacity-50 disabled:hover:scale-100";

const secondaryButtonClass =
  "flex-1 px-4 py-3 rounded-xl border theme-border text-primary transition hover:bg-[var(--surface-hover)] disabled:opacity-50";

const EditPostModal = ({
  post,
  editContent,
  setEditContent,
  editMediaFile,
  editMediaPreview,
  removeEditMedia,
  setRemoveEditMedia,
  editError,
  savingEdit,
  onMediaChange,
  onRemoveSelection,
  onClose,
  onSubmit,
}) => {
  if (!post) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-lg max-h-[90vh] rounded-2xl shadow-xl overflow-y-auto border theme-border"
        style={{ background: "var(--surface-solid)" }}
      >
        <div className="flex items-center justify-between p-5 border-b theme-border">
          <div>
            <h2 className="text-lg font-semibold text-primary">
              Edit Post
            </h2>

            <p className="text-sm text-secondary">
              You can edit this post within 15 minutes of creation.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={savingEdit}
            className="p-2 rounded-full text-secondary transition hover:bg-[var(--surface-hover)] hover:text-[var(--accent-strong)]"
            aria-label="Close edit modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5">
          <label className="block text-sm font-medium text-primary mb-2">
            Post content
          </label>

          <textarea
            value={editContent}
            onChange={(event) => setEditContent(event.target.value)}
            rows={6}
            maxLength={5000}
            className="glass-input p-3 resize-none"
            placeholder="Write your post..."
          />

          <div className="flex justify-between text-xs text-muted mt-1">
            <span>Editing window: 15 minutes</span>
            <span>{editContent.length}/5000</span>
          </div>

          {post.media_url && !editMediaPreview && !removeEditMedia && (
            <div className="mt-5">
              <p className="text-sm font-medium text-primary mb-2">
                Current media
              </p>

              {post.media_type === "image" && (
                <img
                  src={post.media_url}
                  alt="Current post media"
                  className="w-full max-h-64 object-cover rounded-xl"
                />
              )}

              {post.media_type === "video" && (
                <video
                  src={post.media_url}
                  controls
                  playsInline
                  className="w-full max-h-64 rounded-xl bg-black"
                />
              )}
            </div>
          )}

          {editMediaPreview && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-primary">
                  New media
                </p>

                <button
                  type="button"
                  onClick={onRemoveSelection}
                  className="text-sm transition hover:underline"
                  style={{ color: "var(--error-text)" }}
                >
                  Remove selection
                </button>
              </div>

              {editMediaFile?.type.startsWith("image/") && (
                <img
                  src={editMediaPreview}
                  alt="New media preview"
                  className="w-full max-h-64 object-cover rounded-xl"
                />
              )}

              {editMediaFile?.type.startsWith("video/") && (
                <video
                  src={editMediaPreview}
                  controls
                  playsInline
                  className="w-full max-h-64 rounded-xl bg-black"
                />
              )}
            </div>
          )}

          {post.media_url && !editMediaFile && (
            <label className="flex items-center gap-3 mt-4 text-sm text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={removeEditMedia}
                onChange={(event) =>
                  setRemoveEditMedia(event.target.checked)
                }
                className="w-4 h-4"
                style={{ accentColor: "var(--accent-strong)" }}
              />

              <span>Remove current image/video</span>
            </label>
          )}

          <div className="mt-5">
            <p className="text-sm font-medium text-primary mb-2">
              {post.media_url
                ? "Replace image or video"
                : "Add image or video"}
            </p>

            <label className="flex items-center justify-center gap-3 w-full border-2 border-dashed rounded-xl p-5 cursor-pointer transition hover:bg-[var(--surface-hover)]"
              style={{ borderColor: "var(--border-color)" }}
            >
              <ImageIcon
                size={22}
                className="text-[var(--accent-strong)]"
              />
              <Video
                size={22}
                className="text-[var(--accent-pink)]"
              />

              <span className="text-sm text-secondary">
                Choose image or video
              </span>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                onChange={onMediaChange}
                className="hidden"
              />
            </label>

            <p className="text-xs text-muted mt-2">
              Images up to 10 MB. Videos up to 100 MB.
            </p>
          </div>

          {editError && (
            <div
              className="mt-4 p-3 rounded-xl text-sm"
              style={{
                background: "var(--error-bg)",
                color: "var(--error-text)",
              }}
            >
              {editError}
            </div>
          )}

          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={savingEdit}
              className={secondaryButtonClass}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={savingEdit}
              className={primaryButtonClass}
            >
              {savingEdit ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPostModal;
