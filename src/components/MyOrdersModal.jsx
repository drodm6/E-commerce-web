import { useRef, useId } from "react";
import { IconClose, IconArrowRight } from "./Icons.jsx";
import { useDialog, useExitAnimation } from "../hooks/useDialog.js";
import { money, formatDate } from "../utils/helpers.js";

export default function MyOrdersModal({ orders, onClose, onOpenReceipt }) {
  const ref = useRef(null);
  const titleId = useId();
  const [closing, requestClose] = useExitAnimation(onClose, 260);
  useDialog(ref, requestClose);

  return (
    <div className={"rc-backdrop" + (closing ? " is-closing" : "")} onMouseDown={(e) => e.target === e.currentTarget && requestClose()}>
      <div className="rc-dialog orders-dialog" ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <button className="rc-close" onClick={requestClose} aria-label="Close" data-autofocus>
          <IconClose />
        </button>
        <h2 id={titleId} className="orders-title">
          Your receipts
        </h2>
        <p className="orders-sub">Orders placed on this device. Tap one to reopen its receipt.</p>
        <ul className="orders-list">
          {orders
            .slice()
            .reverse()
            .map((o) => (
              <li key={o.orderNumber}>
                <button onClick={() => onOpenReceipt(o)}>
                  <span>
                    <b>#{o.orderNumber}</b>
                    <small>
                      {formatDate(o.createdAt)} · {o.items.reduce((s, i) => s + i.qty, 0)} items
                    </small>
                  </span>
                  <span className="orders-total">
                    {money(o.total)} <IconArrowRight size={16} />
                  </span>
                </button>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
