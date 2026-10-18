
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Home,
  MessageCircle,
  Plus,
  Search,
  Send,
  User,
  Users,
  Heart,
  Sparkles,
  Settings,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import PostCard from "../components/PostCard";

// ============================================================
// AnimatedPost
// ============================================================

const AnimatedPost = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef(null);

  useEffect(() => {
    const element = domRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={domRef}
      className={`transform transition-all duration-500 ease-out ${
        isVisible
          ? "translate-y-0 scale-100 opacity-100"
          : "translate-y-8 scale-[0.98] opacity-0"
      }`}
    >
      {children}
    </div>
  );
};

// ============================================================
// Reusable glass styles
// ============================================================

const glassCard =
  "rounded-2xl border border-white/80 bg-white/75 shadow-[0_8px_32px_rgba(91,33,182,0.07)] backdrop-blur-xl";

const iconButton =
  "flex h-10 w-10 items-center justify-center rounded-xl border border-purple-100/80 bg-white/70 text-purple-700 transition duration-200 hover:border-purple-300 hover:bg-purple-50 hover:shadow-[0_0_18px_rgba(168,85,247,0.18)] active:scale-95";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_5px_18px_rgba(139,92,246,0.28)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(139,92,246,0.38)] active:translate-y-0";

// ============================================================
// StudentHome
// ============================================================

const StudentHome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  const [school, setSchool] = useState(null);
  const [schoolLoading, setSchoolLoading] = useState(true);
  const [schoolError, setSchoolError] = useState("");

  const [spotlights, setSpotlights] = useState([]);
  const [currentSpotlight, setCurrentSpotlight] = useState(0);

  const [posts, setPosts] = useState([]);
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(0);

  const [postsLoading, setPostsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [postsError, setPostsError] = useState("");

  const [currentUserId, setCurrentUserId] = useState(user?.id || null);
  const [loading, setLoading] = useState(true);

  const loadMoreRef = useRef(null);
  const loadingMoreRef = useRef(false);

  // Keep the authenticated user ID current.
  useEffect(() => {
    if (user?.id) setCurrentUserId(user.id);
  }, [user?.id]);

  // Initial page load.
  useEffect(() => {
    if (!profile) return;

    if (!profile.school_id) {
      setLoading(false);
      setSchoolLoading(false);
      setSchoolError("Your account has not been assigned to a school.");
      return;
    }

    getCurrentUser();
    loadPosts(0);
    loadSchool();
    loadSpotlights();
    loadHomeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.school_id]);

  // ==========================================================
  // GET CURRENT USER
  // ==========================================================

  const getCurrentUser = async () => {
    try {
      const {
        data: { user: authenticatedUser },
        error,
      } = await supabase.auth.getUser();

      if (error) throw error;

      if (authenticatedUser) {
        setCurrentUserId(authenticatedUser.id);
      }
    } catch (error) {
      console.error("Error getting current user:", error);
    }
  };

  // ==========================================================
  // LOAD POSTS
  // ==========================================================

  const loadPosts = async (pageNumber = 0) => {
    const from = pageNumber * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    if (pageNumber === 0) {
      setPostsLoading(true);
      setHasMorePosts(true);
    } else {
      setLoadingMore(true);
      loadingMoreRef.current = true;
    }

    setPostsError("");

    try {
      const {
        data: { user: authenticatedUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!authenticatedUser) {
        throw new Error("You must be logged in to view the feed.");
      }

      setCurrentUserId(authenticatedUser.id);

      const { data: postsData, error: postsQueryError } = await supabase
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
          updated_at,
          profiles (
            id,
            full_name,
            username,
            avatar_url,
            role
          ),
          schools (
            id,
            name,
            logo_url
          )
        `)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (postsQueryError) throw postsQueryError;

      const currentPosts = postsData || [];
      setHasMorePosts(currentPosts.length === PAGE_SIZE);

      const postIds = currentPosts.map((post) => post.id);

      let userLikes = [];
      let allLikes = [];
      let allComments = [];

      if (postIds.length > 0) {
        const [
          { data: likedData, error: likedError },
          { data: likesData, error: likesError },
          { data: commentsData, error: commentsError },
        ] = await Promise.all([
          supabase
            .from("likes")
            .select("post_id")
            .eq("user_id", authenticatedUser.id)
            .in("post_id", postIds),

          supabase
            .from("likes")
            .select("post_id")
            .in("post_id", postIds),

          supabase
            .from("comments")
            .select("post_id")
            .in("post_id", postIds)
            .eq("is_deleted", false),
        ]);

        if (likedError) throw likedError;
        if (likesError) throw likesError;
        if (commentsError) throw commentsError;

        userLikes = likedData || [];
        allLikes = likesData || [];
        allComments = commentsData || [];
      }

      const likedPostIds = new Set(userLikes.map((like) => like.post_id));
      const likeCounts = {};
      const commentCounts = {};

      allLikes.forEach(({ post_id }) => {
        likeCounts[post_id] = (likeCounts[post_id] || 0) + 1;
      });

      allComments.forEach(({ post_id }) => {
        commentCounts[post_id] = (commentCounts[post_id] || 0) + 1;
      });

      const formattedPosts = currentPosts.map((post) => ({
        ...post,
        isLiked: likedPostIds.has(post.id),
        likeCount: likeCounts[post.id] || 0,
        commentCount: commentCounts[post.id] || 0,
      }));

      setPosts((previousPosts) =>
        pageNumber === 0
          ? formattedPosts
          : [
              ...previousPosts,
              ...formattedPosts.filter(
                (post) => !previousPosts.some((item) => item.id === post.id)
              ),
            ]
      );

      setPage(pageNumber);
    } catch (error) {
      console.error("Error loading posts:", error);
      setPostsError(error.message || "Unable to load posts.");
    } finally {
      setPostsLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  };

  // ==========================================================
  // INFINITE SCROLL
  // ==========================================================

  useEffect(() => {
    const element = loadMoreRef.current;

    if (!element || !hasMorePosts || postsLoading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          !loadingMoreRef.current &&
          !postsLoading
        ) {
          loadingMoreRef.current = true;
          loadPosts(page + 1);
        }
      },
      { rootMargin: "500px 0px", threshold: 0 }
    );

    observer.observe(element);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, hasMorePosts, postsLoading]);

  // ==========================================================
  // LOAD SCHOOL
  // ==========================================================

  const loadSchool = async () => {
    if (!profile?.school_id) return;

    setSchoolLoading(true);
    setSchoolError("");

    try {
      const { data, error } = await supabase
        .from("schools")
        .select("id, name, code, logo_url, description, is_active")
        .eq("id", profile.school_id)
        .single();

      if (error) throw error;
      setSchool(data);
    } catch (error) {
      console.error("Error loading school:", error);
      setSchoolError(error.message || "Unable to load school information.");
    } finally {
      setSchoolLoading(false);
    }
  };

  // ==========================================================
  // LOAD ADMIN SPOTLIGHTS
  // ==========================================================

  const loadSpotlights = async () => {
    if (!profile?.school_id) return;

    try {
      const { data: spotlightData, error: spotlightError } = await supabase
        .from("admin_spotlights")
        .select(`
          id,
          profile_id,
          school_id,
          title,
          description,
          image_url,
          display_order,
          is_active,
          starts_at,
          ends_at,
          created_at
        `)
        .eq("school_id", profile.school_id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (spotlightError) throw spotlightError;

      if (!spotlightData?.length) {
        setSpotlights([]);
        setCurrentSpotlight(0);
        return;
      }

      const now = new Date();

      const activeSpotlights = spotlightData.filter((item) => {
        const hasStarted = !item.starts_at || new Date(item.starts_at) <= now;
        const hasNotEnded = !item.ends_at || new Date(item.ends_at) >= now;
        return hasStarted && hasNotEnded;
      });

      const profileIds = [
        ...new Set(
          activeSpotlights.map((item) => item.profile_id).filter(Boolean)
        ),
      ];

      let profileData = [];

      if (profileIds.length) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, bio, role, school_id")
          .in("id", profileIds);

        if (error) throw error;
        profileData = data || [];
      }

      const combinedSpotlights = activeSpotlights.map((spotlight) => ({
        ...spotlight,
        profile:
          profileData.find((item) => item.id === spotlight.profile_id) || null,
      }));

      setSpotlights(combinedSpotlights);
      setCurrentSpotlight(0);
    } catch (error) {
      console.error("Error loading spotlights:", error);
      setSpotlights([]);
      setCurrentSpotlight(0);
    }
  };

  // ==========================================================
  // LOAD HOME DATA
  // ==========================================================

  const loadHomeData = async () => {
    try {
      setLoading(false);
    } catch (error) {
      console.error("Error loading home data:", error);
      setLoading(false);
    }
  };

  // ==========================================================
  // SPOTLIGHT CONTROLS
  // ==========================================================

  const previousSpotlight = () => {
    if (!spotlights.length) return;

    setCurrentSpotlight((previous) =>
      previous === 0 ? spotlights.length - 1 : previous - 1
    );
  };

  const nextSpotlight = () => {
    if (!spotlights.length) return;

    setCurrentSpotlight((previous) =>
      previous === spotlights.length - 1 ? 0 : previous + 1
    );
  };

  // ==========================================================
  // CREATE POST / RETRY
  // ==========================================================

  const handleCreatePost = () => navigate("/create-post");

  const handleRetryPosts = () => {
    setPage(0);
    setHasMorePosts(true);
    setPostsError("");
    loadPosts(0);
  };

  // ==========================================================
  // LOADING SCREEN
  // ==========================================================

  if (loading && !profile) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8f5ff]">
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-violet-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-fuchsia-300/25 blur-3xl" />
        <div className="relative flex flex-col items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/80 bg-white/70 shadow-[0_0_35px_rgba(139,92,246,0.22)] backdrop-blur-xl">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-violet-200 border-t-violet-600" />
          </div>
          <p className="text-sm font-medium text-violet-700">
            Preparing your UniVerse...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // MAIN PAGE
  // ==========================================================

  const isActive = (path) => location.pathname === path;

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#f8f5ff] pb-28 text-slate-800">
      {/* AMBIENT BACKGROUND GLOW */}
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -left-32 top-24 h-80 w-80 rounded-full bg-violet-300/20 blur-[100px]" />
        <div className="absolute -right-32 top-[35%] h-96 w-96 rounded-full bg-fuchsia-300/20 blur-[120px]" />
        <div className="absolute bottom-10 left-[30%] h-72 w-72 rounded-full bg-indigo-300/15 blur-[100px]" />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/75 shadow-[0_4px_24px_rgba(91,33,182,0.05)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative shrink-0">
              {school?.logo_url ? (
                <img
                  src={school.logo_url}
                  alt={school.name || "School logo"}
                  className="h-11 w-11 rounded-2xl border border-white object-cover shadow-[0_0_18px_rgba(139,92,246,0.18)]"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                  <Users size={21} />
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold tracking-tight text-slate-900">
                {schoolLoading
                  ? "Loading school..."
                  : school?.name || "University"}
              </h1>
              <p className="truncate text-xs text-violet-600">
                {profile?.full_name || profile?.username || "Student"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/notifications")}
              className={iconButton}
              aria-label="Notifications"
            >
              <Bell size={20} />
            </button>

            <button
              type="button"
              onClick={() => navigate("/messages")}
              className={iconButton}
              aria-label="Messages"
            >
              <Send size={19} />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-3 sm:px-4">
        {/* WELCOME STRIP */}
        <section className="mt-5">
          <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 p-[1px] shadow-[0_10px_32px_rgba(139,92,246,0.18)]">
            <div className="relative overflow-hidden rounded-[15px] bg-white/95 px-4 py-4 backdrop-blur-xl sm:px-5">
              <div className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-fuchsia-300/30 blur-2xl" />
              <div className="relative flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_5px_16px_rgba(139,92,246,0.25)]">
                  <Sparkles size={21} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
                    Your campus, your community
                  </p>
                  <h2 className="mt-0.5 text-base font-bold text-slate-900">
                    Welcome to UniVerse
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Discover what's happening across your university.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SCHOOL ERROR */}
        {schoolError && (
          <div className="mt-4 rounded-2xl border border-rose-200/80 bg-rose-50/90 p-4 shadow-sm backdrop-blur-xl">
            <p className="text-sm text-rose-700">{schoolError}</p>
          </div>
        )}

        {/* ADMIN SPOTLIGHT */}
        {spotlights.length > 0 && (
          <section className="mt-5">
            <div className="mb-3 flex items-center gap-2 px-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_0_16px_rgba(139,92,246,0.22)]">
                <Sparkles size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Campus spotlight
                </h2>
                <p className="text-xs text-slate-500">
                  Updates from your administrators
                </p>
              </div>
            </div>

            <div className={`${glassCard} overflow-hidden`}>
              <div className="relative aspect-[16/8] w-full overflow-hidden bg-gradient-to-br from-violet-100 via-purple-50 to-fuchsia-100">
                {spotlights[currentSpotlight]?.image_url ||
                spotlights[currentSpotlight]?.profile?.avatar_url ? (
                  <img
                    src={
                      spotlights[currentSpotlight]?.image_url ||
                      spotlights[currentSpotlight]?.profile?.avatar_url
                    }
                    alt={
                      spotlights[currentSpotlight]?.profile?.full_name ||
                      "Administrator spotlight"
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/80 bg-white/70 text-violet-500 shadow-[0_0_35px_rgba(139,92,246,0.2)] backdrop-blur-xl">
                      <Users size={38} />
                    </div>
                  </div>
                )}

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-white/10" />

                {spotlights.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={previousSpotlight}
                      className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/40 bg-slate-900/30 text-white shadow-lg backdrop-blur-xl transition hover:bg-slate-900/50 active:scale-95"
                      aria-label="Previous spotlight"
                    >
                      <ChevronLeft size={21} />
                    </button>

                    <button
                      type="button"
                      onClick={nextSpotlight}
                      className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/40 bg-slate-900/30 text-white shadow-lg backdrop-blur-xl transition hover:bg-slate-900/50 active:scale-95"
                      aria-label="Next spotlight"
                    >
                      <ChevronRight size={21} />
                    </button>
                  </>
                )}

                {spotlights.length > 1 && (
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                    {spotlights.map((spotlight, index) => (
                      <button
                        key={spotlight.id}
                        type="button"
                        onClick={() => setCurrentSpotlight(index)}
                        className={`h-1.5 rounded-full transition-all ${
                          index === currentSpotlight
                            ? "w-6 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                            : "w-1.5 bg-white/60 hover:bg-white"
                        }`}
                        aria-label={`Show spotlight ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  {spotlights[currentSpotlight]?.profile?.avatar_url ? (
                    <img
                      src={spotlights[currentSpotlight].profile.avatar_url}
                      alt={
                        spotlights[currentSpotlight].profile.full_name ||
                        "Administrator"
                      }
                      className="h-11 w-11 rounded-2xl border border-white object-cover shadow-[0_0_14px_rgba(139,92,246,0.15)]"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.22)]">
                      <User size={19} />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {spotlights[currentSpotlight]?.profile?.full_name ||
                        spotlights[currentSpotlight]?.profile?.username ||
                        "Administrator"}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-violet-600">
                      Administrator Spotlight
                    </p>
                  </div>
                </div>

                {spotlights[currentSpotlight]?.title && (
                  <h3 className="mt-4 text-base font-bold text-slate-900">
                    {spotlights[currentSpotlight].title}
                  </h3>
                )}

                {spotlights[currentSpotlight]?.description && (
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-600">
                    {spotlights[currentSpotlight].description}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* CREATE POST CARD */}
        <section className="mt-5">
          <div className="rounded-2xl bg-gradient-to-r from-violet-400/70 via-fuchsia-400/70 to-indigo-400/70 p-[1px] shadow-[0_8px_28px_rgba(139,92,246,0.12)]">
            <button
              type="button"
              onClick={handleCreatePost}
              className="group flex w-full items-center gap-3 rounded-[15px] border border-white/80 bg-white/85 p-4 text-left backdrop-blur-xl transition duration-200 hover:bg-white/95"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || "Your profile"}
                  className="h-11 w-11 shrink-0 rounded-2xl border border-white object-cover shadow-[0_0_15px_rgba(139,92,246,0.16)]"
                />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_0_18px_rgba(139,92,246,0.25)]">
                  <User size={20} />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">
                  What's happening at your university?
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Share a moment with your campus community
                </p>
              </div>

              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] transition duration-200 group-hover:scale-105 group-hover:shadow-[0_0_26px_rgba(168,85,247,0.4)]">
                <Plus size={22} />
              </span>
            </button>
          </div>
        </section>

        {/* FEED HEADER */}
        <section className="mb-3 mt-6 flex items-center justify-between px-1">
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900">
              Your campus feed
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              The latest posts from your university
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-100 bg-white/70 text-violet-600 shadow-sm">
            <MessageCircle size={17} />
          </div>
        </section>

        {/* FEED */}
        <section className="space-y-4">
          {postsLoading && (
            <div className={`${glassCard} flex flex-col items-center justify-center py-12`}>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white bg-gradient-to-br from-violet-100 to-fuchsia-100 shadow-[0_0_24px_rgba(139,92,246,0.12)]">
                <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-violet-200 border-t-violet-600" />
              </div>
              <p className="mt-4 text-sm font-semibold text-violet-700">
                Loading your feed...
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Finding the latest campus updates
              </p>
            </div>
          )}

          {!postsLoading && postsError && (
            <div className="rounded-2xl border border-rose-200/80 bg-white/80 p-6 text-center shadow-[0_8px_24px_rgba(190,24,93,0.06)] backdrop-blur-xl">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                <MessageCircle size={22} />
              </div>
              <p className="mt-3 text-sm font-semibold text-rose-700">
                {postsError}
              </p>
              <button
                type="button"
                onClick={handleRetryPosts}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_5px_16px_rgba(139,92,246,0.24)] transition hover:shadow-[0_8px_22px_rgba(139,92,246,0.35)]"
              >
                Try again
              </button>
            </div>
          )}

          {!postsLoading && !postsError && posts.length === 0 && (
            <div className={`${glassCard} px-5 py-12 text-center`}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-white bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-600 shadow-[0_0_26px_rgba(139,92,246,0.15)]">
                <MessageCircle size={27} />
              </div>
              <h2 className="mt-4 text-base font-bold text-slate-900">
                Your feed is waiting
              </h2>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">
                Be the first to share something with your university community.
              </p>
              <button
                type="button"
                onClick={handleCreatePost}
                className={`${primaryButton} mt-5`}
              >
                <Plus size={17} />
                Create a post
              </button>
            </div>
          )}

          {!postsLoading &&
            !postsError &&
            posts.map((post) => (
              <AnimatedPost key={post.id}>
                <PostCard post={post} currentUserId={currentUserId} />
              </AnimatedPost>
            ))}

          {!postsError && posts.length > 0 && hasMorePosts && (
            <div
              ref={loadMoreRef}
              className="flex min-h-[80px] items-center justify-center"
            >
              {loadingMore && (
                <div className="flex items-center gap-3 rounded-full border border-white/80 bg-white/70 px-4 py-2.5 text-sm font-medium text-violet-700 shadow-sm backdrop-blur-xl">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
                  <span>Loading more posts...</span>
                </div>
              )}
            </div>
          )}

          {!postsError && posts.length > 0 && !hasMorePosts && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-purple-100 bg-white/70 text-violet-500">
                <Sparkles size={17} />
              </div>
              <p className="text-sm font-semibold text-slate-600">
                You've reached the end of your feed.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                You're all caught up for now.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* FIXED BOTTOM NAVIGATION */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/80 bg-white/80 shadow-[0_-8px_32px_rgba(91,33,182,0.09)] backdrop-blur-2xl"
        aria-label="Bottom navigation"
      >
        <div className="mx-auto grid h-[72px] max-w-3xl grid-cols-5 items-center px-1 sm:px-3">
          {/* HOME */}
          <button
            type="button"
            onClick={() => navigate("/student-home")}
            aria-current={isActive("/student-home") ? "page" : undefined}
            className={`group flex h-full flex-col items-center justify-center gap-1 transition ${
              isActive("/student-home")
                ? "text-violet-700"
                : "text-slate-500 hover:text-violet-600"
            }`}
          >
            <span className={`flex h-8 w-10 items-center justify-center rounded-xl transition ${
              isActive("/student-home")
                ? "bg-violet-100 text-violet-700 shadow-[0_0_14px_rgba(139,92,246,0.15)]"
                : "group-hover:bg-violet-50"
            }`}>
              <Home size={21} strokeWidth={isActive("/student-home") ? 2.4 : 1.8} />
            </span>
            <span className="text-[10px] font-semibold leading-none">Home</span>
          </button>

          {/* SEARCH */}
          <button
            type="button"
            onClick={() => navigate("/search")}
            aria-current={isActive("/search") ? "page" : undefined}
            className={`group flex h-full flex-col items-center justify-center gap-1 transition ${
              isActive("/search")
                ? "text-violet-700"
                : "text-slate-500 hover:text-violet-600"
            }`}
          >
            <span className={`flex h-8 w-10 items-center justify-center rounded-xl transition ${
              isActive("/search")
                ? "bg-violet-100 text-violet-700 shadow-[0_0_14px_rgba(139,92,246,0.15)]"
                : "group-hover:bg-violet-50"
            }`}>
              <Search size={21} strokeWidth={isActive("/search") ? 2.4 : 1.8} />
            </span>
            <span className="text-[10px] font-semibold leading-none">Search</span>
          </button>

          {/* CREATE */}
          <button
            type="button"
            onClick={handleCreatePost}
            aria-label="Create post"
            className="group flex h-full flex-col items-center justify-center gap-1 text-slate-500"
          >
            <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-[0_0_24px_rgba(139,92,246,0.4)] transition duration-200 group-hover:scale-105 group-hover:shadow-[0_0_32px_rgba(168,85,247,0.5)] group-active:scale-95">
              <span className="pointer-events-none absolute inset-[1px] rounded-[15px] border border-white/30" />
              <Plus size={25} strokeWidth={2} />
            </span>
            <span className="text-[10px] font-semibold leading-none">Create</span>
          </button>

          {/* REQUESTS */}
          <button
            type="button"
            onClick={() => navigate("/requests")}
            aria-current={isActive("/requests") ? "page" : undefined}
            className={`group flex h-full flex-col items-center justify-center gap-1 transition ${
              isActive("/requests")
                ? "text-violet-700"
                : "text-slate-500 hover:text-violet-600"
            }`}
          >
            <span className={`flex h-8 w-10 items-center justify-center rounded-xl transition ${
              isActive("/requests")
                ? "bg-violet-100 text-violet-700 shadow-[0_0_14px_rgba(139,92,246,0.15)]"
                : "group-hover:bg-violet-50"
            }`}>
              <Heart
                size={21}
                strokeWidth={isActive("/requests") ? 2.4 : 1.8}
                fill={isActive("/requests") ? "currentColor" : "none"}
              />
            </span>
            <span className="text-[10px] font-semibold leading-none">Requests</span>
          </button>

          {/* PROFILE */}
          <button
            type="button"
            onClick={() => navigate("/profile")}
            aria-current={isActive("/profile") ? "page" : undefined}
            className={`group flex h-full flex-col items-center justify-center gap-1 transition ${
              isActive("/profile")
                ? "text-violet-700"
                : "text-slate-500 hover:text-violet-600"
            }`}
          >
            <span className={`flex h-8 w-10 items-center justify-center rounded-xl transition ${
              isActive("/profile")
                ? "bg-violet-100 text-violet-700 shadow-[0_0_14px_rgba(139,92,246,0.15)]"
                : "group-hover:bg-violet-50"
            }`}>
              <User size={21} strokeWidth={isActive("/profile") ? 2.4 : 1.8} />
            </span>
            <span className="text-[10px] font-semibold leading-none">Profile</span>
          </button>
                    <button
            type="button"
            onClick={() => navigate("/settings")}
            aria-current={isActive("/settings") ? "page" : undefined}
            className={`group flex h-full flex-col items-center justify-center gap-1 transition ${
              isActive("/settings")
                ? "text-violet-700"
                : "text-slate-500 hover:text-violet-600"
            }`}
          >
            <span className={`flex h-8 w-10 items-center justify-center rounded-xl transition ${
              isActive("/settings")
                ? "bg-violet-100 text-violet-700 shadow-[0_0_14px_rgba(139,92,246,0.15)]"
                : "group-hover:bg-violet-50"
            }`}>
              <Settings size={21} strokeWidth={isActive("/settings") ? 2.4 : 1.8} />
            </span>
            <span className="text-[10px] font-semibold leading-none">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default StudentHome;
