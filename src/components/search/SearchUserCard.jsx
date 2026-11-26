
import React from "react";
import { User } from "lucide-react";

function SearchUserCard({
  targetUser,
  action,
  starting,
  onOpenProfile,
  onSelectUser,
}) {
  if (!targetUser) return null;

  const ActionIcon = action?.icon;

  const getRoleBadge = (role) => {
    if (!role) return null;

    const colors = {
      student: "bg-blue-50 text-blue-700",
      teacher: "bg-green-50 text-green-700",
      admin: "bg-amber-50 text-amber-700",
      super_admin: "bg-purple-50 text-purple-700",
    };

    return (
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
          colors[role] || "bg-gray-50 text-gray-600"
        }`}
      >
        {role.replace("_", " ")}
      </span>
    );
  };

  // Hide the action button when no messaging action is available.
  const showAction =
    action &&
    action.type !== "none" &&
    ActionIcon;

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-violet-200">

      {/* PROFILE INFORMATION */}

      <button
        type="button"
        onClick={() => onOpenProfile(targetUser)}
        className="flex min-w-0 flex-1 items-center gap-3.5 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        aria-label={`View ${
          targetUser.full_name || targetUser.username
        }'s profile`}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 ring-2 ring-violet-500/20">
          {targetUser.avatar_url ? (
            <img
              src={targetUser.avatar_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <User
              size={22}
              className="text-violet-600"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">
            {targetUser.full_name || targetUser.username}
          </p>

          <p className="truncate text-xs text-slate-500">
            @{targetUser.username}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {getRoleBadge(targetUser.role)}

            {targetUser.school_id && (
              <span className="text-[10px] text-slate-400">
                School #{targetUser.school_id.slice(0, 8)}
              </span>
            )}
          </div>

          <p className="mt-1 text-[10px] font-medium text-violet-600">
            View profile
          </p>
        </div>
      </button>

      {/* MESSAGING ACTION */}

      {showAction && (
        <button
          type="button"
          onClick={() => onSelectUser(targetUser)}
          disabled={action.disabled || starting}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
            action.type === "pending"
              ? "bg-amber-100 text-amber-700"
              : "bg-violet-600 text-white hover:bg-violet-700"
          }`}
        >
          <ActionIcon
            size={14}
            className={
              action.type === "loading" || starting
                ? "animate-spin"
                : ""
            }
          />

          {starting ? "Opening..." : action.label}
        </button>
      )}
    </div>
  );
}

export default SearchUserCard;
