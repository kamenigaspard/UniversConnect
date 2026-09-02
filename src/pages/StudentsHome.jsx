// ============================================================
// StudentHome.jsx
// ------------------------------------------------------------
// Main home/feed page for students.
//
// This page is responsible for:
// 1. Displaying the student's school information.
// 2. Displaying the administrator spotlight carousel.
// 3. Displaying the "Create a post" area.
// 4. Loading university posts 25 at a time.
// 5. Automatically loading more posts when the student scrolls.
// 6. Displaying likes and comments through PostCard.
// 7. Providing the bottom navigation.
// ============================================================

import { useEffect, useRef, useState } from "react";

import {
  Bell,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Home,
  MessageCircle,
  Plus,
  Search,
  Send,
  User,
  Users,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

import PostCard from "../components/PostCard";


// ============================================================
// StudentHome Component
// ============================================================

const StudentHome = () => {
  // ----------------------------------------------------------
  // React Router navigation
  // ----------------------------------------------------------

  const navigate = useNavigate();


  // ----------------------------------------------------------
  // Authentication context
  //
  // user    = currently authenticated Supabase user
  // profile = profile information from our profiles table
  // ----------------------------------------------------------

  const { user, profile } = useAuth();


  // ==========================================================
  // SCHOOL STATE
  // ==========================================================

  const [school, setSchool] = useState(null);

  const [schoolLoading, setSchoolLoading] = useState(true);

  const [schoolError, setSchoolError] = useState("");


  // ==========================================================
  // ADMIN SPOTLIGHT STATE
  // ==========================================================

  const [spotlights, setSpotlights] = useState([]);

  const [currentSpotlight, setCurrentSpotlight] = useState(0);


  // ==========================================================
  // POSTS / FEED STATE
  // ==========================================================

  // The posts currently displayed in the feed.
  const [posts, setPosts] = useState([]);


  // ----------------------------------------------------------
  // Number of posts loaded at a time.
  //
  // Example:
  // First request  = posts 1 - 25
  // Second request = posts 26 - 50
  // Third request  = posts 51 - 75
  // ----------------------------------------------------------

  const PAGE_SIZE = 25;


  // ----------------------------------------------------------
  // Current page number.
  //
  // Page 0 = first 25 posts
  // Page 1 = next 25 posts
  // Page 2 = next 25 posts
  // ----------------------------------------------------------

  const [page, setPage] = useState(0);


  // ----------------------------------------------------------
  // Loading state for the first batch of posts.
  // ----------------------------------------------------------

  const [postsLoading, setPostsLoading] = useState(true);


  // ----------------------------------------------------------
  // Loading state for additional posts.
  //
  // This is different from postsLoading because we do not want
  // to replace the existing feed with a large loading screen
  // when loading page 2, 3, 4, etc.
  // ----------------------------------------------------------

  const [loadingMore, setLoadingMore] = useState(false);


  // ----------------------------------------------------------
  // Determines whether more posts are available.
  //
  // true  = there may be more posts
  // false = we have reached the end of the feed
  // ----------------------------------------------------------

  const [hasMorePosts, setHasMorePosts] = useState(true);


  // ----------------------------------------------------------
  // Stores any feed loading error.
  // ----------------------------------------------------------

  const [postsError, setPostsError] = useState("");


  // ----------------------------------------------------------
  // Current authenticated user's ID.
  //
  // This is passed to PostCard so the component knows which
  // user is currently viewing/liking/commenting.
  // ----------------------------------------------------------

  const [currentUserId, setCurrentUserId] = useState(null);


  // ==========================================================
  // GENERAL PAGE LOADING STATE
  // ==========================================================

  const [loading, setLoading] = useState(true);


  // ==========================================================
  // INFINITE SCROLL REFS
  // ==========================================================

  // This element will be placed below the feed.
  //
  // When it becomes visible on the screen, we load another
  // 25 posts.
  const loadMoreRef = useRef(null);


  // ----------------------------------------------------------
  // Prevents multiple simultaneous requests.
  //
  // IntersectionObserver can fire multiple times very quickly.
  // This ref prevents duplicate Supabase requests.
  // ----------------------------------------------------------

  const loadingMoreRef = useRef(false);


  // ==========================================================
  // INITIAL PAGE LOAD
  // ==========================================================

  useEffect(() => {
    // We cannot load school/posts until the profile exists.
    if (!profile) {
      return;
    }


    // --------------------------------------------------------
    // A student must belong to a school.
    // --------------------------------------------------------

    if (!profile.school_id) {
      setLoading(false);

      setSchoolLoading(false);

      setSchoolError(
        "Your account has not been assigned to a school."
      );

      return;
    }


    // --------------------------------------------------------
    // Load the authenticated user.
    // --------------------------------------------------------

    getCurrentUser();


    // --------------------------------------------------------
    // Load the first 25 posts.
    // --------------------------------------------------------

    loadPosts(0);


    // --------------------------------------------------------
    // Load school information.
    // --------------------------------------------------------

    loadSchool();


    // --------------------------------------------------------
    // Load administrator spotlight information.
    // --------------------------------------------------------

    loadSpotlights();


    // --------------------------------------------------------
    // Load other home-page information.
    // --------------------------------------------------------

    loadHomeData();

  }, [profile]);


  // ==========================================================
  // GET CURRENT USER
  // ==========================================================

  const getCurrentUser = async () => {
    try {
      const {
        data: { user: authenticatedUser },
        error,
      } = await supabase.auth.getUser();


      if (error) {
        throw error;
      }


      if (authenticatedUser) {
        setCurrentUserId(authenticatedUser.id);
      }

    } catch (error) {
      console.error(
        "Error getting current user:",
        error
      );
    }
  };


  // ==========================================================
  // LOAD POSTS
  //
  // This function loads 25 posts at a time.
  //
  // pageNumber = 0
  //      Loads the first 25 posts.
  //
  // pageNumber = 1
  //      Loads posts 26 - 50.
  //
  // pageNumber = 2
  //      Loads posts 51 - 75.
  // ==========================================================

  const loadPosts = async (pageNumber = 0) => {

    // --------------------------------------------------------
    // Calculate the database range.
    //
    // Example for page 0:
    // from = 0
    // to   = 24
    //
    // Example for page 1:
    // from = 25
    // to   = 49
    // --------------------------------------------------------

    const from = pageNumber * PAGE_SIZE;

    const to = from + PAGE_SIZE - 1;


    // --------------------------------------------------------
    // First page uses the main loading indicator.
    // --------------------------------------------------------

    if (pageNumber === 0) {

      setPostsLoading(true);

      // Reset pagination when starting over.
      setHasMorePosts(true);

    }

    // --------------------------------------------------------
    // Additional pages use the small "Loading more posts..."
    // indicator at the bottom.
    // --------------------------------------------------------

    else {

      setLoadingMore(true);

      loadingMoreRef.current = true;

    }


    // Clear previous errors.
    setPostsError("");


    try {

      // ======================================================
      // GET AUTHENTICATED USER
      // ======================================================

      const {
        data: { user: authenticatedUser },
        error: userError,
      } = await supabase.auth.getUser();


      if (userError) {
        throw userError;
      }


      if (!authenticatedUser) {
        throw new Error(
          "You must be logged in to view the feed."
        );
      }


      // Store current user ID.
      setCurrentUserId(authenticatedUser.id);


      // ======================================================
      // LOAD POSTS
      // ======================================================

      const {
        data: postsData,
        error: postsError,
      } = await supabase

        .from("posts")

        // ----------------------------------------------------
        // Select post information together with:
        //
        // profiles
        // schools
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // Only show posts that have not been deleted.
        // ----------------------------------------------------

        .eq("is_deleted", false)

        // ----------------------------------------------------
        // Newest posts first.
        // ----------------------------------------------------

        .order("created_at", {
          ascending: false,
        })

        // ----------------------------------------------------
        // Load only the current 25-post page.
        // ----------------------------------------------------

        .range(from, to);


      if (postsError) {
        throw postsError;
      }


      // Make sure we always have an array.
      const currentPosts = postsData || [];


      // ======================================================
      // DETERMINE WHETHER MORE POSTS EXIST
      // ======================================================

      // If Supabase returned fewer than 25 posts, we have
      // reached the end of the feed.
      if (currentPosts.length < PAGE_SIZE) {

        setHasMorePosts(false);

      } else {

        setHasMorePosts(true);

      }


      // ======================================================
      // GET POST IDS
      // ======================================================

      const postIds = currentPosts.map(
        (post) => post.id
      );


      // ======================================================
      // USER LIKES
      // ======================================================

      let userLikes = [];


      if (postIds.length > 0) {

        const {
          data,
          error: likesError,
        } = await supabase

          .from("likes")

          .select("post_id")

          .eq(
            "user_id",
            authenticatedUser.id
          )

          .in(
            "post_id",
            postIds
          );


        if (likesError) {
          throw likesError;
        }


        userLikes = data || [];

      }


      // ------------------------------------------------------
      // Convert user's liked posts into a Set.
      //
      // Set makes checking whether a post is liked very fast.
      // ------------------------------------------------------

      const likedPostIds = new Set(
        userLikes.map(
          (like) => like.post_id
        )
      );


      // ======================================================
      // GET LIKE COUNTS
      // ======================================================

      const likeCounts = {};


      if (postIds.length > 0) {

        const {
          data: allLikes,
          error: allLikesError,
        } = await supabase

          .from("likes")

          .select("post_id")

          .in(
            "post_id",
            postIds
          );


        if (allLikesError) {
          throw allLikesError;
        }


        // Count likes for each post.
        (allLikes || []).forEach((like) => {

          likeCounts[like.post_id] =
            (likeCounts[like.post_id] || 0) + 1;

        });

      }


      // ======================================================
      // GET COMMENT COUNTS
      // ======================================================

      const commentCounts = {};


      if (postIds.length > 0) {

        const {
          data: allComments,
          error: commentsError,
        } = await supabase

          .from("comments")

          .select("post_id")

          .in(
            "post_id",
            postIds
          )

          .eq(
            "is_deleted",
            false
          );


        if (commentsError) {
          throw commentsError;
        }


        // Count comments for every post.
        (allComments || []).forEach((comment) => {

          commentCounts[comment.post_id] =
            (commentCounts[comment.post_id] || 0) + 1;

        });

      }


      // ======================================================
      // FORMAT POSTS
      // ======================================================

      const formattedPosts =
        currentPosts.map((post) => ({

          ...post,

          // Whether the current user liked this post.
          isLiked: likedPostIds.has(post.id),

          // Number of likes.
          likeCount:
            likeCounts[post.id] || 0,

          // Number of comments.
          commentCount:
            commentCounts[post.id] || 0,

        }));


      // ======================================================
      // UPDATE FEED
      // ======================================================

      if (pageNumber === 0) {

        // First page replaces the current feed.
        setPosts(formattedPosts);

      } else {

        // Additional pages are appended to the existing feed.
        setPosts((previousPosts) => [
          ...previousPosts,
          ...formattedPosts,
        ]);

      }


      // Store the current page number.
      setPage(pageNumber);


    } catch (error) {

      console.error(
        "Error loading posts:",
        error
      );


      setPostsError(
        error.message ||
        "Unable to load posts."
      );


    } finally {

      // Stop the loading indicators.
      setPostsLoading(false);

      setLoadingMore(false);

      loadingMoreRef.current = false;

    }

  };


  // ==========================================================
  // INFINITE SCROLL
  //
  // IntersectionObserver watches the element at the bottom
  // of the feed.
  //
  // When the user gets close to it, another 25 posts are
  // automatically loaded.
  // ==========================================================

  useEffect(() => {

    // If the sentinel does not exist yet, stop.
    if (!loadMoreRef.current) {
      return;
    }


    // If there are no more posts, stop observing.
    if (!hasMorePosts) {
      return;
    }


    // --------------------------------------------------------
    // Create the observer.
    // --------------------------------------------------------

    const observer =
      new IntersectionObserver(

        (entries) => {

          const entry = entries[0];


          // The bottom element is not visible yet.
          if (!entry.isIntersecting) {
            return;
          }


          // Prevent multiple simultaneous requests.
          if (loadingMoreRef.current) {
            return;
          }


          // Do not load another page while the first page
          // is still loading.
          if (postsLoading) {
            return;
          }


          // Mark loading immediately.
          loadingMoreRef.current = true;


          // Load the next page.
          loadPosts(page + 1);

        },

        {
          // Start loading when the user is approximately
          // 500px away from the bottom.
          rootMargin: "500px 0px",

          threshold: 0,

        }

      );


    // Start observing the sentinel.
    observer.observe(loadMoreRef.current);


    // --------------------------------------------------------
    // Clean up the observer when dependencies change.
    // --------------------------------------------------------

    return () => {
      observer.disconnect();
    };

  }, [
    page,
    hasMorePosts,
    postsLoading,
  ]);


  // ==========================================================
  // LOAD SCHOOL
  // ==========================================================

  const loadSchool = async () => {

    if (!profile?.school_id) {
      return;
    }


    setSchoolLoading(true);

    setSchoolError("");


    try {

      const {
        data,
        error,
      } = await supabase

        .from("schools")

        .select(`
          id,
          name,
          code,
          logo_url,
          description,
          is_active
        `)

        .eq(
          "id",
          profile.school_id
        )

        .single();


      if (error) {
        throw error;
      }


      setSchool(data);


    } catch (error) {

      console.error(
        "Error loading school:",
        error
      );


      setSchoolError(
        error.message ||
        "Unable to load school information."
      );


    } finally {

      setSchoolLoading(false);

    }

  };


  // ==========================================================
  // LOAD ADMIN SPOTLIGHTS
  // ==========================================================

  const loadSpotlights = async () => {

    if (!profile?.school_id) {
      return;
    }


    try {

      const {
        data,
        error,
      } = await supabase

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
          created_at,

          profiles (
            id,
            full_name,
            username,
            avatar_url,
            role
          )
        `)

        .eq(
          "school_id",
          profile.school_id
        )

        .eq(
          "is_active",
          true
        )

        .order(
          "display_order",
          {
            ascending: true,
          }
        );


      if (error) {
        throw error;
      }


      setSpotlights(data || []);

      // Make sure the carousel starts from the first item.
      setCurrentSpotlight(0);


    } catch (error) {

      console.error(
        "Error loading spotlights:",
        error
      );

    }

  };


  // ==========================================================
  // LOAD HOME DATA
  //
  // This function can later be expanded with additional
  // student-home information.
  // ==========================================================

  const loadHomeData = async () => {

    try {

      // ------------------------------------------------------
      // The school is already loaded by loadSchool().
      //
      // This function currently only controls the general
      // loading state.
      // ------------------------------------------------------

      setLoading(false);

    } catch (error) {

      console.error(
        "Error loading home data:",
        error
      );

      setLoading(false);

    }

  };


  // ==========================================================
  // SPOTLIGHT NAVIGATION
  // ==========================================================

  const previousSpotlight = () => {

    if (spotlights.length === 0) {
      return;
    }


    setCurrentSpotlight(
      (previous) =>
        previous === 0
          ? spotlights.length - 1
          : previous - 1
    );

  };


  const nextSpotlight = () => {

    if (spotlights.length === 0) {
      return;
    }


    setCurrentSpotlight(
      (previous) =>
        previous === spotlights.length - 1
          ? 0
          : previous + 1
    );

  };


  // ==========================================================
  // HANDLE CREATE POST
  // ==========================================================

  const handleCreatePost = () => {
    navigate("/create-post");
  };


  // ==========================================================
  // HANDLE RETRY
  // ==========================================================

  const handleRetryPosts = () => {

    // Start again from page 0.
    setPage(0);

    setHasMorePosts(true);

    loadPosts(0);

  };


  // ==========================================================
  // GENERAL LOADING SCREEN
  // ==========================================================

  if (loading && !profile) {

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">

        <div className="flex flex-col items-center gap-3">

          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

          <p className="text-sm text-gray-500">
            Loading your home...
          </p>

        </div>

      </div>
    );

  }


  // ==========================================================
  // MAIN PAGE
  // ==========================================================

  return (

    <div className="min-h-screen bg-gray-50 pb-20">


      {/* ====================================================
          HEADER
          ==================================================== */}

      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">

        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">


          {/* ------------------------------------------------
              SCHOOL INFORMATION
              ------------------------------------------------ */}

          <div className="flex min-w-0 items-center gap-3">

            {school?.logo_url ? (

              <img
                src={school.logo_url}
                alt={school.name || "School logo"}
                className="h-10 w-10 rounded-full object-cover ring-1 ring-gray-200"
              />

            ) : (

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">

                <Users
                  size={20}
                />

              </div>

            )}


            <div className="min-w-0">

              <h1 className="truncate text-sm font-semibold text-gray-900">
                {schoolLoading
                  ? "Loading school..."
                  : school?.name || "University"}
              </h1>


              <p className="truncate text-xs text-gray-500">
                {profile?.full_name ||
                  profile?.username ||
                  "Student"}
              </p>

            </div>

          </div>


          {/* ------------------------------------------------
              HEADER ACTIONS
              ------------------------------------------------ */}

          <div className="flex items-center gap-1">

            <button
              type="button"
              onClick={() => navigate("/search")}
              className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
              aria-label="Search"
            >
              <Search size={21} />
            </button>


            <button
              type="button"
              onClick={() => navigate("/notifications")}
              className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
              aria-label="Notifications"
            >
              <Bell size={21} />
            </button>


            <button
              type="button"
              onClick={() => navigate("/messages")}
              className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
              aria-label="Messages"
            >
              <Send size={21} />
            </button>

          </div>

        </div>

      </header>


      {/* ====================================================
          MAIN CONTENT
          ==================================================== */}

      <main className="mx-auto max-w-3xl px-3 sm:px-4">


        {/* ==================================================
            SCHOOL ERROR
            ================================================== */}

        {schoolError && (

          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">

            <p className="text-sm text-red-700">
              {schoolError}
            </p>

          </div>

        )}


        {/* ==================================================
            ADMIN SPOTLIGHT
            ================================================== */}

        {spotlights.length > 0 && (

          <section className="mt-4">

            <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">


              {/* ------------------------------------------------
                  SPOTLIGHT IMAGE
                  ------------------------------------------------ */}

              <div className="relative aspect-[16/8] w-full overflow-hidden bg-gray-100">

                {spotlights[currentSpotlight]?.image_url ? (

                  <img
                    src={
                      spotlights[currentSpotlight]
                        .image_url
                    }
                    alt={
                      spotlights[currentSpotlight]
                        .title ||
                      "Administrator spotlight"
                    }
                    className="h-full w-full object-cover"
                  />

                ) : (

                  <div className="flex h-full items-center justify-center bg-gray-100">

                    <Users
                      size={48}
                      className="text-gray-300"
                    />

                  </div>

                )}


                {/* ------------------------------------------------
                    LEFT ARROW
                    ------------------------------------------------ */}

                {spotlights.length > 1 && (

                  <button
                    type="button"
                    onClick={previousSpotlight}
                    className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60"
                    aria-label="Previous spotlight"
                  >
                    <ChevronLeft size={20} />
                  </button>

                )}


                {/* ------------------------------------------------
                    RIGHT ARROW
                    ------------------------------------------------ */}

                {spotlights.length > 1 && (

                  <button
                    type="button"
                    onClick={nextSpotlight}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60"
                    aria-label="Next spotlight"
                  >
                    <ChevronRight size={20} />
                  </button>

                )}

              </div>


              {/* ------------------------------------------------
                  SPOTLIGHT DETAILS
                  ------------------------------------------------ */}

              <div className="p-4">

                <div className="flex items-center gap-3">

                  {spotlights[currentSpotlight]?.profiles?.avatar_url ? (

                    <img
                      src={
                        spotlights[
                          currentSpotlight
                        ].profiles.avatar_url
                      }
                      alt={
                        spotlights[
                          currentSpotlight
                        ].profiles.full_name ||
                        "Administrator"
                      }
                      className="h-9 w-9 rounded-full object-cover"
                    />

                  ) : (

                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">

                      <User size={18} />

                    </div>

                  )}


                  <div>

                    <p className="text-sm font-semibold text-gray-900">
                      {
                        spotlights[
                          currentSpotlight
                        ]?.profiles?.full_name ||
                        "Administrator"
                      }
                    </p>

                    <p className="text-xs text-gray-500">
                      Administrator Spotlight
                    </p>

                  </div>

                </div>


                {spotlights[currentSpotlight]?.title && (

                  <h2 className="mt-3 text-base font-semibold text-gray-900">
                    {
                      spotlights[
                        currentSpotlight
                      ].title
                    }
                  </h2>

                )}


                {spotlights[currentSpotlight]?.description && (

                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    {
                      spotlights[
                        currentSpotlight
                      ].description
                    }
                  </p>

                )}


                {/* Spotlight indicators */}

                {spotlights.length > 1 && (

                  <div className="mt-4 flex justify-center gap-1.5">

                    {spotlights.map(
                      (spotlight, index) => (

                        <button
                          key={spotlight.id}
                          type="button"
                          onClick={() =>
                            setCurrentSpotlight(
                              index
                            )
                          }
                          className={`h-1.5 rounded-full transition-all ${
                            index ===
                            currentSpotlight
                              ? "w-5 bg-blue-600"
                              : "w-1.5 bg-gray-300"
                          }`}
                          aria-label={`Show spotlight ${
                            index + 1
                          }`}
                        />

                      )
                    )}

                  </div>

                )}

              </div>

            </div>

          </section>

        )}


        {/* ==================================================
            CREATE POST CARD
            ================================================== */}

        <section className="mt-4">

          <button
            type="button"
            onClick={handleCreatePost}
            className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-100 transition hover:ring-gray-200"
          >

            {profile?.avatar_url ? (

              <img
                src={profile.avatar_url}
                alt={
                  profile.full_name ||
                  "Your profile"
                }
                className="h-10 w-10 rounded-full object-cover"
              />

            ) : (

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">

                <User size={20} />

              </div>

            )}


            <div className="flex-1 rounded-full bg-gray-100 px-4 py-2.5">

              <span className="text-sm text-gray-500">
                What's happening at your university?
              </span>

            </div>


            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">

              <Plus size={20} />

            </div>

          </button>

        </section>


        {/* ==================================================
            FEED
            ================================================== */}

        <section className="mt-4 space-y-4">


          {/* ------------------------------------------------
              INITIAL POSTS LOADING
              ------------------------------------------------ */}

          {postsLoading && (

            <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-12 shadow-sm ring-1 ring-gray-100">

              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

              <p className="mt-3 text-sm text-gray-500">
                Loading posts...
              </p>

            </div>

          )}


          {/* ------------------------------------------------
              POSTS ERROR
              ------------------------------------------------ */}

          {!postsLoading && postsError && (

            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">

              <p className="text-sm font-medium text-red-700">
                {postsError}
              </p>


              <button
                type="button"
                onClick={handleRetryPosts}
                className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Try again
              </button>

            </div>

          )}


          {/* ------------------------------------------------
              NO POSTS
              ------------------------------------------------ */}

          {!postsLoading &&
            !postsError &&
            posts.length === 0 && (

              <div className="rounded-2xl bg-white px-5 py-12 text-center shadow-sm ring-1 ring-gray-100">

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">

                  <MessageCircle
                    size={26}
                    className="text-gray-400"
                  />

                </div>


                <h2 className="mt-4 text-base font-semibold text-gray-900">
                  No posts yet
                </h2>


                <p className="mt-1 text-sm text-gray-500">
                  Be the first person to share something
                  with your university community.
                </p>


                <button
                  type="button"
                  onClick={handleCreatePost}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >

                  <Plus size={17} />

                  Create a post

                </button>

              </div>

            )}


          {/* ------------------------------------------------
              DISPLAY POSTS
              ------------------------------------------------ */}

          {!postsLoading &&
            !postsError &&
            posts.map((post) => (

              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
              />

            ))}


          {/* ==================================================
              INFINITE SCROLL SENTINEL
              ==================================================
              
              This invisible/visible area sits underneath the
              posts.

              When it enters the viewport, loadPosts(page + 1)
              automatically loads another 25 posts.
              ================================================== */}

          {!postsError &&
            posts.length > 0 &&
            hasMorePosts && (

              <div
                ref={loadMoreRef}
                className="flex min-h-[80px] items-center justify-center"
              >

                {loadingMore && (

                  <div className="flex items-center gap-3 text-sm text-gray-500">

                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />

                    <span>
                      Loading more posts...
                    </span>

                  </div>

                )}

              </div>

            )}


          {/* ==================================================
              END OF FEED
              ================================================== */}

          {!postsError &&
            posts.length > 0 &&
            !hasMorePosts && (

              <div className="py-8 text-center">

                <p className="text-sm font-medium text-gray-500">
                  You've reached the end of the feed.
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  No more posts to show.
                </p>

              </div>

            )}

        </section>

      </main>


      {/* ====================================================
          BOTTOM NAVIGATION
          ==================================================== */}

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur">

        <div className="mx-auto flex max-w-3xl items-center justify-around px-2 py-2">


          {/* HOME */}

          <button
            type="button"
            onClick={() =>
              navigate("/student-home")
            }
            className="flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 text-blue-600"
          >

            <Home size={21} />

            <span className="text-[11px] font-medium">
              Home
            </span>

          </button>


          {/* SEARCH */}

          <button
            type="button"
            onClick={() =>
              navigate("/search")
            }
            className="flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 text-gray-500 hover:text-gray-900"
          >

            <Search size={21} />

            <span className="text-[11px]">
              Search
            </span>

          </button>


          {/* CREATE POST */}

          <button
            type="button"
            onClick={handleCreatePost}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700"
            aria-label="Create post"
          >

            <Plus size={23} />

          </button>


          {/* MESSAGES */}

          <button
            type="button"
            onClick={() =>
              navigate("/messages")
            }
            className="flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 text-gray-500 hover:text-gray-900"
          >

            <MessageCircle size={21} />

            <span className="text-[11px]">
              Messages
            </span>

          </button>


          {/* PROFILE */}

          <button
            type="button"
            onClick={() =>
              navigate("/profile")
            }
            className="flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 text-gray-500 hover:text-gray-900"
          >

            <User size={21} />

            <span className="text-[11px]">
              Profile
            </span>

          </button>

        </div>

      </nav>

    </div>

  );
};


// ============================================================
// EXPORT COMPONENT
// ============================================================

export default StudentHome;