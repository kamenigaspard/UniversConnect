
import React from "react";
import { ArrowLeftCircle } from "lucide-react";

function SearchHeader({ onBack }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="rounded-full p-2 text-violet-600 hover:bg-violet-50"
        aria-label="Go back"
      >
        <ArrowLeftCircle size={28} />
      </button>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Search People
        </h1>

        <p className="text-sm text-slate-500">
          Find students, teachers and administrators
        </p>
      </div>
    </div>
  );
}

export default SearchHeader;

