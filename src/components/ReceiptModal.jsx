import { useRef, useState, useId } from "react";
import { IconSnow, IconCamera, IconWhatsApp, IconCopy, IconCheck, IconClose } from "./Icons.jsx";
import { useDialog, useExitAnimation } from "../hooks/useDialog.js";
import { money, formatDate, whatsappLink, isValidWhatsAppNumber } from "../utils/helpers.js";
import { encodeOrder } from "../utils/orderCode.js";
import { STORE } from "../config.js";
import "./ReceiptModal.css";

function buildMessage(order) {
  const c = order.customer;
  const lines = order.items.map((i) => {
    const opts = [i.size && `Size ${i.size}`, i.color].filter(Boolean).join(", ");
    return `• ${i.qty} × ${i.name}${opts ? ` (${opts})` : ""} — ${money(i.price * i.qty)}`;
  });
  return [
    `Hello ${STORE.name}! I'd like to confirm my order 🧾`,
    ``,
    `Order: #${order.orderNumber}`,
    `Name: ${c.name}`,
    `Phone: ${c.phone}`,
    `City: ${c.city}`,
    `Address: ${c.address}`,
    c.notes ? `Note: ${c.notes}` : null,
    ``,
    ...lines,
    ``,
    `Total (cash on delivery): ${money(order.total)}`,
    ``,
    `📸 My receipt screenshot is attached.`,
    ``,
    `Order code (please don't edit): ${encodeOrder(order)}`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export default function ReceiptModal({ order, onClose }) {
  const ref = useRef(null);
  const titleId = useId();
  const [closing, requestClose] = useExitAnimation(onClose, 300);
  const [copied, setCopied] = useState(false);
  useDialog(ref, requestClose);

  const c = order.customer;
  const waReady = isValidWhatsAppNumber(STORE.whatsappNumber);

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(order.orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the number is visible anyway */
    }
  }

  return (
    <div className={"rc-backdrop" + (closing ? " is-closing" : "")} onMouseDown={(e) => e.target === e.currentTarget && requestClose()}>
      <div className="rc-dialog" ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <button className="rc-close" onClick={requestClose} aria-label="Close receipt">
          <IconClose />
        </button>

        <div className="rc-alert" role="status">
          <span className="rc-alert-icon">
            <IconCamera size={22} />
          </span>
          <p>
            <b>One last step!</b> Take a screenshot of this receipt and send it to us on WhatsApp — your order is confirmed once we
            receive it.
          </p>
        </div>

        <article className="receipt" aria-label="Order receipt">
          <header className="rc-head">
            <div className="rc-brand">
              <IconSnow size={18} />
              <span>FROST</span>
            </div>
            <p className="rc-kind">Order receipt</p>
          </header>

          <div className="rc-number">
            <span>Order number</span>
            <h2 id={titleId}>#{order.orderNumber}</h2>
            <button className="rc-copy" onClick={copyNumber} aria-label="Copy order number">
              {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <dl className="rc-meta">
            <div>
              <dt>Date</dt>
              <dd>{formatDate(order.createdAt)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd className="rc-status">Awaiting WhatsApp confirmation</dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>Cash on delivery</dd>
            </div>
            <div>
              <dt>Est. delivery</dt>
              <dd>{STORE.deliveryEstimate} (by sea)</dd>
            </div>
          </dl>

          <div className="rc-block">
            <h3>Deliver to</h3>
            <p>
              <b>{c.name}</b> · {c.phone}
              <br />
              {c.address}, {c.city}
              {c.notes && (
                <>
                  <br />
                  <i>Note: {c.notes}</i>
                </>
              )}
            </p>
          </div>

          <div className="rc-block">
            <h3>Items</h3>
            <ul className="rc-items">
              {order.items.map((i) => (
                <li key={`${i.id}-${i.size}-${i.color}`}>
                  <div>
                    <p className="rc-item-name">{i.name}</p>
                    <p className="rc-item-meta">
                      {[i.size && `Size ${i.size}`, i.color, `${i.qty} × ${money(i.price)}`].filter(Boolean).join(" · ")}
                      <span className="rc-item-id"> · {i.id}</span>
                    </p>
                  </div>
                  <span className="rc-item-total">{money(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>
          </div>

          <dl className="rc-totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{money(order.subtotal)}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{order.shipping === 0 ? "Free" : money(order.shipping)}</dd>
            </div>
            <div className="rc-grand">
              <dt>Pay on delivery</dt>
              <dd>{money(order.total)}</dd>
            </div>
          </dl>

          <footer className="rc-foot">
            Thank you for shopping with Frost{STORE.instagram ? ` · @${STORE.instagram}` : ""}
          </footer>
        </article>

        <section className="rc-next" aria-label="What to do next">
          <h3>What to do next</h3>
          <ol>
            <li>
              <b>Screenshot</b> this receipt.
            </li>
            <li>
              Tap <b>Send on WhatsApp</b> — your order details are already written for you.
            </li>
            <li>
              <b>Attach the screenshot</b> and press send. We'll reply to confirm.
            </li>
          </ol>

          {waReady ? (
            <a className="btn btn-whatsapp btn-block" href={whatsappLink(buildMessage(order))} target="_blank" rel="noopener noreferrer">
              <IconWhatsApp size={20} /> Send on WhatsApp
            </a>
          ) : (
            <p className="rc-warn">The store's WhatsApp number hasn't been set up yet (see src/config.js).</p>
          )}
          {waReady && (
            <p className="rc-wa-number">
              or message <b>+{STORE.whatsappNumber}</b> directly
            </p>
          )}
          <button className="btn btn-outline btn-block" onClick={requestClose}>
            Done
          </button>
          <p className="rc-hint">You can reopen this receipt any time from the receipt icon at the top of the page.</p>
        </section>
      </div>
    </div>
  );
}
