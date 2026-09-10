import { ArrowLeftCircle } from "lucide-react";
/**
 * Temporary Settings Page.
 *
 * We will eventually add:
 *
 * - Edit profile
 * - Privacy
 * - Notifications
 * - Password
 * - Blocked users
 * - Security
 * -Language (fr & En)
 * -theme (light & dark)
 * - Logout
 */

function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      
          <button
              type="button"
              onClick={() =>
              {
                if(window.history.length >2){
                    navigate(-1)
                }
              }
              }
              className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
              aria-label=""
            >

              <ArrowLeftCircle />

            </button>

      <h1 className="text-2xl font-bold text-slate-900">
        Settings
      </h1>

      <p className="mt-2 text-slate-500">
        Application settings will appear here.
      </p>

    </div>
  );
}

export default SettingsPage;