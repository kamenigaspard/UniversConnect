/**
 * Temporary Requests Page.
 *
 * This will eventually contain two important systems:
 *
 * 1. Connection requests
 *    Student → Teacher/Admin
 *
 * 2. Message requests
 *    Student → Student
 *
 * The two systems will be handled separately.
 */

function RequestsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">

      <h1 className="text-2xl font-bold text-slate-900">
        Requests
      </h1>

      <p className="mt-2 text-slate-500">
        Connection and message requests will appear here.
      </p>

    </div>
  );
}

export default RequestsPage;