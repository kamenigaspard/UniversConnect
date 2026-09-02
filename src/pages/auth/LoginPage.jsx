import { useState } from "react";

import {
    Link,
    useNavigate
} from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";


export default function Login() {

    const navigate = useNavigate();


    // Authentication function from AuthContext.
    const {
        signIn
    } = useAuth();


    // ========================================================
    // FORM STATE
    // ========================================================

    const [email, setEmail] =
        useState("");


    const [password, setPassword] =
        useState("");


    // ========================================================
    // UI STATE
    // ========================================================

    const [loading, setLoading] =
        useState(false);


    const [error, setError] =
        useState("");


    // ========================================================
    // REDIRECT BASED ON ROLE
    // ========================================================

    const redirectByRole = (role) => {

        switch (role) {

            case "student":

                navigate(
                    "/student-home",
                    { replace: true }
                );

                break;


            case "teacher":

                navigate(
                    "/admin-home",
                    { replace: true }
                );

                break;


            case "admin":

                navigate(
                    "/admin-home",
                    { replace: true }
                );

                break;


            case "super_admin":

                navigate(
                    "/super-admin-home",
                    { replace: true }
                );

                break;


            default:

                setError(
                    "Your account has an invalid role."
                );
        }
    };


    // ========================================================
    // HANDLE LOGIN
    // ========================================================

    const handleLogin = async (e) => {

        e.preventDefault();


        setLoading(true);

        setError("");


        try {

            /*
             * Authenticate the user through AuthContext.
             */
            const {
                profile
            } = await signIn({

                email,

                password
            });


            /*
             * Redirect according to the role stored
             * in public.profiles.
             */
            redirectByRole(
                profile.role
            );


        } catch (error) {

            console.error(
                "Login error:",
                error
            );


            setError(
                error.message ||
                "Unable to login."
            );


        } finally {

            setLoading(false);
        }
    };


    // ========================================================
    // PAGE
    // ========================================================

    return (

        <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">

            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">

                <h1 className="text-3xl font-bold text-center">
                    Welcome Back
                </h1>


                <p className="mt-2 text-center text-gray-500">
                    Login to your university community
                </p>


                {/* ERROR */}

                {error && (

                    <div className="mt-5 rounded-lg bg-red-100 p-3 text-sm text-red-700">

                        {error}

                    </div>

                )}


                <form
                    onSubmit={handleLogin}
                    className="mt-6 space-y-5"
                >

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
                            className="w-full rounded-lg border px-4 py-3 outline-none"
                            placeholder="Enter your email"
                        />

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
                            className="w-full rounded-lg border px-4 py-3 outline-none"
                            placeholder="Enter your password"
                        />

                    </div>


                    {/* LOGIN BUTTON */}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >

                        {loading
                            ? "Logging in..."
                            : "Login"
                        }

                    </button>

                </form>


                {/* SIGNUP */}

                <p className="mt-6 text-center text-sm text-gray-600">

                    Don't have an account?{" "}

                    <Link
                        to="/signup"
                        className="font-semibold text-blue-600 hover:underline"
                    >
                        Create Account
                    </Link>

                </p>

            </div>

        </div>
    );
}