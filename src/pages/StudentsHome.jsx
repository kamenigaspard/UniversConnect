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
//
// IMPORTANT SPOTLIGHT FIX:
// ------------------------------------------------------------
// admin_spotlights contains more than one relationship to
// profiles.
//
// For example:
//
// admin_spotlights.profile_id  -> profiles.id
// admin_spotlights.created_by  -> profiles.id
//
// Therefore, Supabase cannot safely use:
//
// profiles(...)
//
// inside the admin_spotlights query without knowing which
// relationship should be used.
//
// We solve this by:
//
// 1. Loading admin_spotlights separately.
// 2. Collecting profile_id values.
// 3. Loading the matching profiles separately.
// 4. Combining spotlight + profile in JavaScript.
//
// The final object looks like:
//
// {
//   id: "...",
//   profile_id: "...",
//   title: "...",
//   description: "...",
//   image_url: "...",
//   profile: {
//      id: "...",
//      full_name: "...",
//      username: "...",
//      avatar_url: "...",
//      role: "..."
//   }
// }
// ============================================================

import {
  useEffect,
  useRef,
  useState,
} from "react";

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
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

import { supabase } from "../lib/supabase";

import PostCard from "../components/PostCard";


// ============================================================
// StudentHome Component
// ============================================================

const StudentHome = () => {

  // ==========================================================
  // ROUTER
  // ==========================================================

  const navigate = useNavigate();


  // ==========================================================
  // AUTHENTICATION
  // ==========================================================
  //
  // user    = authenticated Supabase user
  // profile = user's profile from the profiles table
  // ==========================================================

  const {
    user,
    profile,
  } = useAuth();


  // ==========================================================
  // SCHOOL STATE
  // ==========================================================

  const [school, setSchool] =
    useState(null);

  const [schoolLoading, setSchoolLoading] =
    useState(true);

  const [schoolError, setSchoolError] =
    useState("");


  // ==========================================================
  // ADMIN SPOTLIGHT STATE
  // ==========================================================

  const [spotlights, setSpotlights] =
    useState([]);

  const [currentSpotlight, setCurrentSpotlight] =
    useState(0);


  // ==========================================================
  // POSTS / FEED STATE
  // ==========================================================

  const [posts, setPosts] =
    useState([]);


  // ==========================================================
  // PAGINATION
  // ==========================================================

  // Number of posts loaded per request.
  const PAGE_SIZE = 25;


  // Current page.
  //
  // Page 0 = posts 1 - 25
  // Page 1 = posts 26 - 50
  // Page 2 = posts 51 - 75
  const [page, setPage] =
    useState(0);


  // ==========================================================
  // POST LOADING STATES
  // ==========================================================

  const [postsLoading, setPostsLoading] =
    useState(true);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const [hasMorePosts, setHasMorePosts] =
    useState(true);

  const [postsError, setPostsError] =
    useState("");


  // ==========================================================
  // CURRENT USER ID
  // ==========================================================

  const [currentUserId, setCurrentUserId] =
    useState(
      user?.id || null
    );


  // ==========================================================
  // GENERAL PAGE LOADING
  // ==========================================================

  const [loading, setLoading] =
    useState(true);


  // ==========================================================
  // INFINITE SCROLL REFS
  // ==========================================================

  // Element at the bottom of the feed.
  const loadMoreRef =
    useRef(null);


  // Prevents multiple simultaneous
  // pagination requests.
  const loadingMoreRef =
    useRef(false);


  // ==========================================================
  // KEEP CURRENT USER ID IN SYNC WITH AUTH CONTEXT
  // ==========================================================

  useEffect(() => {

    if (user?.id) {

      setCurrentUserId(user.id);

    }

  }, [user]);


  // ==========================================================
  // INITIAL PAGE LOAD
  // ==========================================================

  useEffect(() => {

    // --------------------------------------------------------
    // We cannot load school-specific information until the
    // user's profile is available.
    // --------------------------------------------------------

    if (!profile) {
      return;
    }


    // --------------------------------------------------------
    // The user must belong to a school.
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
    // Load current authenticated user.
    // --------------------------------------------------------

    getCurrentUser();


    // --------------------------------------------------------
    // Load first page of posts.
    // --------------------------------------------------------

    loadPosts(0);


    // --------------------------------------------------------
    // Load school information.
    // --------------------------------------------------------

    loadSchool();


    // --------------------------------------------------------
    // Load administrator spotlight.
    // --------------------------------------------------------

    loadSpotlights();


    // --------------------------------------------------------
    // Load other home data.
    // --------------------------------------------------------

    loadHomeData();

  }, [profile]);


  // ==========================================================
  // GET CURRENT USER
  // ==========================================================

  const getCurrentUser = async () => {

    try {

      const {
        data: {
          user: authenticatedUser,
        },
        error,
      } = await supabase.auth.getUser();


      if (error) {
        throw error;
      }


      if (authenticatedUser) {

        setCurrentUserId(
          authenticatedUser.id
        );

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
  // ==========================================================

  const loadPosts = async (
    pageNumber = 0
  ) => {

    // --------------------------------------------------------
    // Calculate pagination range.
    // --------------------------------------------------------

    const from =
      pageNumber * PAGE_SIZE;

    const to =
      from + PAGE_SIZE - 1;


    // --------------------------------------------------------
    // First page.
    // --------------------------------------------------------

    if (pageNumber === 0) {

      setPostsLoading(true);

      setHasMorePosts(true);

    }


    // --------------------------------------------------------
    // Additional pages.
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
        data: {
          user: authenticatedUser,
        },
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


      // Store authenticated user ID.
      setCurrentUserId(
        authenticatedUser.id
      );


      // ======================================================
      // LOAD POSTS
      // ======================================================

      const {
        data: postsData,
        error: postsQueryError,
      } = await supabase

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

        // ----------------------------------------------------
        // Only show posts that are not deleted.
        // ----------------------------------------------------

        .eq(
          "is_deleted",
          false
        )

        // ----------------------------------------------------
        // Newest posts first.
        // ----------------------------------------------------

        .order(
          "created_at",
          {
            ascending: false,
          }
        )

        // ----------------------------------------------------
        // Load current page.
        // ----------------------------------------------------

        .range(
          from,
          to
        );


      if (postsQueryError) {
        throw postsQueryError;
      }


      // Always work with an array.
      const currentPosts =
        postsData || [];


      // ======================================================
      // DETERMINE WHETHER MORE POSTS EXIST
      // ======================================================

      if (
        currentPosts.length <
        PAGE_SIZE
      ) {

        setHasMorePosts(false);

      } else {

        setHasMorePosts(true);

      }


      // ======================================================
      // GET POST IDS
      // ======================================================

      const postIds =
        currentPosts.map(
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

          .select(
            "post_id"
          )

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


        userLikes =
          data || [];

      }


      // ======================================================
      // CREATE SET OF LIKED POST IDS
      // ======================================================

      const likedPostIds =
        new Set(
          userLikes.map(
            (like) =>
              like.post_id
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

          .select(
            "post_id"
          )

          .in(
            "post_id",
            postIds
          );


        if (allLikesError) {
          throw allLikesError;
        }


        // Count every like belonging to each post.
        (
          allLikes || []
        ).forEach(
          (like) => {

            likeCounts[
              like.post_id
            ] =
              (
                likeCounts[
                  like.post_id
                ] || 0
              ) + 1;

          }
        );

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

          .select(
            "post_id"
          )

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
        (
          allComments || []
        ).forEach(
          (comment) => {

            commentCounts[
              comment.post_id
            ] =
              (
                commentCounts[
                  comment.post_id
                ] || 0
              ) + 1;

          }
        );

      }


      // ======================================================
      // FORMAT POSTS
      // ======================================================

      const formattedPosts =
        currentPosts.map(
          (post) => ({

            ...post,

            // Whether current user liked this post.
            isLiked:
              likedPostIds.has(
                post.id
              ),

            // Number of likes.
            likeCount:
              likeCounts[
                post.id
              ] || 0,

            // Number of comments.
            commentCount:
              commentCounts[
                post.id
              ] || 0,

          })
        );


      // ======================================================
      // UPDATE FEED
      // ======================================================

      if (
        pageNumber === 0
      ) {

        // Replace feed with first page.
        setPosts(
          formattedPosts
        );

      } else {

        // Append additional posts.
        setPosts(
          (previousPosts) => [

            ...previousPosts,

            ...formattedPosts,

          ]
        );

      }


      // Save current page.
      setPage(
        pageNumber
      );


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

      setPostsLoading(false);

      setLoadingMore(false);

      loadingMoreRef.current =
        false;

    }

  };


  // ==========================================================
  // INFINITE SCROLL
  // ==========================================================

  useEffect(() => {

    // No sentinel available yet.
    if (!loadMoreRef.current) {
      return;
    }


    // No more posts.
    if (!hasMorePosts) {
      return;
    }


    // --------------------------------------------------------
    // Create IntersectionObserver.
    // --------------------------------------------------------

    const observer =
      new IntersectionObserver(

        (entries) => {

          const entry =
            entries[0];


          // Sentinel is not visible.
          if (!entry.isIntersecting) {
            return;
          }


          // Already loading another page.
          if (
            loadingMoreRef.current
          ) {
            return;
          }


          // First page is still loading.
          if (postsLoading) {
            return;
          }


          // Prevent duplicate requests.
          loadingMoreRef.current =
            true;


          // Load next page.
          loadPosts(
            page + 1
          );

        },

        {
          rootMargin:
            "500px 0px",

          threshold:
            0,

        }

      );


    // Observe bottom sentinel.
    observer.observe(
      loadMoreRef.current
    );


    // Clean up observer.
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


      setSchool(
        data
      );


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

      setSchoolLoading(
        false
      );

    }

  };


  // ==========================================================
  // LOAD ADMIN SPOTLIGHTS
  // ==========================================================
  //
  // IMPORTANT:
  //
  // We DO NOT use:
  //
  // profiles (...)
  //
  // inside the admin_spotlights query.
  //
  // This prevents the Supabase PGRST201 error caused by
  // multiple relationships between admin_spotlights and
  // profiles.
  // ==========================================================

  const loadSpotlights = async () => {

    if (!profile?.school_id) {
      return;
    }


    try {

      // ======================================================
      // STEP 1
      // LOAD SPOTLIGHT RECORDS
      // ======================================================

      const {
        data: spotlightData,
        error: spotlightError,
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
          created_at
        `)

        // ----------------------------------------------------
        // Only spotlight records belonging to this school.
        // ----------------------------------------------------

        .eq(
          "school_id",
          profile.school_id
        )

        // ----------------------------------------------------
        // Only active spotlight records.
        // ----------------------------------------------------

        .eq(
          "is_active",
          true
        )

        // ----------------------------------------------------
        // Display configured order.
        // ----------------------------------------------------

        .order(
          "display_order",
          {
            ascending: true,
          }
        );


      // ======================================================
      // CHECK SPOTLIGHT QUERY
      // ======================================================

      if (spotlightError) {

        throw spotlightError;

      }


      // ======================================================
      // NO SPOTLIGHTS
      // ======================================================

      if (
        !spotlightData ||
        spotlightData.length === 0
      ) {

        setSpotlights([]);

        setCurrentSpotlight(0);

        return;

      }


      // ======================================================
      // STEP 2
      // COLLECT PROFILE IDS
      // ======================================================
      //
      // profile_id identifies the person displayed in the
      // spotlight.
      //
      // created_by is NOT used here because it identifies
      // the administrator who created the spotlight record.
      // ======================================================

      const profileIds = [
        ...new Set(
          spotlightData
            .map(
              (spotlight) =>
                spotlight.profile_id
            )
            .filter(Boolean)
        ),
      ];


      // ======================================================
      // STEP 3
      // LOAD PROFILES
      // ======================================================

      let profileData = [];


      if (
        profileIds.length > 0
      ) {

        const {
          data,
          error: profileError,
        } = await supabase

          .from("profiles")

          .select(`
            id,
            full_name,
            username,
            avatar_url,
            bio,
            role,
            school_id
          `)

          .in(
            "id",
            profileIds
          );


        if (profileError) {

          throw profileError;

        }


        profileData =
          data || [];

      }


      // ======================================================
      // STEP 4
      // COMBINE SPOTLIGHT + PROFILE
      // ======================================================

      const combinedSpotlights =
        spotlightData.map(
          (spotlight) => {

            // Find the profile belonging to this spotlight.
            const matchingProfile =
              profileData.find(
                (profileItem) =>
                  profileItem.id ===
                  spotlight.profile_id
              );


            return {

              ...spotlight,

              // IMPORTANT:
              // We now use "profile", singular.
              //
              // The UI below will use:
              //
              // spotlight.profile?.full_name
              //
              // instead of:
              //
              // spotlight.profiles.full_name

              profile:
                matchingProfile || null,

            };

          }
        );


      // ======================================================
      // STEP 5
      // SAVE SPOTLIGHTS
      // ======================================================

      setSpotlights(
        combinedSpotlights
      );


      // Always start carousel from first spotlight.
      setCurrentSpotlight(0);


    } catch (error) {

      console.error(
        "Error loading spotlights:",
        error
      );


      // Keep the rest of the page working even if spotlight
      // loading fails.
      setSpotlights([]);

      setCurrentSpotlight(0);

    }

  };


  // ==========================================================
  // LOAD HOME DATA
  // ==========================================================

  const loadHomeData = async () => {

    try {

      // School and spotlight data are loaded separately.
      //
      // This function currently controls the general page
      // loading state and can be expanded later.

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
  // PREVIOUS SPOTLIGHT
  // ==========================================================

  const previousSpotlight = () => {

    if (
      spotlights.length === 0
    ) {
      return;
    }


    setCurrentSpotlight(
      (previous) =>

        previous === 0

          ? spotlights.length - 1

          : previous - 1
    );

  };


  // ==========================================================
  // NEXT SPOTLIGHT
  // ==========================================================

  const nextSpotlight = () => {

    if (
      spotlights.length === 0
    ) {
      return;
    }


    setCurrentSpotlight(
      (previous) =>

        previous ===
        spotlights.length - 1

          ? 0

          : previous + 1
    );

  };


  // ==========================================================
  // CREATE POST
  // ==========================================================

  const handleCreatePost = () => {

    navigate(
      "/create-post"
    );

  };


  // ==========================================================
  // RETRY POSTS
  // ==========================================================

  const handleRetryPosts = () => {

    setPage(0);

    setHasMorePosts(true);

    setPostsError("");

    loadPosts(0);

  };


  // ==========================================================
  // GENERAL LOADING SCREEN
  // ==========================================================

  if (
    loading &&
    !profile
  ) {

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


          {/* ==================================================
              SCHOOL INFORMATION
              ================================================== */}

          <div className="flex min-w-0 items-center gap-3">

            {school?.logo_url ? (

              <img
                src={school.logo_url}
                alt={
                  school.name ||
                  "School logo"
                }
                className="h-10 w-10 rounded-full object-cover ring-1 ring-gray-200"
              />

            ) : (

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">

                <Users size={20} />

              </div>

            )}


            <div className="min-w-0">

              <h1 className="truncate text-sm font-semibold text-gray-900">

                {schoolLoading

                  ? "Loading school..."

                  : school?.name ||
                    "University"}

              </h1>


              <p className="truncate text-xs text-gray-500">

                {profile?.full_name ||
                  profile?.username ||
                  "Student"}

              </p>

            </div>

          </div>


          {/* ==================================================
              HEADER ACTIONS
              ================================================== */}

          <div className="flex items-center gap-1">

            {/* SEARCH */}

            <button
              type="button"
              onClick={() =>
                navigate("/search")
              }
              className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
              aria-label="Search"
            >

              <Search size={21} />

            </button>


            {/* NOTIFICATIONS */}

            <button
              type="button"
              onClick={() =>
                navigate("/notifications")
              }
              className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
              aria-label="Notifications"
            >

              <Bell size={21} />

            </button>


            {/* MESSAGES */}

            <button
              type="button"
              onClick={() =>
                navigate("/messages")
              }
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


              {/* ==================================================
                  SPOTLIGHT IMAGE
                  ================================================== */}

              <div className="relative aspect-[16/8] w-full overflow-hidden bg-gray-100">

                {spotlights[
                  currentSpotlight
                ]?.image_url ? (

                  <img
                    src={
                      spotlights[
                        currentSpotlight
                      ].image_url
                    }
                    alt={
                      spotlights[
                        currentSpotlight
                      ].title ||
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


                {/* ==================================================
                    PREVIOUS BUTTON
                    ================================================== */}

                {spotlights.length > 1 && (

                  <button
                    type="button"
                    onClick={
                      previousSpotlight
                    }
                    className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60"
                    aria-label="Previous spotlight"
                  >

                    <ChevronLeft
                      size={20}
                    />

                  </button>

                )}


                {/* ==================================================
                    NEXT BUTTON
                    ================================================== */}

                {spotlights.length > 1 && (

                  <button
                    type="button"
                    onClick={
                      nextSpotlight
                    }
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60"
                    aria-label="Next spotlight"
                  >

                    <ChevronRight
                      size={20}
                    />

                  </button>

                )}

              </div>


              {/* ==================================================
                  SPOTLIGHT DETAILS
                  ================================================== */}

              <div className="p-4">

                <div className="flex items-center gap-3">


                  {/* ==================================================
                      PROFILE IMAGE
                      ================================================== */}

                  {spotlights[
                    currentSpotlight
                  ]?.profile?.avatar_url ? (

                    <img
                      src={
                        spotlights[
                          currentSpotlight
                        ].profile.avatar_url
                      }
                      alt={
                        spotlights[
                          currentSpotlight
                        ].profile.full_name ||
                        "Administrator"
                      }
                      className="h-9 w-9 rounded-full object-cover"
                    />

                  ) : (

                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">

                      <User size={18} />

                    </div>

                  )}


                  {/* ==================================================
                      PROFILE INFORMATION
                      ================================================== */}

                  <div>

                    <p className="text-sm font-semibold text-gray-900">

                      {spotlights[
                        currentSpotlight
                      ]?.profile?.full_name ||

                        spotlights[
                          currentSpotlight
                        ]?.profile?.username ||

                        "Administrator"}

                    </p>


                    <p className="text-xs text-gray-500">

                      Administrator Spotlight

                    </p>

                  </div>

                </div>


                {/* ==================================================
                    SPOTLIGHT TITLE
                    ================================================== */}

                {spotlights[
                  currentSpotlight
                ]?.title && (

                  <h2 className="mt-3 text-base font-semibold text-gray-900">

                    {
                      spotlights[
                        currentSpotlight
                      ].title
                    }

                  </h2>

                )}


                {/* ==================================================
                    SPOTLIGHT DESCRIPTION
                    ================================================== */}

                {spotlights[
                  currentSpotlight
                ]?.description && (

                  <p className="mt-1 text-sm leading-6 text-gray-600">

                    {
                      spotlights[
                        currentSpotlight
                      ].description
                    }

                  </p>

                )}


                {/* ==================================================
                    CAROUSEL INDICATORS
                    ================================================== */}

                {spotlights.length > 1 && (

                  <div className="mt-4 flex justify-center gap-1.5">

                    {spotlights.map(
                      (
                        spotlight,
                        index
                      ) => (

                        <button
                          key={
                            spotlight.id
                          }
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
            onClick={
              handleCreatePost
            }
            className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-100 transition hover:ring-gray-200"
          >


            {/* PROFILE IMAGE */}

            {profile?.avatar_url ? (

              <img
                src={
                  profile.avatar_url
                }
                alt={
                  profile.full_name ||
                  "Your profile"
                }
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />

            ) : (

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">

                <User size={20} />

              </div>

            )}


            {/* CREATE POST INPUT */}

            <div className="flex-1 rounded-full bg-gray-100 px-4 py-2.5">

              <span className="text-sm text-gray-500">

                What's happening at your university?

              </span>

            </div>


            {/* PLUS BUTTON */}

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">

              <Plus size={20} />

            </div>

          </button>

        </section>


        {/* ==================================================
            FEED
            ================================================== */}

        <section className="mt-4 space-y-4">


          {/* ==================================================
              INITIAL POSTS LOADING
              ================================================== */}

          {postsLoading && (

            <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-12 shadow-sm ring-1 ring-gray-100">

              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

              <p className="mt-3 text-sm text-gray-500">

                Loading posts...

              </p>

            </div>

          )}


          {/* ==================================================
              POSTS ERROR
              ================================================== */}

          {!postsLoading &&
            postsError && (

              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">

                <p className="text-sm font-medium text-red-700">

                  {postsError}

                </p>


                <button
                  type="button"
                  onClick={
                    handleRetryPosts
                  }
                  className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >

                  Try again

                </button>

              </div>

            )}


          {/* ==================================================
              NO POSTS
              ================================================== */}

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
                  onClick={
                    handleCreatePost
                  }
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >

                  <Plus size={17} />

                  Create a post

                </button>

              </div>

            )}


          {/* ==================================================
              DISPLAY POSTS
              ================================================== */}

          {!postsLoading &&
            !postsError &&
            posts.map(
              (post) => (

                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={
                    currentUserId
                  }
                />

              )
            )}


          {/* ==================================================
              INFINITE SCROLL SENTINEL
              ================================================== */}

          {!postsError &&
            posts.length > 0 &&
            hasMorePosts && (

              <div
                ref={
                  loadMoreRef
                }
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


          {/* ==================================================
              HOME
              ================================================== */}

          <button
            type="button"
            onClick={() =>
              navigate(
                "/student-home"
              )
            }
            className="flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 text-blue-600"
          >

            <Home size={21} />

            <span className="text-[11px] font-medium">

              Home

            </span>

          </button>


          {/* ==================================================
              SEARCH
              ================================================== */}

          <button
            type="button"
            onClick={() =>
              navigate(
                "/search"
              )
            }
            className="flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 text-gray-500 hover:text-gray-900"
          >

            <Search size={21} />

            <span className="text-[11px]">

              Search

            </span>

          </button>


          {/* ==================================================
              CREATE POST
              ================================================== */}

          <button
            type="button"
            onClick={
              handleCreatePost
            }
            className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700"
            aria-label="Create post"
          >

            <Plus size={23} />

          </button>


          {/* ==================================================
              MESSAGES
              ================================================== */}

          <button
            type="button"
            onClick={() =>
              navigate(
                "/messages"
              )
            }
            className="flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 text-gray-500 hover:text-gray-900"
          >

            <MessageCircle
              size={21}
            />

            <span className="text-[11px]">

              Messages

            </span>

          </button>


          {/* ==================================================
              PROFILE
              ================================================== */}

          <button
            type="button"
            onClick={() =>
              navigate(
                "/profile"
              )
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