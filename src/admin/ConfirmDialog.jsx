import { useRef, useId } from "react";
import { createPortal } from "react-dom";
import { useDialog } from "../hooks/useDialog.js";

export default function ConfirmDialog({ title, message, confirmLabel = "Confirm", danger = false, onConfirm, onCancel }) {
  const ref = useRef(null);
  const titleId = useId();
  useDialog(ref, onCancel);

  return createPortal(
    <div className="adm-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="adm-confirm" ref={ref} role="alertdialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <h2 id={titleId}>{title}</h2>
        {message && <p className="adm-muted">{message}</p>}
        <div className="adm-confirm-actions">
          <button className="adm-btn adm-btn-ghost" onClick={onCancel} data-autofocus>
            Cancel
          </button>
          <button className={"adm-btn " + (danger ? "adm-btn-danger" : "adm-btn-primary")} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
