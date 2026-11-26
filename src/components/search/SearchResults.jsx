
import React from "react";
import { Search, User } from "lucide-react";
import SearchUserCard from "./SearchUserCard";

function SearchResults({
  searchText,
  searchResults,
  searchingUsers,
  searchError,
  getUserAction,
  startingId,
  onOpenProfile,
  onSelectUser,
}) {
  return (
    <div className="mt-6">

      {/* INITIAL SEARCH PROMPT */}

      {!searchText.trim() && (
        <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-8 text-center">
          <Search
            size={38}
            className="mx-auto mb-3 text-violet-500"
          />

          <h2 className="font-semibold">
            Search for people
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Enter a name or username to discover people
            in your university community.
          </p>
        </div>
      )}

      {/* NO RESULTS */}

      {searchText.trim() &&
        !searchingUsers &&
        !searchError &&
        searchResults.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
            <User
              size={38}
              className="mx-auto mb-3 text-violet-500"
            />

            <h2 className="font-semibold">
              No people found
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Try another name or username.
            </p>
          </div>
        )}

      {/* SEARCH RESULTS */}

      {searchResults.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {searchResults.map((targetUser) => (
            <SearchUserCard
              key={targetUser.id}
              targetUser={targetUser}
              action={getUserAction(targetUser)}
              starting={startingId === targetUser.id}
              onOpenProfile={onOpenProfile}
              onSelectUser={onSelectUser}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchResults;
