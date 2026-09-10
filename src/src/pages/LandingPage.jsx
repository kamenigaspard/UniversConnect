/**
 * Landing Page
 *
 * This is the first screen visitors will see before
 * logging into the university social platform.
 */

import { GraduationCap, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

function LandingPage() {
  const navigation = useNavigate();
  return (
    <main className="min-h-screen bg-slate-50">

      {/* Main centered container */}
      <div className="mx-auto flex min-h-screen max-w-6xl
                      flex-col items-center justify-center
                      px-6 py-12 text-center">

        {/* University application icon */}
        <div className="mb-6 flex h-20 w-20
                        items-center justify-center
                        rounded-3xl bg-purple-600
                        text-white shadow-lg">

          <GraduationCap size={42} />
        </div>

        {/* Application name */}
        <h1 className="text-4xl font-bold tracking-tight
                       text-slate-900 sm:text-6xl">

          UniVerse
        </h1>

        {/* Application description */}
        <p className="mt-4 max-w-xl text-lg
                      leading-8 text-slate-600">

          A private social network connecting
          students, teachers and administrators
          across the university.
        </p>

        {/* Features */}
        <div className="mt-8 grid max-w-2xl
                        grid-cols-1 gap-4
                        sm:grid-cols-3">

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">
              Students
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Connect and communicate with your university community.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">
              Teachers
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Connect with students and share useful information.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">
              Schools
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Every school gets its own identity and community.
            </p>
          </div>

        </div>

        {/* Temporary button */}
        <button
          className="mt-10 flex items-center gap-2
                     rounded-xl bg-purple-600 px-6 py-3
                     font-semibold text-white
                     transition hover:bg-purple-700"
                     onClick={()=>{
                      navigation("/signup")
                     }}
        >

          Get Started

          <ArrowRight size={20} />

        </button>

      </div>

    </main>
  );
}

export default LandingPage;