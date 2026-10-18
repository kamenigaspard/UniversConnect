/**
 * Landing Page
 *
 * The first screen visitors see before logging into UniVerse.
 */

import { GraduationCap, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

function LandingPage() {
  const navigation = useNavigate();

  const features = [
    {
      title: "Students",
      description:
        "Connect and communicate with your university community.",
      icon: "01",
    },
    {
      title: "Teachers",
      description:
        "Connect with students and share useful information.",
      icon: "02",
    },
    {
      title: "Schools",
      description:
        "Every school gets its own identity and community.",
      icon: "03",
    },
  ];

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#090414] text-white">
      {/* Ambient neon purple background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-32 top-[-8rem] h-96 w-96 rounded-full bg-violet-600/30 blur-[120px]" />
        <div className="absolute -right-24 top-[20%] h-80 w-80 rounded-full bg-fuchsia-600/25 blur-[110px]" />
        <div className="absolute bottom-[-8rem] left-[25%] h-96 w-96 rounded-full bg-purple-700/30 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(109,40,217,0.16),transparent_65%)]" />
      </div>

      {/* Main centered container */}
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-5 py-14 text-center sm:px-8 sm:py-20">
        {/* Glass application icon */}
        <div className="group relative mb-7">
          <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-purple-600 opacity-70 blur-2xl transition duration-500 group-hover:opacity-100" />

          <div className="relative flex h-20 w-20 items-center justify-center rounded-[1.6rem] border border-white/40 bg-gradient-to-br from-violet-400/90 via-purple-600/90 to-fuchsia-600/90 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.65),0_0_22px_rgba(168,85,247,0.7),0_0_55px_rgba(124,58,237,0.4)] backdrop-blur-2xl transition duration-300 hover:scale-105 sm:h-24 sm:w-24">
            <div className="absolute inset-[3px] rounded-[1.4rem] border border-white/20" />
            <GraduationCap size={44} strokeWidth={1.8} className="relative drop-shadow-[0_0_12px_rgba(255,255,255,0.55)] sm:h-12 sm:w-12" />
          </div>
        </div>

        {/* Application name */}
        <div className="flex items-center gap-2 rounded-full border border-violet-300/25 bg-white/[0.06] px-4 py-1.5 text-xs font-medium tracking-[0.2em] text-violet-200 shadow-[0_0_24px_rgba(139,92,246,0.12)] backdrop-blur-xl sm:text-sm">
          <Sparkles size={14} className="text-fuchsia-300" />
          YOUR CAMPUS. YOUR COMMUNITY.
        </div>

        <h1 className="mt-5 bg-gradient-to-r from-white via-violet-100 to-fuchsia-200 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent drop-shadow-[0_0_28px_rgba(168,85,247,0.28)] sm:text-7xl lg:text-8xl">
          UniVerse
        </h1>

        <p className="mt-5 max-w-xl text-base leading-7 text-violet-100/75 sm:text-lg sm:leading-8">
          A private social network connecting students, teachers and
          administrators across the university.
        </p>

        {/* Feature glass cards */}
        <div className="mt-10 grid w-full max-w-4xl grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-3 sm:gap-5">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-violet-300/20 bg-white/[0.055] p-5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_12px_35px_rgba(0,0,0,0.18)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-fuchsia-300/50 hover:bg-violet-400/[0.10] hover:shadow-[0_0_28px_rgba(139,92,246,0.20),0_18px_45px_rgba(0,0,0,0.25)] sm:p-6"
            >
              {/* Glass reflection */}
              <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-fuchsia-400/15 blur-2xl transition group-hover:bg-fuchsia-400/25" />

              <div className="relative mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-gradient-to-br from-violet-400/30 to-fuchsia-500/20 text-sm font-bold text-violet-100 shadow-[0_0_18px_rgba(139,92,246,0.20)]">
                {feature.icon}
              </div>

              <h2 className="relative text-lg font-semibold text-white">
                {feature.title}
              </h2>

              <p className="relative mt-2 text-sm leading-6 text-violet-100/65">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Glowing Get Started button */}
        <div className="group relative mt-10 sm:mt-12">
          <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-purple-500 opacity-70 blur-xl transition duration-300 group-hover:opacity-100 group-hover:blur-2xl" />

          <button
            type="button"
            onClick={() => navigation("/signup")}
            className="relative inline-flex min-h-14 items-center justify-center gap-3 overflow-hidden rounded-full border border-white/55 bg-gradient-to-r from-violet-600/95 via-purple-600/95 to-fuchsia-600/95 px-8 py-4 font-semibold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.65),inset_0_-3px_8px_rgba(46,16,101,0.35),0_0_16px_rgba(192,132,252,0.75),0_0_42px_rgba(124,58,237,0.40)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.75),0_0_24px_rgba(216,180,254,0.95),0_0_60px_rgba(168,85,247,0.65)] active:scale-[0.98]"
          >
            {/* Glossy highlight */}
            <span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
            <span className="pointer-events-none absolute -left-1/2 top-0 h-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-[450%]" />

            Get Started
            <ArrowRight
              size={20}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </button>
        </div>

        <p className="mt-5 text-xs text-violet-200/45">
          Connect · Share · Belong
        </p>
      </div>
    </main>
  );
}

export default LandingPage;