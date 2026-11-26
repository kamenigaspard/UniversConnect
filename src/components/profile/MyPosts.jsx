
import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, RefreshCw } from "lucide-react";

import { supabase } from "../../lib/supabase";
import PostCard from "../PostCard";

const POSTS_PER_PAGE = 10;

export default function MyPosts({
  userId,
  currentUserId = userId,
  title = "My Posts",
}) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const loadPosts = useCallback(
    async (reset = false) => {
      if (!userId) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const currentOffset = reset ? 0 : offset;

      if (reset) {
        setLoading(true);
        setError("");
      } else {
        setLoadingMore(true);
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("posts")
          .select(`
            id,
            author_id,
            school_id,
            content,
            media_url,
            media_type,
            is_deleted,
            created_at,
            edited_at,
            profiles (
              id,
              full_name,
              username,
              avatar_url
            )
          `)
          .eq("author_id", userId)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .range(
            currentOffset,
            currentOffset + POSTS_PER_PAGE - 1
          );

        if (fetchError) throw fetchError;

        const newPosts = data || [];

        setPosts((previous) =>
          reset ? newPosts : [...previous, ...newPosts]
        );

        setHasMore(newPosts.length === POSTS_PER_PAGE);
        setOffset(currentOffset + newPosts.length);
      } catch (err) {
        console.error("Error loading profile posts:", err);
        setError("Unable to load posts. Please try again.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [userId, offset]
  );

  useEffect(() => {
    setPosts([]);
    setOffset(0);
    setHasMore(true);
    loadPosts(true);
  }, [userId]);

  const handlePostUpdated = (updatedPost) => {
    setPosts((previous) =>
      previous.map((post) =>
        post.id === updatedPost.id
          ? {
              ...post,
              ...updatedPost,
              profiles: post.profiles,
            }
          : post
      )
    );
  };

  const handlePostDeleted = (postId) => {
    setPosts((previous) =>
      previous.filter((post) => post.id !== postId)
    );
  };

  return (
    <section className="mt-8 space-y-5">
      <div className="flex items-center gap-2">
        <FileText
          size={21}
          className="text-[var(--accent-primary)]"
        />

        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          {title}
        </h2>

        <span className="rounded-full bg-[var(--page-bg-secondary)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
          {posts.length}
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-[var(--text-secondary)]">
          <Loader2
            size={30}
            className="animate-spin text-[var(--accent-primary)]"
          />
          <p className="mt-3 text-sm">Loading posts...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>

          <button
            type="button"
            onClick={() => loadPosts(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            <RefreshCw size={15} />
            Try Again
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-6 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--page-bg-secondary)]">
            <FileText
              size={25}
              className="text-[var(--accent-primary)]"
            />
          </div>

          <h3 className="mt-4 font-semibold text-[var(--text-primary)]">
            No posts yet
          </h3>

          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Posts shared by this user will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              onPostUpdated={handlePostUpdated}
              onPostDeleted={handlePostDeleted}
            />
          ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => loadPosts(false)}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--page-bg-secondary)] disabled:opacity-60"
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More Posts"
                )}
              </button>
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <p className="py-4 text-center text-sm text-[var(--text-secondary)]">
              You've reached the end of the posts.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
