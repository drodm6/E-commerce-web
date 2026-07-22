import { money, WHATSAPP_NUMBER } from "../utils/helpers";
import "./ReceiptModal.css";

export default function ReceiptModal({ order, onClose }) {
  return (
    <div className="modal-center" onClick={onClose}>
      <div className="receipt" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-head">
          <div className="ok">✅</div>
          <h2>ORDER CONFIRMED</h2>
          <div className="receipt-order">#{order.orderNumber}</div>
        </div>

        <div className="receipt-body">
          <div style={{ fontSize: "11px", color: "#666" }}>Placed: {order.date}</div>
          <div className="dash"></div>

          {order.items.map((i) => (
            <div key={i.id} className="r-line">
              <span>
                {i.qty} × {i.name}
                <br />
                <span className="rid">ID: {i.id}</span>
              </span>
              <span>{money(i.price * i.qty)}</span>
            </div>
          ))}

          <div className="dash"></div>
          <div className="r-line">
            <span>Subtotal</span>
            <span>{money(order.subtotal)}</span>
          </div>
          <div className="r-line">
            <span>Shipping</span>
            <span>{order.shipping === 0 ? "FREE" : money(order.shipping)}</span>
          </div>
          <div className="dash"></div>
          <div className="r-total">
            <span>PAY ON ARRIVAL</span>
            <span>{money(order.total)}</span>
          </div>
        </div>

        <div className="receipt-note">
          📸 <b>Take a screenshot of this receipt</b> and send it via <b>WhatsApp</b> to:
          <br />
          <b style={{ fontSize: "15px" }}>{WHATSAPP_NUMBER}</b>
          <br />
          Your order number <b>#{order.orderNumber}</b> confirms this purchase. Please have{" "}
          <b>{money(order.total)}</b> ready in cash when your order arrives.
        </div>

        <div className="receipt-actions">
          <button className="btn-outline" style={{ flex: 1 }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
