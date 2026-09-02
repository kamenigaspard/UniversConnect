

/**
 * Temporary Home Page
 *
 * This page is only being used to test our routing
 * and application layout.
 *
 * Later this route will redirect/display the correct
 * Student, Teacher or Admin home.
 */

import { useEffect, useState } from "react";

import {
  
    Bell,
    Bookmark,
    ChevronLeft,
    ChevronRight,
    Heart,
    Home,
    MessageCircle,
    MoreHorizontal,
    Plus,
    Search,
    Send,
    User,
    Users
} from "lucide-react";

import { useNavigate } from "react-router-dom";


import { useAuth } from "../contexts/AuthContext";

import { supabase } from "../lib/supabase";




 function  AdminHome()  {

  const navigate = useNavigate();

    // ========================================================
    // AUTHENTICATION
    // ========================================================

    const {
        user,
        profile
    } = useAuth();


    // ========================================================
    // STATE
    // ========================================================

    // School information.
    const [school, setSchool] = useState(null);

    // controlling school loading state
    const [schoolLoading, setSchoolLoading] = useState(true);

    // controlling school loading error
    const [schoolError, setSchoolError] = useState(null);

    // Admin/teacher spotlight.
    const [spotlights, setSpotlights] = useState([]);


    // Current spotlight card.
    const [currentSpotlight, setCurrentSpotlight] =
        useState(0);


    // Posts displayed in the feed.
// ========================================================
// POSTS
// ========================================================

// Stores posts belonging to the student's school.
const [posts, setPosts] = useState([]);

// Controls the posts loading state.
const [postsLoading, setPostsLoading] = useState(true);

// Stores post-loading errors.
const [postsError, setPostsError] = useState("");


    // Loading state.
    const [loading, setLoading] = useState(true);


    // ========================================================
    // LOAD STUDENT HOME DATA
    // ========================================================

    useEffect(() => {

        if (!profile?.school_id) {

          setLoading(false);
           loadSchool();
           
            return;
        }else if (profile) {

        /*
         * The profile exists, but school_id is empty.
         */

        setSchoolLoading(false);

        setSchoolError(
            "Your account has not been assigned to a school."
        );
      }
       loadSchool();
       loadSpotlights();
        loadHomeData();
      

    }, [profile?.school_id]);
    
    // =================================================
   // LOAD POSTS
  // =================================================



const loadPosts = async () => {
      if (!profile?.school_id) {
        return;
    }

    setPostsLoading(true);
    setPostsError("");

    try {

        // ====================================================
        // LOAD POSTS FROM THE ENTIRE UNIVERSITY
        // ====================================================

        const {
            data,
            error
        } = await supabase
            .from("posts")
            .select("*")

            // Newest posts appear first.
            .order("created_at", {
                ascending: false
            });

            if(!data || data.length === 0) {

                setPosts([]); 
            }
            if (data) {
                console.log(
                    "Posts data loaded:",
                    data
                );
            }

        // ====================================================
        // HANDLE ERROR
        // ====================================================

        if (error) {

            console.error(
                "Post loading error:",
                error
            );

            setPostsError(
                "Unable to load posts."
            );

            setPosts([]);

            return;
        }


        // ====================================================
        // SAVE POSTS
        // ====================================================

        console.log(
            "University posts loaded:",
            data
        );

        setPosts(data || []);


    } catch (error) {

        console.error(
            "Unexpected post error:",
            error
        );

        setPostsError(
            "Something went wrong while loading posts."
        );

        setPosts([]);

    } finally {

        setPostsLoading(false);
    }
};

  // =================================================
  // LOAD ADMIN / TEACHER SPOTLIGHT
  // =================================================

const loadSpotlights = async () => {

    // We cannot load school spotlights if the student's
    // profile does not contain a school_id.
    if (!profile?.school_id) {
        return;
    }


    try {

        // ====================================================
        // STEP 1: GET SPOTLIGHTS FOR THE STUDENT'S SCHOOL
        // ====================================================

        const {
            data: spotlightData,
            error: spotlightError
        } = await supabase
            .from("admin_spotlights")

            // Select only columns that belong to
            // admin_spotlights itself.
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
                ends_at
            `)

            // IMPORTANT:
            // Students should only see spotlights belonging
            // to their own school.
            .eq(
                "school_id",
                profile.school_id
            )

            // Only active spotlights should appear.
            .eq(
                "is_active",
                true
            )

            // The administrator can control the order.
            .order(
                "display_order",
                {
                    ascending: true
                }
            );


        // ====================================================
        // HANDLE SPOTLIGHT ERROR
        // ====================================================

        if (spotlightError) {

            console.error(
                "Spotlight loading error:",
                spotlightError
            );

            setSpotlights([]);

            return;
        }
        if (spotlightData) {
            console.log(
                "Spotlight data loaded:",
                spotlightData
            );
        }


        // If there are no spotlights, stop here.
        if (!spotlightData || spotlightData.length === 0) {


            setSpotlights([]);

            return;
        }


        // ====================================================
        // STEP 2: GET THE PROFILE IDs
        // ====================================================

        const profileIds = spotlightData
            .map(
                (spotlight) => spotlight.profile_id
            )
            .filter(Boolean);


        // If none of the spotlights has a profile,
        // there is nothing else to load.
        if (profileIds.length === 0) {

            setSpotlights(spotlightData);

            return;
        }


        // ====================================================
        // STEP 3: LOAD THE PROFILES
        // ====================================================

        const {
            data: profileData,
            error: profileError
        } = await supabase
            .from("profiles")
            .select(`
                id,
                full_name,
                avatar_url,
                role,
                school_id
            `)
            .in(
                "id",
                profileIds
            );


        // ====================================================
        // HANDLE PROFILE ERROR
        // ====================================================

        if (profileError) {

            console.error(
                "Profile loading error:",
                profileError
            );

            /*
             * We still keep the spotlight data.
             *
             * This means the carousel can still display
             * the title and description even if a profile
             * cannot be loaded.
             */

            setSpotlights(spotlightData);

            return;
        }


        // ====================================================
        // STEP 4: COMBINE SPOTLIGHT + PROFILE
        // ====================================================

        const combinedSpotlights = spotlightData.map(
            (spotlight) => {

                // Find the profile associated with this
                // particular spotlight.
                const matchingProfile = profileData.find(
                    (profile) =>
                        profile.id === spotlight.profile_id
                );


                // Return the spotlight together with
                // its profile information.
                return {
                    ...spotlight,

                    profiles: matchingProfile || null
                };
            }
        );


        // ====================================================
        // STEP 5: SAVE THE FINAL DATA
        // ====================================================

        setSpotlights(
            combinedSpotlights
        );


    } catch (error) {

        console.error(
            "Unexpected spotlight error:",
            error
        );

        setSpotlights([]);

    }
};

  // =================================================
  // LOAD SCHOOL
  // =================================================  

    const loadSchool = async () => {

    // --------------------------------------------------------
    // Make sure the student's profile contains a school_id.
    // --------------------------------------------------------

    if (!profile?.school_id) {

        console.warn(
            "This student does not have a school assigned."
        );

        setSchool(null);

        setSchoolError(
            "Your account has not been assigned to a school yet."
        );

        setSchoolLoading(false);

        return;
    }


    setSchoolLoading(true);

    setSchoolError("");


    try {

        // ----------------------------------------------------
        // Find the school using profiles.school_id.
        // ----------------------------------------------------

        const {
            data,
            error
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


        // ----------------------------------------------------
        // Handle Supabase error.
        // ----------------------------------------------------

        if (error) {

            console.error(
                "School loading error:",
                error
            );

            setSchoolError(
                "We could not load your school information."
            );

            setSchool(null);

            return;
        }


        // ----------------------------------------------------
        // Make sure the school is active.
        // ----------------------------------------------------

        if (!data.is_active) {

            setSchoolError(
                "Your school is currently inactive."
            );

            setSchool(null);

            return;
        }


        // ----------------------------------------------------
        // Save school information.
        // ----------------------------------------------------

        setSchool(data);

    } catch (error) {

        console.error(
            "Unexpected school error:",
            error
        );

        setSchoolError(
            "Something went wrong while loading your school."
        );

    } finally {

        setSchoolLoading(false);
    }
};


    const loadHomeData = async () => {

        setLoading(true);


        try {

            // =================================================
            // LOAD SCHOOL
            // =================================================

            const {
                data: schoolData,
                error: schoolError
            } = await supabase
                .from("schools")
                .select(`
                    id,
                    name,
                    logo_url
                `)
                .eq(
                    "id",
                    profile.school_id
                )
                .single();


            if (schoolError) {

                console.error(
                    "School loading error:",
                    schoolError
                );

            } else {

                setSchool(schoolData);
            }




        } catch (error) {

            console.error(
                "Error loading student homepage:",
                error
            );


        } finally {

            setLoading(false);
        }
    };


    // ========================================================
    // SPOTLIGHT NAVIGATION
    // ========================================================

    const nextSpotlight = () => {

        if (!spotlights.length) {
            return;
        }


        setCurrentSpotlight(
            (currentSpotlight + 1) %
            spotlights.length
        );
    };


    const previousSpotlight = () => {

        if (!spotlights.length) {
            return;
        }


        setCurrentSpotlight(
            (currentSpotlight - 1 +
                spotlights.length) %
            spotlights.length
        );
    };


    // ========================================================
    // LOADING SCREEN
    // ========================================================

    if (loading) {

        return (

            <div className="min-h-screen bg-gray-50 flex items-center justify-center">

                <div className="text-center">

                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

                    <p className="mt-4 text-gray-500">
                        Loading your university community...
                    </p>

                </div>

            </div>
        );
    }


    // ========================================================
    // CURRENT SPOTLIGHT
    // ========================================================

    const spotlight =
        spotlights[currentSpotlight];


    // ========================================================
    // PAGE
    // ========================================================

    return (

        <div className="min-h-screen bg-gray-50 pb-20">


            {/* =================================================
                HEADER
            ================================================= */}

            <header className="sticky top-0 z-40 border-b bg-white">

                <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">


                                    {/* SCHOOL BRAND */}

               <div className="flex items-center gap-3">

                    {/* =====================================================
                        SCHOOL LOGO
                    ===================================================== */}

                    {schoolLoading ? (

                        <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />

                    ) : school?.logo_url ? (

                        <img
                            src={school.logo_url}
                            alt={`${school.name} logo`}
                            className="h-10 w-10 rounded-full object-cover"
                        />

                    ) : (

                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">

                            <Users size={20} />

                        </div>

                    )}


                    {/* =====================================================
                        SCHOOL INFORMATION
                    ===================================================== */}

                    <div>

                        {schoolLoading ? (

                            <>
                                <div className="h-3 w-32 animate-pulse rounded bg-gray-200" />

                                <div className="mt-2 h-2 w-20 animate-pulse rounded bg-gray-200" />
                            </>

                        ) : school ? (

                            <>

                                <h1 className="text-sm font-bold text-gray-900">
                                    {school.name}
                                </h1>

                                <p className="text-xs text-gray-500">
                                    {school.code}
                                </p>

                            </>

                        ) : (

                            <>

                                <h1 className="text-sm font-bold text-gray-900">
                                    University Community 
                                </h1>

                                <p className="text-xs text-red-500">
                                    School unavailable
                                </p>

                            </>

                        )}

                    </div>

                </div>


                    {/* HEADER ACTIONS */}

                    <div className="flex items-center gap-2">

                        <button
                            className="rounded-full p-2 hover:bg-gray-100"
                            aria-label="Search"
                              onClick={() => navigate("/search")}
                        >
                            <Search size={21} />
                        </button>


                        <button
                            className="relative rounded-full p-2 hover:bg-gray-100"
                            aria-label="Notifications"
                             onClick={() => navigate("/notifications-page")}
                        >

                            <Bell size={21} />

                            {/* Notification badge */}
                            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />

                        </button>


                        <button
                            className="rounded-full p-2 hover:bg-gray-100"
                            aria-label="Messages"
                             onClick={() => navigate("/messages-page")}
                        >
                            <MessageCircle size={21} />
                        </button>

                    </div>

                </div>

            </header>


            {/* =================================================
                MAIN CONTENT
            ================================================= */}

            <main className="mx-auto max-w-2xl px-4 py-5">


                {/* =================================================
                    ADMIN / TEACHER SPOTLIGHT
                ================================================= */}
             <section className="mb-6">

              {/* SECTION HEADER */}

              <div className="mb-3">

                  <h2 className="font-bold text-gray-900">
                      University Spotlight 
                  </h2>

                  <p className="text-xs text-gray-500">
                      Administrators and teachers from your school 
                  </p>

              </div>


              {/* =====================================================
                  SPOTLIGHT CARD
              ===================================================== */}

              {spotlights.length > 0 ? (

                  <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm">

                      {/* PROFILE IMAGE */}

                      <div className="relative h-56">

                          <img
                              src={
                                  spotlight.image_url ||
                                  spotlight.profiles?.avatar_url ||
                                  "/default-profile.png"
                              }
                              alt={
                                  spotlight.profiles?.full_name ||
                                  "University staff"
                              }
                              className="h-full w-full object-cover"
                          />

                          {/* IMAGE OVERLAY */}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />


                          {/* PROFILE INFORMATION */}

                          <div className="absolute bottom-4 left-4 right-4 text-white">

                              <p className="text-xs font-medium uppercase tracking-wide">
                                  {spotlight.profiles?.role}
                              </p>

                              <h3 className="mt-1 text-xl font-bold">
                                  {spotlight.profiles?.full_name}
                              </h3>

                          </div>

                      </div>


                      {/* DESCRIPTION */}

                      <div className="p-4">

                          {spotlight.title && (

                              <h3 className="font-semibold text-gray-900">
                                  {spotlight.title}
                              </h3>

                          )}

                          {spotlight.description && (

                              <p className="mt-1 text-sm leading-6 text-gray-600">
                                  {spotlight.description}
                              </p>

                          )}


                          {/* MESSAGE BUTTON */}

                          <button
                             
                             className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                          >

                              <MessageCircle size={17} />

                              Message

                          </button>

                      </div>


                      {/* PREVIOUS BUTTON */}

                      {spotlights.length > 1 && (

                          <button
                              onClick={previousSpotlight}
                              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow"
                              aria-label="Previous spotlight"
                          >

                              <ChevronLeft size={20} />

                          </button>

                      )}


                      {/* NEXT BUTTON */}

                      {spotlights.length > 1 && (

                          <button
                              onClick={nextSpotlight}
                              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow"
                              aria-label="Next spotlight"
                          >

                              <ChevronRight size={20} />

                          </button>

                      )}

                  </div>

              ) : (

                  /* =================================================
                    EMPTY STATE
                  ================================================= */

                  <div className="rounded-2xl bg-white p-8 text-center shadow-sm">

                      <Users
                          size={40}
                          className="mx-auto text-gray-300"
                      />

                      <h3 className="mt-3 font-semibold text-gray-800">
                          No spotlight yet 
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                          Teachers and administrators featured by
                          your school will appear here.
                      </p>

                  </div>

              )}

          </section>

                {/* =================================================
                    CREATE POST
                ================================================= */}

          <button
              type="button"
              onClick={() => navigate("/create-post")}
              className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition hover:bg-gray-50"
          >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Plus size={22} />
              </div>

              <div>
                  <p className="font-semibold text-gray-900">
                      Create a post
                  </p>

                  <p className="text-sm text-gray-500">
                      Share something with the university
                  </p>
              </div>
          </button>

                {/* =================================================
                    FEED
                ================================================= */}
  <section className="space-y-4">

    <div>

        <h2 className="text-lg font-bold text-gray-900">
            University Feed
        </h2>

        <p className="text-sm text-gray-500">
            What's happening across the university
        </p>

    </div>


    {/* LOADING */}

    {postsLoading && (

        <div className="rounded-2xl bg-white p-8 text-center">

            <p className="text-sm text-gray-500">
                Loading posts...
            </p>

        </div>

    )}


    {/* ERROR */}

    {!postsLoading && postsError && (

        <div className="rounded-2xl bg-red-50 p-6 text-center">

            <p className="text-sm text-red-600">
                {postsError}
            </p>

        </div>

    )}


    {/* NO POSTS */}

    {!postsLoading &&
     !postsError &&
     posts.length === 0 && (

        <div className="rounded-2xl bg-white p-8 text-center">

            <p className="font-medium text-gray-800">
                No posts yet
            </p>

            <p className="mt-1 text-sm text-gray-500">
                Be the first person to share something
                with the university.
            </p>

        </div>

    )}


    {/* POSTS */}

    {!postsLoading &&
     posts.length > 0 && (

        <div className="space-y-4">

            {posts.map(post => (

                <PostCard
                    key={post.id}
                    post={post}
                    author={post.author_id}
                    school={post.school}
                />

            ))}

        </div>

    )}

</section>
            </main>


            {/* =================================================
                BOTTOM NAVIGATION
            ================================================= */}

            <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white">

                <div className="mx-auto flex h-16 max-w-2xl items-center justify-around">

                    {/* HOME */}

                    <button className="flex flex-col items-center gap-1 text-blue-600"
                     onClick={() => navigate("/")}>

                        <Home size={22} />

                        <span className="text-[10px] font-medium">
                            Home
                        </span>

                    </button>


                    {/* SEARCH */}

                    <button className="flex flex-col items-center gap-1 text-gray-500"
                     onClick={() => navigate("/create-post")}>

                        <Search size={22} />

                        <span className="text-[10px]">
                            Search
                        </span>

                    </button>


                    {/* CREATE */}
                  <button
                      type="button"
                      onClick={() => navigate("/create-post")}
                      className="flex flex-col items-center justify-center"
                  >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
                          <Plus size={22} />
                      </div>

                      <span className="mt-1 text-xs">
                          Create
                      </span>
                  </button>


                    {/* REQUESTS */}

                    <button className="relative flex flex-col items-center gap-1 text-gray-500"
                     onClick={() => navigate("/requests")}>

                        <Heart size={22} />

                        <span className="text-[10px]">
                            Requests
                        </span>

                    </button>


                    {/* PROFILE */}

                    <button className="flex flex-col items-center gap-1 text-gray-500"
                     onClick={() => navigate("/profile")}>

                        <User size={22} />

                        <span className="text-[10px]">
                            Profile
                        </span>

                    </button>

                </div>

            </nav>

        </div>
    );
}
export default AdminHome;