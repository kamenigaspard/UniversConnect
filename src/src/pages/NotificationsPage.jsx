import { ArrowLeftCircle } from "lucide-react";
/**
 * Temporary Notifications Page.
 *
 * Later Supabase Realtime will allow notifications
 * to appear without manually refreshing the page.
 */

function NotificationsPage() {
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
        Notifications
      </h1>

      <p className="mt-2 text-slate-500">
        Your university notifications will appear here.
      </p>

    </div>
  );
}

export default NotificationsPage;