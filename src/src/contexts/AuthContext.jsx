import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  /* =========================================================
     GET PROFILE
  ========================================================= */

  const getProfile = async (userId) => {
    if (!userId) {
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        username,
        email,
        avatar_url,
        bio,
        role,
        school_id,
        is_active,
        created_at,
        updated_at
      `)
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error loading profile:", error);

      /*
       * IMPORTANT:
       *
       * Do not automatically sign the user out because
       * of a temporary database/profile error.
       */
      throw error;
    }

    if (!data) {
      console.warn(
        "No profile found for authenticated user:",
        userId
      );

      setProfile(null);

      return null;
    }

    setProfile(data);

    return data;
  };

  /* =========================================================
     UPLOAD PROFILE IMAGE
  ========================================================= */

  const uploadProfileImage = async (
    userId,
    avatarFile
  ) => {
    if (!userId || !avatarFile) {
      return null;
    }

    if (
      !avatarFile.type ||
      !avatarFile.type.startsWith("image/")
    ) {
      throw new Error(
        "Please select a valid image file."
      );
    }

    const maxSize = 5 * 1024 * 1024;

    if (avatarFile.size > maxSize) {
      throw new Error(
        "Profile image must be smaller than 5 MB."
      );
    }

    const fileExtension =
      avatarFile.name
        .split(".")
        .pop()
        ?.toLowerCase() || "jpg";

    const fileName = `avatar_${Date.now()}.${fileExtension}`;

    /*
     * Storage path:
     *
     * profile-media/
     *    USER_ID/
     *       avatar_timestamp.jpg
     */
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } =
      await supabase.storage
        .from("profile-media")
        .upload(
          filePath,
          avatarFile,
          {
            cacheControl: "3600",
            upsert: false,
            contentType: avatarFile.type,
          }
        );

    if (uploadError) {
      console.error(
        "Profile image upload error:",
        uploadError
      );

      throw uploadError;
    }

    const {
      data: publicUrlData,
    } = supabase.storage
      .from("profile-media")
      .getPublicUrl(filePath);

    const avatarUrl =
      publicUrlData?.publicUrl;

    if (!avatarUrl) {
      throw new Error(
        "Unable to generate profile image URL."
      );
    }

    const {
      error: profileUpdateError,
    } = await supabase
      .from("profiles")
      .update({
        avatar_url: avatarUrl,
      })
      .eq("id", userId);

    if (profileUpdateError) {
      console.error(
        "Error saving avatar URL:",
        profileUpdateError
      );

      throw profileUpdateError;
    }

    /*
     * Update local profile state if it belongs to
     * the currently authenticated user.
     */
    setProfile((currentProfile) => {
      if (
        currentProfile?.id === userId
      ) {
        return {
          ...currentProfile,
          avatar_url: avatarUrl,
        };
      }

      return currentProfile;
    });

    return avatarUrl;
  };

  /* =========================================================
     INITIAL SESSION + AUTH STATE
  ========================================================= */

  useEffect(() => {
    let mounted = true;
    let initialSessionLoaded = false;

    /* -------------------------------------------------------
       LOAD INITIAL SESSION
    ------------------------------------------------------- */

    const loadInitialSession = async () => {
      try {
        if (mounted) {
          setLoading(true);
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!mounted) {
          return;
        }

        /*
         * No authenticated session.
         */
        if (!session?.user) {
          setUser(null);
          setProfile(null);

          return;
        }

        /*
         * IMPORTANT:
         *
         * Set the authenticated user immediately.
         */
        setUser(session.user);

        try {
          const userProfile =
            await getProfile(
              session.user.id
            );

          if (!mounted) {
            return;
          }

          /*
           * Auth user exists but profile doesn't.
           */
          if (!userProfile) {
            console.error(
              "Authenticated user has no profile."
            );

            setProfile(null);

            /*
             * Do NOT sign the user out here.
             */
            return;
          }

          /*
           * Check whether the profile is active.
           */
          if (
            userProfile.is_active === false
          ) {
            console.warn(
              "User profile is inactive."
            );

            /*
             * Only inactive accounts are signed out.
             */
            await supabase.auth.signOut();

            if (mounted) {
              setUser(null);
              setProfile(null);
            }

            return;
          }

          /*
           * Make absolutely sure the profile is stored
           * in context.
           */
          setProfile(userProfile);
        } catch (profileError) {
          console.error(
            "Profile restoration failed:",
            profileError
          );

          /*
           * IMPORTANT:
           *
           * Keep the authentication session alive.
           *
           * A database/profile problem must not create
           * an authentication sign-out loop.
           */
          if (mounted) {
            setProfile(null);
          }
        }
      } catch (error) {
        console.error(
          "Session loading error:",
          error
        );

        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        initialSessionLoaded = true;

        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadInitialSession();

    /* -------------------------------------------------------
       AUTH STATE LISTENER
    ------------------------------------------------------- */

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) {
          return;
        }

        /*
         * No session.
         */
        if (!session?.user) {
          setUser(null);
          setProfile(null);
          setLoading(false);

          return;
        }

        /*
         * ALWAYS keep the authenticated Supabase user
         * in React state.
         */
        setUser(session.user);

        /*
         * IMPORTANT:
         *
         * Do not perform Supabase database queries directly
         * inside onAuthStateChange.
         *
         * Supabase authentication events can fire several
         * times during a session refresh.
         */
        if (
          initialSessionLoaded &&
          (
            event === "SIGNED_IN" ||
            event === "USER_UPDATED"
          )
        ) {
          setTimeout(async () => {
            if (!mounted) {
              return;
            }

            try {
              const userProfile =
                await getProfile(
                  session.user.id
                );

              if (!mounted) {
                return;
              }

              if (
                userProfile &&
                userProfile.is_active !== false
              ) {
                setProfile(userProfile);
              }
            } catch (profileError) {
              console.error(
                "Auth state profile refresh failed:",
                profileError
              );

              /*
               * Do not sign out.
               */
            }
          }, 0);
        }
      }
    );

    /* -------------------------------------------------------
       CLEANUP
    ------------------------------------------------------- */

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* =========================================================
     SIGN UP
  ========================================================= */

  const signUp = async ({
    email,
    password,
    fullName,
    role,
    schoolId,
    username,
    bio,
    avatarFile,
  }) => {
    /* -------------------------------------------------------
       VALIDATION
    ------------------------------------------------------- */

    if (!email?.trim()) {
      throw new Error(
        "Email is required."
      );
    }

    if (!password) {
      throw new Error(
        "Password is required."
      );
    }

    if (!fullName?.trim()) {
      throw new Error(
        "Enter your full name."
      );
    }

    const validRoles = [
      "student",
      "teacher",
      "admin",
    ];

    if (!validRoles.includes(role)) {
      throw new Error(
        "Please select a valid account role."
      );
    }

    if (!schoolId) {
      throw new Error(
        "Please select your school."
      );
    }

    if (!username?.trim()) {
      throw new Error(
        "Please choose a username."
      );
    }

    const cleanUsername =
      username.trim().toLowerCase();

    const usernameRegex =
      /^[a-z0-9_]+$/;

    if (
      !usernameRegex.test(
        cleanUsername
      )
    ) {
      throw new Error(
        "Username can only contain letters, numbers and underscores."
      );
    }

    /* -------------------------------------------------------
       CREATE SUPABASE AUTH USER
    ------------------------------------------------------- */

    const {
      data,
      error,
    } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name:
            fullName.trim(),

          role,

          school_id:
            schoolId,

          username:
            cleanUsername,

          bio:
            bio?.trim() || "",
        },
      },
    });

    if (error) {
      throw error;
    }

    if (!data?.user) {
      throw new Error(
        "Unable to create your account."
      );
    }

    const userId =
      data.user.id;

    /* -------------------------------------------------------
       CREATE / UPDATE PROFILE
    ------------------------------------------------------- */

    const {
      data: createdProfile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,

          full_name:
            fullName.trim(),

          username:
            cleanUsername,

          email:
            email.trim(),

          bio:
            bio?.trim() || null,

          role,

          school_id:
            schoolId,

          is_active: true,
        },
        {
          onConflict: "id",
        }
      )
      .select(`
        id,
        full_name,
        username,
        email,
        avatar_url,
        bio,
        role,
        school_id,
        is_active,
        created_at,
        updated_at
      `)
      .single();

    if (profileError) {
      console.error(
        "Profile creation error:",
        profileError
      );

      throw profileError;
    }

    let finalProfile =
      createdProfile;

    /* -------------------------------------------------------
       OPTIONAL PROFILE IMAGE
    ------------------------------------------------------- */

    if (
      avatarFile &&
      data.session
    ) {
      try {
        const avatarUrl =
          await uploadProfileImage(
            userId,
            avatarFile
          );

        finalProfile = {
          ...createdProfile,
          avatar_url:
            avatarUrl,
        };
      } catch (avatarError) {
        console.error(
          "Profile image setup failed:",
          avatarError
        );

        /*
         * Do not fail account creation just because
         * the optional avatar upload failed.
         */
      }
    }

    /* -------------------------------------------------------
       IMPORTANT AUTH STATE UPDATE
    ------------------------------------------------------- */

    if (data.session) {
      setUser(data.user);
      setProfile(finalProfile);
      setLoading(false);
    }

    return {
      ...data,
      profile: finalProfile,
    };
  };

  /* =========================================================
     SIGN IN
  ========================================================= */

  const signIn = async ({
    email,
    password,
  }) => {
    if (!email || !password) {
      throw new Error(
        "Email and password are required."
      );
    }

    /* -------------------------------------------------------
       AUTHENTICATE
    ------------------------------------------------------- */

    const {
      data,
      error,
    } = await supabase.auth.signInWithPassword(
      {
        email: email.trim(),
        password,
      }
    );

    if (error) {
      throw error;
    }

    if (!data?.user) {
      throw new Error(
        "Unable to retrieve your account."
      );
    }

    /* -------------------------------------------------------
       LOAD PROFILE
    ------------------------------------------------------- */

    const userProfile =
      await getProfile(
        data.user.id
      );

    if (!userProfile) {
      await supabase.auth.signOut();

      setUser(null);
      setProfile(null);

      throw new Error(
        "Your profile could not be found."
      );
    }

    /* -------------------------------------------------------
       VALIDATE ROLE
    ------------------------------------------------------- */

    const validRoles = [
      "student",
      "teacher",
      "admin",
      "super_admin",
    ];

    if (
      !validRoles.includes(
        userProfile.role
      )
    ) {
      await supabase.auth.signOut();

      setUser(null);
      setProfile(null);

      throw new Error(
        "Your account has an invalid role."
      );
    }

    /* -------------------------------------------------------
       VALIDATE ACTIVE STATUS
    ------------------------------------------------------- */

    if (
      userProfile.is_active === false
    ) {
      await supabase.auth.signOut();

      setUser(null);
      setProfile(null);

      throw new Error(
        "Your account has been deactivated."
      );
    }

    /* -------------------------------------------------------
       CRITICAL FIX
    ------------------------------------------------------- */

    /*
     * The old version returned the user/profile here but
     * did not explicitly update React state.
     *
     * That could cause RequestsPage and MessagesPage to
     * temporarily receive a null user.
     */

    setUser(data.user);
    setProfile(userProfile);
    setLoading(false);

    return {
      user: data.user,
      profile: userProfile,
    };
  };

  /* =========================================================
     SIGN OUT
  ========================================================= */

  const signOut = async () => {
    const {
      error,
    } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  /* =========================================================
     CONTEXT VALUE
  ========================================================= */

  const value = {
    /*
     * Main authenticated Supabase user.
     */
    user,

    /*
     * Alias for components/services that use
     * "currentUser".
     *
     * This is particularly useful for the messaging
     * service.
     */
    currentUser: user,

    /*
     * Database profile.
     */
    profile,

    /*
     * Authentication loading state.
     */
    loading,

    /*
     * Authentication functions.
     */
    signUp,
    signIn,
    signOut,

    /*
     * Profile functions.
     */
    getProfile,
    uploadProfileImage,

    /*
     * Allows profile updates from components.
     */
    setProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/* =========================================================
   USE AUTH
========================================================= */

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}