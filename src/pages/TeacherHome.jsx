
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
  Settings,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import PostCard from "../components/PostCard";
import BottomNavbar from "../components/BottomNavbar";

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
          : "translate-y-10 scale-95 opacity-0"
      }`}
    >
      {children}
    </div>
  );
};

// ============================================================
// TeacherHome
// ============================================================

const TeacherHome = () => {
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-100 border-t-violet-600 shadow-[0_0_14px_rgba(139,92,246,0.35)]" />
          <p className="text-sm text-gray-500">Loading your home...</p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // MAIN PAGE
  // ==========================================================

  const isActive = (path) => location.pathname === path;

  const navItems = [
    {
      label: "Home",
      path: "/teacher-home",
      icon: Home,
    },
    {
      label: "Search",
      path: "/search",
      icon: Search,
    },
    {
      label: "Requests",
      path: "/requests",
      icon: Heart,
    },
    {
      label: "Profile",
      path: "/profile",
      icon: User,
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(196,181,253,0.22),_transparent_42%),linear-gradient(180deg,#fcfaff_0%,#f8f5ff_55%,#ffffff_100%)] pb-24 text-slate-900 selection:bg-violet-200">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-violet-200/70 bg-white/80 shadow-[0_4px_24px_rgba(124,58,237,0.08)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {school?.logo_url ? (
              <img
                src={school.logo_url}
                alt={school.name || "School logo"}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-violet-300/70 shadow-[0_0_14px_rgba(139,92,246,0.25)]"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-200/80 bg-gradient-to-br from-violet-100 via-purple-100 to-fuchsia-100 text-violet-700 shadow-[0_0_18px_rgba(139,92,246,0.25)]">
                <Users size={20} />
              </div>
            )}

            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-gray-900">
                {schoolLoading ? "Loading school..." : school?.name || "University"}
              </h1>
              <p className="truncate text-xs text-gray-500">
                {profile?.full_name || profile?.username || "Student"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/notifications")}
              className="rounded-full border border-violet-200/70 bg-gradient-to-br from-white/95 via-violet-50/90 to-fuchsia-100/80 p-2 text-violet-700 shadow-[0_0_14px_rgba(139,92,246,0.18)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-[0_0_22px_rgba(139,92,246,0.38)] active:scale-95"
              aria-label="Notifications"
            >
              <Bell size={21} />
            </button>

            <button
              type="button"
              onClick={() => navigate("/messages")}
              className="rounded-full border border-violet-200/70 bg-gradient-to-br from-white/95 via-violet-50/90 to-fuchsia-100/80 p-2 text-violet-700 shadow-[0_0_14px_rgba(139,92,246,0.18)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-[0_0_22px_rgba(139,92,246,0.38)] active:scale-95"
              aria-label="Messages"
            >
              <Send size={21} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-3 sm:px-4">
        {/* SCHOOL ERROR */}
        {schoolError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{schoolError}</p>
          </div>
        )}

        {/* ADMIN SPOTLIGHT */}
        {spotlights.length > 0 && (
          <section className="mt-4">
            <div className="relative overflow-hidden rounded-2xl border border-violet-200/70 bg-white/80 shadow-[0_8px_30px_rgba(109,40,217,0.10)] ring-1 ring-white/80 backdrop-blur-xl">
              <div className="relative aspect-[16/8] w-full overflow-hidden bg-gray-100">
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
                  <div className="flex h-full items-center justify-center bg-gray-100">
                    <Users size={48} className="text-gray-300" />
                  </div>
                )}

                {spotlights.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={previousSpotlight}
                      className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-violet-600/65 text-white shadow-[0_0_18px_rgba(192,132,252,0.55)] backdrop-blur-xl transition hover:bg-violet-500/85 hover:shadow-[0_0_26px_rgba(192,132,252,0.8)]"
                      aria-label="Previous spotlight"
                    >
                      <ChevronLeft size={20} />
                    </button>

                    <button
                      type="button"
                      onClick={nextSpotlight}
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-violet-600/65 text-white shadow-[0_0_18px_rgba(192,132,252,0.55)] backdrop-blur-xl transition hover:bg-violet-500/85 hover:shadow-[0_0_26px_rgba(192,132,252,0.8)]"
                      aria-label="Next spotlight"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-center gap-3">
                  {spotlights[currentSpotlight]?.profile?.avatar_url ? (
                    <img
                      src={spotlights[currentSpotlight].profile.avatar_url}
                      alt={spotlights[currentSpotlight].profile.full_name || "Administrator"}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-violet-200/80 bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700 shadow-[0_0_16px_rgba(139,92,246,0.24)]">
                      <User size={18} />
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {spotlights[currentSpotlight]?.profile?.full_name ||
                        spotlights[currentSpotlight]?.profile?.username ||
                        "Administrator"}
                    </p>
                    <p className="text-xs text-gray-500">Administrator Spotlight</p>
                  </div>
                </div>

                {spotlights[currentSpotlight]?.title && (
                  <h2 className="mt-3 text-base font-semibold text-gray-900">
                    {spotlights[currentSpotlight].title}
                  </h2>
                )}

                {spotlights[currentSpotlight]?.description && (
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    {spotlights[currentSpotlight].description}
                  </p>
                )}

                {spotlights.length > 1 && (
                  <div className="mt-4 flex justify-center gap-1.5">
                    {spotlights.map((spotlight, index) => (
                      <button
                        key={spotlight.id}
                        type="button"
                        onClick={() => setCurrentSpotlight(index)}
                        className={`h-1.5 rounded-full transition-all ${
                          index === currentSpotlight
                            ? "w-5 bg-gradient-to-r from-violet-500 via-purple-600 to-fuchsia-500 shadow-[0_0_12px_rgba(168,85,247,0.75)]"
                            : "w-1.5 bg-gray-300"
                        }`}
                        aria-label={`Show spotlight ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* CREATE POST CARD */}
        <section className="mt-4">
          <button
            type="button"
            onClick={handleCreatePost}
            className="group flex w-full items-center gap-3 rounded-2xl border border-violet-200/70 bg-white/75 p-4 text-left shadow-[0_8px_28px_rgba(109,40,217,0.08)] ring-1 ring-white/80 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-[0_12px_34px_rgba(124,58,237,0.17)]"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || "Your profile"}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-violet-200/80 bg-gradient-to-br from-violet-100 via-purple-100 to-fuchsia-100 text-violet-700 shadow-[0_0_18px_rgba(139,92,246,0.25)]">
                <User size={20} />
              </div>
            )}

            <div className="flex-1 rounded-full border border-violet-200/70 bg-gradient-to-r from-violet-50/90 via-white/90 to-fuchsia-50/80 px-4 py-2.5 shadow-inner shadow-violet-100/70 transition group-hover:border-violet-300">
              <span className="text-sm text-gray-500">
                What's happening at your university?
              </span>
            </div>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/70 bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.85),0_0_26px_rgba(124,58,237,0.45)] transition duration-200 group-hover:scale-105 group-hover:shadow-[0_0_16px_rgba(192,132,252,1),0_0_34px_rgba(124,58,237,0.55)] active:scale-95">
              <Plus size={20} />
            </div>
          </button>
        </section>

        {/* FEED */}
        <section className="mt-4 space-y-4">
          {postsLoading && (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-12 shadow-sm ring-1 ring-gray-100">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-100 border-t-violet-600 shadow-[0_0_14px_rgba(139,92,246,0.35)]" />
              <p className="mt-3 text-sm text-gray-500">Loading posts...</p>
            </div>
          )}

          {!postsLoading && postsError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
              <p className="text-sm font-medium text-red-700">{postsError}</p>
              <button
                type="button"
                onClick={handleRetryPosts}
                className="mt-3 rounded-xl border border-red-200 bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(220,38,38,0.22)] transition hover:bg-red-700"
              >
                Try again
              </button>
            </div>
          )}

          {!postsLoading && !postsError && posts.length === 0 && (
            <div className="rounded-2xl bg-white px-5 py-12 text-center shadow-sm ring-1 ring-gray-100">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-violet-200/80 bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700 shadow-[0_0_24px_rgba(139,92,246,0.22)]">
                <MessageCircle size={26} className="text-gray-400" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-gray-900">No posts yet</h2>
              <p className="mt-1 text-sm text-gray-500">
                Be the first person to share something with your university community.
              </p>
              <button
                type="button"
                onClick={handleCreatePost}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/60 bg-gradient-to-r from-violet-500 via-purple-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_12px_rgba(168,85,247,0.55),0_6px_18px_rgba(109,40,217,0.22)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(192,132,252,0.8),0_8px_24px_rgba(109,40,217,0.30)] active:scale-95"
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
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-100 border-t-violet-600 shadow-[0_0_10px_rgba(139,92,246,0.35)]" />
                  <span>Loading more posts...</span>
                </div>
              )}
            </div>
          )}

          {!postsError && posts.length > 0 && !hasMorePosts && (
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-gray-500">
                You've reached the end of the feed.
              </p>
              <p className="mt-1 text-xs text-gray-400">No more posts to show.</p>
            </div>
          )}
        </section>
      </main>

      {/* ======================================================
          FIXED BOTTOM NAVIGATION
          Home | Search | Create | Requests | Profile
          ====================================================== */}
        <BottomNavbar
        items={[
            { label: "Home", path: "/teacher-home", icon: Home },
            { label: "Search", path: "/search", icon: Search },
            { label: "Requests", path: "/requests", icon: Heart },
            { label: "Settings", path: "/settings", icon: Settings },
        ]}
        createPath="/create-post"
        />           
    </div>
  );
};

export default TeacherHome;
