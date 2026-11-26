
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Ban status
  const [ban, setBan] = useState(null);
  const [banLoading, setBanLoading] = useState(false);
  const [banCheckError, setBanCheckError] = useState(false);

  /* =========================================================
     GET PROFILE

     Private fields such as email and matricule are deliberately
     excluded. Use user.email from Supabase Auth when needed.
  ========================================================= */

  const getProfile = async (userId) => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        username,
        avatar_url,
        bio,
        role,
        school_id,
        is_active,
        created_at,
        updated_at,
        preferred_language,
        preferred_theme
      `)
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error loading profile:", error);
      throw error;
    }

    if (!data) {
      setProfile(null);
      return null;
    }

    setProfile(data);
    return data;
  };

  /* =========================================================
     CHECK ACTIVE USER BAN

     Only bans that:
     - Belong to the current user.
     - Are active.
     - Have already started.
     - Have not expired.

     are considered active.
  ========================================================= */

  const checkUserBan = useCallback(async (userId) => {
    if (!userId) {
      setBan(null);
      setBanCheckError(false);
      setBanLoading(false);
      return null;
    }

    setBanLoading(true);
    setBanCheckError(false);

    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("bans")
        .select(`
          id,
          user_id,
          duration,
          reason,
          starts_at,
          ends_at,
          is_active
        `)
        .eq("user_id", userId)
        .eq("is_active", true)
        .lte("starts_at", now)
        .gt("ends_at", now)
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setBan(data || null);

      return data || null;
    } catch (error) {
      console.error("Ban verification failed:", error);
      setBanCheckError(true);

      return null;
    } finally {
      setBanLoading(false);
    }
  }, []);

  /* =========================================================
     UPLOAD PROFILE IMAGE
  ========================================================= */

  const uploadProfileImage = async (userId, avatarFile) => {
    if (!userId || !avatarFile) return null;

    if (
      !avatarFile.type ||
      !avatarFile.type.startsWith("image/")
    ) {
      throw new Error("Please select a valid image file.");
    }

    const maxSize = 5 * 1024 * 1024;

    if (avatarFile.size > maxSize) {
      throw new Error(
        "Profile image must be smaller than 5 MB."
      );
    }

    const fileExtension =
      avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";

    const fileName = `avatar_${Date.now()}.${fileExtension}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-media")
      .upload(filePath, avatarFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: avatarFile.type,
      });

    if (uploadError) {
      console.error("Profile image upload error:", uploadError);
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
      .from("profile-media")
      .getPublicUrl(filePath);

    const avatarUrl = publicUrlData?.publicUrl;

    if (!avatarUrl) {
      throw new Error("Unable to generate profile image URL.");
    }

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", userId);

    if (profileUpdateError) {
      console.error(
        "Error saving avatar URL:",
        profileUpdateError
      );
      throw profileUpdateError;
    }

    setProfile((currentProfile) => {
      if (currentProfile?.id === userId) {
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setBan(null);
        setBanCheckError(false);
        setBanLoading(false);
        setLoading(false);
        return;
      }

      setUser(session.user);

      /*
       * Do not query Supabase inside the auth callback.
       * Refresh the profile separately when user details change.
       */
      if (event === "USER_UPDATED") {
        setTimeout(async () => {
          if (!mounted) return;

          try {
            await getProfile(session.user.id);
          } catch (error) {
            console.error(
              "Auth state profile refresh failed:",
              error
            );
          }
        }, 0);
      }
    });

    const loadInitialSession = async () => {
      try {
        setLoading(true);

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;
        if (!mounted) return;

        if (!session?.user) {
          setUser(null);
          setProfile(null);
          setBan(null);
          setBanCheckError(false);
          setBanLoading(false);
          return;
        }

        setUser(session.user);

        try {
          const userProfile = await getProfile(session.user.id);

          if (!mounted) return;

          if (!userProfile) {
            console.warn("Authenticated user has no profile.");
            setProfile(null);
            return;
          }

          if (userProfile.is_active === false) {
            await supabase.auth.signOut();

            if (mounted) {
              setUser(null);
              setProfile(null);
              setBan(null);
            }

            return;
          }

          setProfile(userProfile);

          // Verify ban status before completing session restoration.
          await checkUserBan(session.user.id);

        } catch (profileError) {
          console.error(
            "Profile restoration failed:",
            profileError
          );

          if (mounted) setProfile(null);
        }
      } catch (error) {
        console.error("Session loading error:", error);

        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [checkUserBan]);

  /* =========================================================
     REALTIME BAN MONITORING

     Detects new bans and lifted bans while the user
     is already logged in.
  ========================================================= */

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user-ban-status-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bans",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          checkUserBan(user.id);
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error(
            "Unable to subscribe to ban status changes."
          );
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, checkUserBan]);

  /* =========================================================
     SIGN UP

     The database assigns role and school_id.
     The database trigger creates the profile.

     Never insert or upsert profiles here.
  ========================================================= */

  const signUp = async ({
    email,
    password,
    matricule,
    fullName,
    username,
    bio,
    avatarFile,
  }) => {
    /* -------------------------------------------------------
       VALIDATION
    ------------------------------------------------------- */

    if (!email?.trim()) {
      throw new Error("Official email is required.");
    }

    if (!password) {
      throw new Error("Password is required.");
    }

    if (!matricule?.trim()) {
      throw new Error("Matricule is required.");
    }

    if (!fullName?.trim()) {
      throw new Error("Enter your full name.");
    }

    if (!username?.trim()) {
      throw new Error("Please choose a username.");
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanMatricule = matricule.trim().toUpperCase();
    const cleanFullName = fullName.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanBio = bio?.trim() || "";

    const usernameRegex = /^[a-z0-9_]+$/;

    if (!usernameRegex.test(cleanUsername)) {
      throw new Error(
        "Username can only contain letters, numbers and underscores."
      );
    }

    /* -------------------------------------------------------
       CREATE SUPABASE AUTH USER

       handle_new_user() automatically:
       - validates the matricule
       - checks the official email
       - checks the assigned school
       - assigns the trusted role and school
       - creates the profile
       - claims the matricule
    ------------------------------------------------------- */

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          matricule: cleanMatricule,
          full_name: cleanFullName,
          username: cleanUsername,
          bio: cleanBio,
        },
      },
    });

    if (error) {
      throw error;
    }

    if (!data?.user) {
      throw new Error("Unable to create your account.");
    }

    let createdProfile = null;

    /*
     * When Supabase returns a session, load the profile
     * that the database trigger has already created.
     */
    if (data.session) {
      setUser(data.user);

      try {
        createdProfile = await getProfile(data.user.id);

        if (!createdProfile) {
          throw new Error(
            "Your account was created, but its profile could not be found. Please contact support."
          );
        }

        if (createdProfile.is_active === false) {
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);

          throw new Error(
            "Your account is currently inactive."
          );
        }

        /*
         * Optional avatar upload.
         * An avatar failure does not undo account creation.
         */
        if (avatarFile) {
          try {
            const avatarUrl = await uploadProfileImage(
              data.user.id,
              avatarFile
            );

            createdProfile = {
              ...createdProfile,
              avatar_url: avatarUrl,
            };
          } catch (avatarError) {
            console.error(
              "Profile image setup failed:",
              avatarError
            );
          }
        }

        setProfile(createdProfile);

        // Verify ban status after signup.
        await checkUserBan(data.user.id);

      } catch (profileError) {
        console.error(
          "Profile loading after signup failed:",
          profileError
        );

        throw profileError;
      }
    }

    return {
      ...data,
      profile: createdProfile,
    };
  };

  /* =========================================================
     SIGN IN
  ========================================================= */

  const signIn = async ({ email, password }) => {
    if (!email?.trim() || !password) {
      throw new Error("Email and password are required.");
    }

    const { data, error } = await supabase.auth
      .signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

    if (error) throw error;

    if (!data?.user) {
      throw new Error("Unable to retrieve your account.");
    }

    setUser(data.user);

    let userProfile;

    try {
      userProfile = await getProfile(data.user.id);
    } catch (profileError) {
      /*
       * Keep the authentication session alive if there is
       * a temporary profile/database error.
       */
      throw profileError;
    }

    if (!userProfile) {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);

      throw new Error("Your profile could not be found.");
    }

    const validRoles = [
      "student",
      "teacher",
      "admin",
      "super_admin",
    ];

    if (!validRoles.includes(userProfile.role)) {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);

      throw new Error("Your account has an invalid role.");
    }

    if (userProfile.is_active === false) {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);

      throw new Error("Your account has been deactivated.");
    }

    setUser(data.user);
    setProfile(userProfile);
    setLoading(false);

    // Check whether the account has an active ban.
    const activeBan = await checkUserBan(data.user.id);

    return {
      user: data.user,
      profile: userProfile,
      ban: activeBan,
    };
  };

  /* =========================================================
     SIGN OUT
  ========================================================= */

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    setUser(null);
    setProfile(null);
    setBan(null);
    setBanCheckError(false);
    setBanLoading(false);
    setLoading(false);
  };

  /* =========================================================
     CONTEXT VALUE
  ========================================================= */

  const value = {
    user,
    currentUser: user,
    profile,
    loading,

    // Ban information
    ban,
    banLoading,
    banCheckError,
    checkUserBan,

    // Authentication
    signUp,
    signIn,
    signOut,

    // Profile
    getProfile,
    uploadProfileImage,
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
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}
