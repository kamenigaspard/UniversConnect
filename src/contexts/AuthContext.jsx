import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import { supabase } from "../lib/supabase";


// ============================================================
// AUTH CONTEXT
// ============================================================
//
// This context manages:
//
// 1. Supabase authentication.
// 2. The currently logged-in user.
// 3. The user's public profile.
// 4. Signup.
// 5. Login.
// 6. Logout.
// 7. Profile loading.
// 8. Profile-image uploading.
//
// IMPORTANT
// ------------------------------------------------------------
// The profile image is NOT stored inside Supabase Auth metadata.
//
// Instead:
//
// Supabase Auth
//      ↓
// public.profiles
//      ↓
// Supabase Storage
//
// ============================================================


const AuthContext = createContext(null);


// ============================================================
// AUTH PROVIDER
// ============================================================

export function AuthProvider({ children }) {

    // --------------------------------------------------------
    // Currently authenticated Supabase user.
    // --------------------------------------------------------

    const [user, setUser] = useState(null);


    // --------------------------------------------------------
    // Currently authenticated user's public profile.
    // --------------------------------------------------------

    const [profile, setProfile] = useState(null);


    // --------------------------------------------------------
    // Indicates that authentication state is still loading.
    // --------------------------------------------------------

    const [loading, setLoading] = useState(true);


    // ========================================================
    // GET PROFILE
    // ========================================================
    //
    // Loads the profile belonging to a Supabase Auth user.
    //
    // The important relationship is:
    //
    // auth.users.id
    //      ↓
    // profiles.id
    //
    // We enforce this relationship in application logic.
    //
    // ========================================================

    const getProfile = async (userId) => {

        if (!userId) {

            setProfile(null);

            return null;
        }


        const {
            data,
            error
        } = await supabase
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
            .single();


        if (error) {

            console.error(
                "Error loading profile:",
                error
            );

            setProfile(null);

            return null;
        }


        setProfile(data);

        return data;
    };


    // ========================================================
    // UPLOAD PROFILE IMAGE
    // ========================================================
    //
    // Files are stored using:
    //
    // profile-media/
    //      USER_ID/
    //          avatar_timestamp.jpg
    //
    // This matches the safer storage policies that restrict
    // users to their own folder.
    //
    // ========================================================

    const uploadProfileImage = async (
        userId,
        avatarFile
    ) => {

        // Nothing to upload.
        if (!userId || !avatarFile) {

            return null;
        }


        // ----------------------------------------------------
        // Validate image type.
        // ----------------------------------------------------

        if (
            !avatarFile.type ||
            !avatarFile.type.startsWith("image/")
        ) {

            throw new Error(
                "Please select a valid image file."
            );
        }


        // ----------------------------------------------------
        // Maximum profile-image size = 5 MB.
        // ----------------------------------------------------

        const maxSize =
            5 * 1024 * 1024;


        if (avatarFile.size > maxSize) {

            throw new Error(
                "Profile image must be smaller than 5 MB."
            );
        }


        // ----------------------------------------------------
        // Get file extension.
        // ----------------------------------------------------

        const fileExtension =
            avatarFile.name
                .split(".")
                .pop()
                ?.toLowerCase() || "jpg";


        // ----------------------------------------------------
        // Create a unique filename.
        // ----------------------------------------------------

        const fileName =
            `avatar_${Date.now()}.${fileExtension}`;


        // ----------------------------------------------------
        // IMPORTANT:
        //
        // The first folder must be the user's Auth ID.
        //
        // This matches:
        //
        // storage.foldername(name)[1] = auth.uid()
        // ----------------------------------------------------

        const filePath =
            `${userId}/${fileName}`;


        // ----------------------------------------------------
        // Upload image.
        // ----------------------------------------------------

        const {
            error: uploadError
        } = await supabase.storage
            .from("profile-media")
            .upload(
                filePath,
                avatarFile,
                {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: avatarFile.type
                }
            );


        if (uploadError) {

            console.error(
                "Profile image upload error:",
                uploadError
            );

            throw uploadError;
        }


        // ----------------------------------------------------
        // Generate public URL.
        //
        // Your profile-media bucket is currently public.
        // ----------------------------------------------------

        const {
            data: publicUrlData
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


        // ----------------------------------------------------
        // Save URL in profiles.avatar_url.
        // ----------------------------------------------------

        const {
            error: profileUpdateError
        } = await supabase
            .from("profiles")
            .update({
                avatar_url: avatarUrl
            })
            .eq("id", userId);


        if (profileUpdateError) {

            console.error(
                "Error saving avatar URL:",
                profileUpdateError
            );

            throw profileUpdateError;
        }


        return avatarUrl;
    };


    // ========================================================
    // INITIAL SESSION
    // ========================================================

    useEffect(() => {

        let mounted = true;


        const loadInitialSession = async () => {

            try {

                const {
                    data: {
                        session
                    }
                } = await supabase.auth.getSession();


                if (!mounted) {

                    return;
                }


                if (session?.user) {

                    setUser(session.user);


                    await getProfile(
                        session.user.id
                    );

                } else {

                    setUser(null);

                    setProfile(null);
                }

            } catch (error) {

                console.error(
                    "Session loading error:",
                    error
                );

                setUser(null);

                setProfile(null);

            } finally {

                if (mounted) {

                    setLoading(false);
                }
            }
        };


        loadInitialSession();


        // ====================================================
        // AUTH STATE LISTENER
        // ====================================================

        const {
            data: {
                subscription
            }
        } = supabase.auth.onAuthStateChange(
            async (_event, session) => {

                if (!mounted) {

                    return;
                }


                if (session?.user) {

                    setUser(session.user);


                    /*
                     * Wait until the current authentication event
                     * finishes before querying the database.
                     */
                    setTimeout(async () => {

                        if (mounted) {

                            await getProfile(
                                session.user.id
                            );
                        }

                    }, 0);

                } else {

                    setUser(null);

                    setProfile(null);
                }
            }
        );


        // Cleanup.
        return () => {

            mounted = false;

            subscription.unsubscribe();
        };

    }, []);


    // ========================================================
    // SIGN UP
    // ========================================================
    //
    // Receives information from the three signup screens.
    //
    // ========================================================

    const signUp = async ({
        email,
        password,
        fullName,
        role,
        schoolId,
        username,
        bio,
        avatarFile
    }) => {

        // ----------------------------------------------------
        // Validate account information.
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // Validate role.
        // ----------------------------------------------------

        const validRoles = [
            "student",
            "teacher",
            "admin"
        ];


        if (!validRoles.includes(role)) {

            throw new Error(
                "Please select a valid account role."
            );
        }


        // ----------------------------------------------------
        // Validate school.
        // ----------------------------------------------------

        if (!schoolId) {

            throw new Error(
                "Please select your school."
            );
        }


        // ----------------------------------------------------
        // Validate username.
        // ----------------------------------------------------

        if (!username?.trim()) {

            throw new Error(
                "Please choose a username."
            );
        }


        const cleanUsername =
            username.trim().toLowerCase();


        const usernameRegex =
            /^[a-z0-9_]+$/;


        if (!usernameRegex.test(cleanUsername)) {

            throw new Error(
                "Username can only contain letters, numbers and underscores."
            );
        }


        // ====================================================
        // STEP 1 — CREATE AUTH ACCOUNT
        // ====================================================

        const {
            data,
            error
        } = await supabase.auth.signUp({

            email: email.trim(),

            password,

            options: {

                /*
                 * These values are stored as Auth metadata.
                 *
                 * We keep them here as additional signup
                 * information, but the real profile data will
                 * be stored in public.profiles.
                 */

                data: {

                    full_name:
                        fullName.trim(),

                    role,

                    school_id:
                        schoolId,

                    username:
                        cleanUsername,

                    bio:
                        bio?.trim() || ""
                }
            }
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


        // ====================================================
        // STEP 2 — CREATE PROFILE
        // ====================================================
        //
        // We create the public.profiles record using the
        // same UUID as auth.users.id.
        //
        // ====================================================

        const {
            data: createdProfile,
            error: profileError
        } = await supabase
            .from("profiles")
            .insert({

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

                is_active:
                    true
            })
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


        // ----------------------------------------------------
        // Handle profile creation error.
        // ----------------------------------------------------

        if (profileError) {

            console.error(
                "Profile creation error:",
                profileError
            );

            /*
             * IMPORTANT:
             *
             * We do not attempt to delete the Auth account
             * from the browser.
             *
             * Supabase's service-role account would be required
             * for administrative user deletion.
             */

            throw profileError;
        }


        // ====================================================
        // STEP 3 — UPLOAD PROFILE IMAGE
        // ====================================================

        let finalProfile =
            createdProfile;


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


                /*
                 * Update our local profile object so the UI
                 * immediately knows about the image.
                 */

                finalProfile = {

                    ...createdProfile,

                    avatar_url:
                        avatarUrl
                };

            } catch (avatarError) {

                console.error(
                    "Profile image setup failed:",
                    avatarError
                );

                /*
                 * We intentionally do not fail the entire
                 * registration because of an image-upload
                 * problem.
                 *
                 * The user can add/change their image later
                 * from the Profile page.
                 */
            }
        }


        // ====================================================
        // STEP 4 — UPDATE AUTH STATE
        // ====================================================

        if (data.session) {

            setUser(data.user);

            setProfile(finalProfile);
        }


        // ====================================================
        // RETURN SIGNUP RESULT
        // ====================================================

        return {

            ...data,

            profile:
                finalProfile
        };
    };


    // ========================================================
    // SIGN IN
    // ========================================================

    const signIn = async ({
        email,
        password
    }) => {

        if (!email || !password) {

            throw new Error(
                "Email and password are required."
            );
        }


        const {
            data,
            error
        } = await supabase.auth.signInWithPassword({

            email: email.trim(),

            password
        });


        if (error) {

            throw error;
        }


        if (!data?.user) {

            throw new Error(
                "Unable to retrieve your account."
            );
        }


        // Load profile.
        const userProfile =
            await getProfile(
                data.user.id
            );


        // Profile must exist.
        if (!userProfile) {

            await supabase.auth.signOut();

            throw new Error(
                "Your profile could not be found."
            );
        }


        // ----------------------------------------------------
        // Validate role.
        // ----------------------------------------------------

        const validRoles = [
            "student",
            "teacher",
            "admin",
            "super_admin"
        ];


        if (
            !validRoles.includes(
                userProfile.role
            )
        ) {

            await supabase.auth.signOut();

            throw new Error(
                "Your account has an invalid role."
            );
        }


        // ----------------------------------------------------
        // Check whether account is active.
        // ----------------------------------------------------

        if (
            userProfile.is_active === false
        ) {

            await supabase.auth.signOut();

            throw new Error(
                "Your account has been deactivated."
            );
        }


        return {

            user:
                data.user,

            profile:
                userProfile
        };
    };


    // ========================================================
    // SIGN OUT
    // ========================================================

    const signOut = async () => {

        const {
            error
        } = await supabase.auth.signOut();


        if (error) {

            throw error;
        }


        setUser(null);

        setProfile(null);
    };


    // ========================================================
    // CONTEXT VALUE
    // ========================================================

    const value = {

        user,

        profile,

        loading,

        signUp,

        signIn,

        signOut,

        getProfile,

        uploadProfileImage
    };


    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}


// ============================================================
// USE AUTH
// ============================================================

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