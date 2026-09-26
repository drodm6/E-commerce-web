import { useEffect } from "react";
import { IconCheck } from "./Icons.jsx";

export default function Toast({ toast, onAction, onDone }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [toast, onDone]);

  return (
    <div className="toast-region" aria-live="polite">
      {toast && (
        <div className="toast" key={toast.id}>
          <IconCheck size={18} />
          <span>{toast.text}</span>
          {toast.action && (
            <button className="toast-action" onClick={onAction}>
              {toast.action}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
