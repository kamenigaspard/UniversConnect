
import React from "react";
import { Search } from "lucide-react";

function SearchBar({
  value,
  onChange,
  searchingUsers,
}) {
  return (
    <div className="relative mt-6">
      <Search
        size={20}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-600"
      />

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by name or username..."
        className="w-full rounded-2xl border border-violet-100 bg-violet-50/40 py-3 pl-11 pr-12 outline-none focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
        autoFocus
      />

      {value && !searchingUsers && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs font-medium text-violet-600 hover:bg-violet-100"
        >
          Clear
        </button>
      )}
    </div>
  );
}

export default SearchBar;
