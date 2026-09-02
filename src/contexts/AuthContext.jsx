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
// This context is responsible for:
//
// 1. Keeping track of the logged-in Supabase user.
// 2. Loading the user's profile.
// 3. Reading the user's role.
// 4. Signing users up.
// 5. Signing users in.
// 6. Signing users out.
// 7. Keeping authentication state available
//    throughout the entire React application.
//
// ============================================================


const AuthContext = createContext(null);


// ============================================================
// AUTH PROVIDER
// ============================================================

export function AuthProvider({ children }) {

    // --------------------------------------------------------
    // Current authenticated Supabase user.
    // --------------------------------------------------------

    const [user, setUser] = useState(null);


    // --------------------------------------------------------
    // Current user's profile from public.profiles.
    //
    // This contains information such as:
    //
    // full_name
    // role
    // school_id
    //
    // --------------------------------------------------------

    const [profile, setProfile] = useState(null);


    // --------------------------------------------------------
    // Indicates whether we are still checking
    // the initial authentication session.
    // --------------------------------------------------------

    const [loading, setLoading] = useState(true);


    // ========================================================
    // GET USER PROFILE
    // ========================================================

    const getProfile = async (userId) => {

        // Make sure a user ID was provided.
        if (!userId) {

            setProfile(null);

            return null;
        }


        // Get the user's profile from Supabase.
        const {
            data,
            error
        } = await supabase
            .from("profiles")
            .select(`
                id,
                full_name,
                role,
                school_id
            `)
            .eq("id", userId)
            .single();


        // Handle profile errors.
        if (error) {

            console.error(
                "Error loading profile:",
                error
            );

            setProfile(null);

            return null;
        }


        // Save profile in React state.
        setProfile(data);


        // Return the profile to the caller.
        return data;
    };


    // ========================================================
    // CHECK INITIAL SESSION
    // ========================================================

    useEffect(() => {

        let mounted = true;


        const loadInitialSession = async () => {

            try {

                // Ask Supabase whether a user is already logged in.
                const {
                    data: {
                        session
                    }
                } = await supabase.auth.getSession();


                // Stop if the component has been unmounted.
                if (!mounted) {
                    return;
                }


                // If there is a logged-in user...
                if (session?.user) {

                    // Store the authenticated user.
                    setUser(session.user);


                    // Load their profile.
                    await getProfile(
                        session.user.id
                    );

                } else {

                    // No authenticated user.
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
        //
        // This listens for:
        //
        // SIGNED_IN
        // SIGNED_OUT
        // TOKEN_REFRESHED
        // USER_UPDATED
        //
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

                    // Save authenticated user.
                    setUser(session.user);


                    /*
                     * Load profile information.
                     *
                     * We use setTimeout so that the Supabase
                     * authentication event is allowed to finish
                     * before making another Supabase request.
                     */
                    setTimeout(async () => {

                        if (mounted) {

                            await getProfile(
                                session.user.id
                            );

                        }

                    }, 0);

                } else {

                    // User logged out.
                    setUser(null);

                    setProfile(null);
                }
            }
        );


        // Cleanup when the provider is destroyed.
        return () => {

            mounted = false;

            subscription.unsubscribe();

        };

    }, []);


    // ========================================================
    // SIGN UP
    // ========================================================

    const signUp = async ({
        email,
        password,
        fullName,
        role,
        schoolId
    }) => {

        // Basic validation.
        if (!email || !password ) {

            throw new Error(
                "Email and password are required."
            );
        }
      if(!fullName){
        throw new Error(
          "Enter a valide name."
        )
      }

        // Make sure a role was selected.
        if (!role) {

            throw new Error(
                "Please select your account role."
            );
        }


        // Make sure a school was selected.
        if (!schoolId) {

            throw new Error(
                "Please select your school."
            );
        }


        // Create the Supabase authentication account.
        const {
            data,
            error
        } = await supabase.auth.signUp({

            // User's email.
            email: email.trim(),

            // User's password.
            password,

            options: {

                /*
                 * Store signup information in
                 * Supabase Auth metadata.
                 *
                 * Our database logic can use this
                 * when creating the profile.
                 */
                data: {

                    full_name: fullName?.trim(),

                    role: role,

                    school_id: schoolId
                }
            }
        });


        // Stop if Supabase returned an error.
        if (error) {

            throw error;
        }


        // Return the Supabase response.
        return data;
    };


    // ========================================================
    // SIGN IN
    // ========================================================

    const signIn = async ({
        email,
        password
    }) => {

        // Basic validation.
        if (!email || !password) {

            throw new Error(
                "Email and password are required."
            );
        }


        // Authenticate the user.
        const {
            data,
            error
        } = await supabase.auth.signInWithPassword({

            email: email.trim(),

            password
        });


        // Handle login errors.
        if (error) {

            throw error;
            console.log(error);
        }


        // Make sure Supabase returned a user.
        if (!data?.user) {

            throw new Error(
                "Unable to retrieve your account."
            );
        }


        // Load the user's profile.
        const userProfile =
            await getProfile(
                data.user.id
            );


        // Make sure a profile exists.
        if (!userProfile) {

            // Log the user out if their profile
            // does not exist.
            await supabase.auth.signOut();


            throw new Error(
                "Your profile could not be found."
            );
        }


        // Make sure the role is valid.
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


        // Return both user and profile.
        return {

            user: data.user,

            profile: userProfile
        };
    };


    // ========================================================
    // SIGN OUT
    // ========================================================

    const signOut = async () => {

        // Tell Supabase to end the session.
        const {
            error
        } = await supabase.auth.signOut();


        if (error) {

            throw error;
        }


        // Clear local authentication state.
        setUser(null);

        setProfile(null);
    };


    // ========================================================
    // AUTH CONTEXT VALUE
    // ========================================================

    const value = {

        user,

        profile,

        loading,

        signUp,

        signIn,

        signOut,

        getProfile
    };


    // Make the authentication information available
    // to every component inside AuthProvider.
    return (
        <AuthContext.Provider value={value}>

            {children}

        </AuthContext.Provider>
    );
}


// ============================================================
// USE AUTH HOOK
// ============================================================
//
// Components can now use:
//
// const { user, profile, signIn } = useAuth();
//
// ============================================================

export function useAuth() {

    const context = useContext(
        AuthContext
    );


    if (!context) {

        throw new Error(
            "useAuth must be used inside AuthProvider"
        );
    }


    return context;
}