import { 
    createContext, 
    useContext, 
    useEffect, 
    useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const getProfile = async (userId) => {
        if (!userId) {
            setProfile(null);
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
            .single();

        if (error) {
            console.error("Error loading profile:", error);
            setProfile(null);
            return null;
        }

        setProfile(data);
        return data;
    };

    const uploadProfileImage = async (userId, avatarFile) => {
        if (!userId || !avatarFile) return null;

        if (!avatarFile.type || !avatarFile.type.startsWith("image/")) {
            throw new Error("Please select a valid image file.");
        }

        const maxSize = 5 * 1024 * 1024;
        if (avatarFile.size > maxSize) {
            throw new Error("Profile image must be smaller than 5 MB.");
        }

        const fileExtension = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `avatar_${Date.now()}.${fileExtension}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from("profile-media")
            .upload(filePath, avatarFile, {
                cacheControl: "3600",
                upsert: false,
                contentType: avatarFile.type
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
            console.error("Error saving avatar URL:", profileUpdateError);
            throw profileUpdateError;
        }

        return avatarUrl;
    };

    useEffect(() => {

        let mounted = true;

        /*
        * ========================================================
        * LOAD EXISTING SESSION
        * ========================================================
        *
        * Supabase automatically checks whether the browser has
        * an existing authenticated session.
        *
        * If the user previously logged in and the session is
        * still valid, Supabase returns it here.
        */
        const loadInitialSession = async () => {

            try {

                const {
                    data: { session }
                } = await supabase.auth.getSession();

                if (!mounted) return;

                /*
                * ------------------------------------------------
                * Existing session found.
                * ------------------------------------------------
                */
                if (session?.user) {

                    setUser(session.user);

                    /*
                    * Load the user's database profile.
                    */
                    const userProfile =
                        await getProfile(session.user.id);

                    /*
                    * If the profile doesn't exist, remove the
                    * invalid authentication session.
                    */
                    if (!userProfile) {

                        await supabase.auth.signOut();

                        if (mounted) {
                            setUser(null);
                            setProfile(null);
                        }

                        return;
                    }

                    /*
                    * If the account has been deactivated,
                    * immediately sign the user out.
                    */
                    if (userProfile.is_active === false) {

                        await supabase.auth.signOut();

                        if (mounted) {
                            setUser(null);
                            setProfile(null);
                        }

                        return;
                    }

                } else {

                    /*
                    * No existing session.
                    */
                    setUser(null);
                    setProfile(null);
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

                if (mounted) {
                    setLoading(false);
                }
            }
        };


        /*
        * Start session restoration.
        */
        loadInitialSession();


        /*
        * ========================================================
        * LISTEN FOR AUTH CHANGES
        * ========================================================
        */
        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange(
            async (_event, session) => {

                if (!mounted) return;

                if (session?.user) {

                    setUser(session.user);

                    /*
                    * Give React/Supabase a moment to finish the
                    * authentication event before querying the
                    * profile.
                    */
                    setTimeout(async () => {

                        if (!mounted) return;

                        const userProfile =
                            await getProfile(session.user.id);

                        if (
                            userProfile &&
                            userProfile.is_active !== false
                        ) {
                            setProfile(userProfile);
                        }

                    }, 0);

                } else {

                    /*
                    * User logged out.
                    */
                    setUser(null);
                    setProfile(null);
                }
            }
        );


        /*
        * ========================================================
        * CLEANUP
        * ========================================================
        */
        return () => {

            mounted = false;

            subscription.unsubscribe();
        };

    }, []);

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
        if (!email?.trim()) throw new Error("Email is required.");
        if (!password) throw new Error("Password is required.");
        if (!fullName?.trim()) throw new Error("Enter your full name.");

        const validRoles = ["student", "teacher", "admin"];
        if (!validRoles.includes(role)) {
            throw new Error("Please select a valid account role.");
        }

        if (!schoolId) throw new Error("Please select your school.");
        if (!username?.trim()) throw new Error("Please choose a username.");

        const cleanUsername = username.trim().toLowerCase();
        const usernameRegex = /^[a-z0-9_]+$/;

        if (!usernameRegex.test(cleanUsername)) {
            throw new Error("Username can only contain letters, numbers and underscores.");
        }

        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: {
                    full_name: fullName.trim(),
                    role,
                    school_id: schoolId,
                    username: cleanUsername,
                    bio: bio?.trim() || ""
                }
            }
        });

        if (error) throw error;
        if (!data?.user) throw new Error("Unable to create your account.");

        const userId = data.user.id;

        const { data: createdProfile, error: profileError } = await supabase
            .from("profiles")
            .upsert({
                id: userId,
                full_name: fullName.trim(),
                username: cleanUsername,
                email: email.trim(),
                bio: bio?.trim() || null,
                role,
                school_id: schoolId,
                is_active: true
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

        if (profileError) {
            console.error("Profile creation error:", profileError);
            throw profileError;
        }

        let finalProfile = createdProfile;

        if (avatarFile && data.session) {
            try {
                const avatarUrl = await uploadProfileImage(userId, avatarFile);
                finalProfile = { ...createdProfile, avatar_url: avatarUrl };
            } catch (avatarError) {
                console.error("Profile image setup failed:", avatarError);
            }
        }

        if (data.session) {
            setUser(data.user);
            setProfile(finalProfile);
        }

        return { ...data, profile: finalProfile };
    };

    const signIn = async ({ email, password }) => {
        if (!email || !password) throw new Error("Email and password are required.");

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password
        });

        if (error) throw error;
        if (!data?.user) throw new Error("Unable to retrieve your account.");

        const userProfile = await getProfile(data.user.id);

        if (!userProfile) {
            await supabase.auth.signOut();
            throw new Error("Your profile could not be found.");
        }

        const validRoles = ["student", "teacher", "admin", "super_admin"];
        if (!validRoles.includes(userProfile.role)) {
            await supabase.auth.signOut();
            throw new Error("Your account has an invalid role.");
        }

        if (userProfile.is_active === false) {
            await supabase.auth.signOut();
            throw new Error("Your account has been deactivated.");
        }

        return { user: data.user, profile: userProfile };
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setUser(null);
        setProfile(null);
    };

    const value = {
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        getProfile,
        uploadProfileImage,
        setProfile
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used inside AuthProvider");
    return context;
}