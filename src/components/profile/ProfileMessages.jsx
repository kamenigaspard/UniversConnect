
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export default function ProfileMessages({ message, error }) {
  if (!message && !error) return null;

  return (
    <div className="space-y-3">
      {message && (
        <div className="flex items-start gap-3 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />

          <p className="flex-1">{message}</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />

          <p className="flex-1">{error}</p>
        </div>
      )}
    </div>
  );
}
