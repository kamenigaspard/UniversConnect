
import { Shield, GraduationCap, BookOpen, Crown } from "lucide-react";

const ROLE_DETAILS = {
  student: {
    label: "Student",
    description: "University student account",
    icon: GraduationCap,
  },
  teacher: {
    label: "Teacher",
    description: "University teaching staff account",
    icon: BookOpen,
  },
  admin: {
    label: "Administrator",
    description: "University administration account",
    icon: Shield,
  },
  super_admin: {
    label: "Super Administrator",
    description: "Platform-wide management account",
    icon: Crown,
  },
};

export default function ProfileRole({ role }) {
  const roleDetails = ROLE_DETAILS[role] || {
    label: "Unknown Role",
    description: "Your account role could not be identified.",
    icon: Shield,
  };

  const RoleIcon = roleDetails.icon;

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Shield
          size={20}
          className="text-[var(--accent-primary)]"
        />

        <h3 className="font-semibold text-[var(--text-primary)]">
          Account Role
        </h3>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--page-bg-secondary)]">
          <RoleIcon
            size={24}
            className="text-[var(--accent-primary)]"
          />
        </div>

        <div>
          <p className="font-semibold text-[var(--text-primary)]">
            {roleDetails.label}
          </p>

          <p className="text-sm text-[var(--text-secondary)]">
            {roleDetails.description}
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs text-[var(--text-secondary)]">
        Your role is assigned by the university administration and cannot
        be changed from your profile.
      </p>
    </section>
  );
}
