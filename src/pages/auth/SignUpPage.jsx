import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

import {
    Link,
    useNavigate
} from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";


export default function Signup() {

    const navigate = useNavigate();


    // Get signup function from AuthContext.
    const {
        signUp,
        getProfile
    } = useAuth();


    // ========================================================
    // FORM STATE
    // ========================================================

    const [fullName, setFullName] =
        useState("");


    const [email, setEmail] =
        useState("");


    const [password, setPassword] =
        useState("");


    const [confirmPassword, setConfirmPassword] =
        useState("");


    const [role, setRole] =
        useState('student');


// Stores all active schools retrieved from Supabase.
const [schools, setSchools] = useState([]);

// Stores the school selected by the user.
const [schoolId, setSchoolId] = useState("");

// Controls the loading state while schools are being loaded.
const [schoolsLoading, setSchoolsLoading] = useState(true);


    // ========================================================
    // UI STATE
    // ========================================================

    const [loading, setLoading] =
        useState(false);


    const [error, setError] =
        useState("");


    const [success, setSuccess] =
        useState("");

//=========================================================
// LOAD SCHOOLS ON COMPONENT MOUNT
// ========================================================
    useEffect(() => {
        loadSchools();
    }, []);

 const loadSchools = async () => {
       setSchoolsLoading(true);

    const { data, error } = await supabase
        .from("schools")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name", { ascending: true });

    if (error) {
        console.error("Error loading schools:", error);
        setSchools([]);
    } else {
        setSchools(data || []);
    }

    setSchoolsLoading(false);
};


    // ========================================================
    // HANDLE SIGNUP
    // ========================================================

    const handleSignup = async (e) => {

        e.preventDefault();


        // Clear previous messages.
        setError("");

        setSuccess("");


        // ----------------------------------------------------
        // Validate passwords.
        // ----------------------------------------------------

        if (password !== confirmPassword) {

            setError(
                "Passwords do not match."
            );

            return;
        }


        // ----------------------------------------------------
        // Make sure role is selected.
        // ----------------------------------------------------

        if (!role) {

            setError(
                "Please select your role."
            );

            return;
        }


        // ----------------------------------------------------
        // Make sure school is selected.
        // ----------------------------------------------------

        if (!schoolId) {

            setError(
                "Please select your school."
            );

            return;
        }


        setLoading(true);


        try {

            // Call the authentication context.
            const data = await signUp({

                email,

                password,

                fullName,

                role,

                schoolId
            });


            // ------------------------------------------------
            // If Supabase immediately creates a session,
            // redirect according to the selected role.
            // ------------------------------------------------

            if (data?.session && data?.user) {

                /*
                 * We already have a session.
                 *
                 * Retrieve the profile so that the redirect
                 * uses the database role.
                 */


                const profile =
                    await getProfile(
                        data.user.id
                    );


                if (!profile) {

                    throw new Error(
                        "Your profile could not be found."
                    );
                }


                // Redirect to the correct homepage.
                redirectByRole(
                    profile.role
                );


                return;
            }


            // ------------------------------------------------
            // If signup succeeds without a session,
            // show success instead of using VerifyEmail.jsx.
            // ------------------------------------------------

            setSuccess(
                "Account created successfully. You can now log in."
            );


            /*
             * We don't use VerifyEmail.jsx or AuthCallback.jsx.
             */
            setTimeout(() => {

                navigate("/login");

            }, 1500);


        } catch (error) {

            console.error(
                "Signup error:",
                error
            );


            setError(
                error.message ||
                "Unable to create your account."
            );


        } finally {

            setLoading(false);
        }
    };


    // ========================================================
    // REDIRECT USER BASED ON ROLE
    // ========================================================

    const redirectByRole = (userRole) => {

        switch (userRole) {

            case "student":

                navigate("/student-home");

                break;


            case "teacher":

                navigate("/admin-home");

                break;


            case "admin":

                navigate("/admin-home");

                break;


            case "super_admin":

                navigate("/super-admin-home");

                break;


            default:

                setError(
                    "Your account has an invalid role."
                );
        }
    };


    // ========================================================
    // PAGE UI
    // ========================================================

    return (

        <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">

            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">

                <h1 className="text-3xl font-bold text-center">
                    Create Account
                </h1>


                <p className="mt-2 text-center text-gray-500">
                    Join your university community
                </p>


                {/* ERROR MESSAGE */}

                {error && (

                    <div className="mt-5 rounded-lg bg-red-100 p-3 text-sm text-red-700">

                        {error}

                    </div>

                )}


                {/* SUCCESS MESSAGE */}

                {success && (

                    <div className="mt-5 rounded-lg bg-green-100 p-3 text-sm text-green-700">

                        {success}

                    </div>

                )}


                <form
                    onSubmit={handleSignup}
                    className="mt-6 space-y-4"
                >

                    {/* FULL NAME */}

                    <div>

                        <label className="mb-1 block text-sm font-medium">

                            Full Name

                        </label>

                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) =>
                                setFullName(
                                    e.target.value
                                )
                            }
                            required
                            className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2"
                            placeholder="Enter your full name"
                        />

                    </div>


                    {/* EMAIL */}

                    <div>

                        <label className="mb-1 block text-sm font-medium">

                            Email

                        </label>

                        <input
                            type="email"
                            value={email}
                            onChange={(e) =>
                                setEmail(
                                    e.target.value
                                )
                            }
                            required
                            className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2"
                            placeholder="Enter your email"
                        />

                    </div>


                    {/* ROLE */}

                    <div>

                        <label className="mb-1 block text-sm font-medium">

                            Account Type

                        </label>

                        <select
                            value={role}
                            onChange={(e) =>
                                setRole(
                                    e.target.value
                                )
                            }
                            required
                            className="w-full rounded-lg border px-4 py-3"
                        >

                            <option value="">
                                Select account type
                            </option>

                            <option value="student">
                                Student
                            </option>

                            <option value="teacher">
                                Teacher
                            </option>

                            <option value="admin">
                                Admin
                            </option>

                        </select>

                    </div>


                    {/* SCHOOL */}

                    <div>

                        <label className="mb-1 block text-sm font-medium">

                            School

                        </label>
                    <select
                        value={schoolId}
                        onChange={(e) => setSchoolId(e.target.value)}
                        
                        required
                        className="w-full rounded-lg border px-4 py-3"
                    >
                        <option value="">
                            {schoolsLoading
                                ? "Loading schools..."
                                : "Select your school"}
                        </option>

                        {schools.map((school) => (
                            <option
                                key={school.id}
                                value={school.id}
                            >
                                {school.name} ({school.code})
                            </option>
                        ))}
                    </select>

                    </div>


                    {/* PASSWORD */}

                    <div>

                        <label className="mb-1 block text-sm font-medium">

                            Password

                        </label>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) =>
                                setPassword(
                                    e.target.value
                                )
                            }
                            required
                            className="w-full rounded-lg border px-4 py-3"
                            placeholder="Create a password"
                        />

                    </div>


                    {/* CONFIRM PASSWORD */}

                    <div>

                        <label className="mb-1 block text-sm font-medium">

                            Confirm Password

                        </label>

                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) =>
                                setConfirmPassword(
                                    e.target.value
                                )
                            }
                            required
                            className="w-full rounded-lg border px-4 py-3"
                            placeholder="Confirm your password"
                        />

                    </div>


                    {/* SUBMIT */}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >

                        {loading
                            ? "Creating account..."
                            : "Create Account"
                        }

                    </button>

                </form>


                {/* LOGIN LINK */}

                <p className="mt-6 text-center text-sm text-gray-600">

                    Already have an account?{" "}

                    <Link
                        to="/login"
                        className="font-semibold text-blue-600 hover:underline"
                    >
                        Login
                    </Link>

                </p>

            </div>

        </div>
    );
}