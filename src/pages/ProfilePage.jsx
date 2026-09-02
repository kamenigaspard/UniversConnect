/**
 * Temporary Profile Page.
 *
 * Later this will load the authenticated user's
 * profile from Supabase.
 */

function ProfilePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">

      <h1 className="text-2xl font-bold text-slate-900">
        Profile
      </h1>

      <p className="mt-2 text-slate-500">
        Your profile will appear here.
      </p>

    </div>
  );
}

export default ProfilePage;