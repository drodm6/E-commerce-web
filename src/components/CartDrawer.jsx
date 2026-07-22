import { money, SHIPPING_FLAT, FREE_SHIP_THRESHOLD } from "../utils/helpers";
import "./CartDrawer.css";

export default function CartDrawer({ cart, products, onClose, onQtyChange, onRemove, onCheckout }) {
  const items = cart
    .map((c) => {
      const p = products.find((pr) => pr.id === c.id);
      return p ? { ...p, qty: c.qty } : null;
    })
    .filter(Boolean);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = items.length === 0 ? 0 : subtotal >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FLAT;
  const total = subtotal + shipping;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h2>Your Cart</h2>
          <button className="close-x" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="empty-cart">
              Your cart is empty.
              <br />
              Add something you like!
            </div>
          ) : (
            items.map((item) => (
              <div className="cart-item" key={item.id}>
                <div className="thumb">{item.emoji}</div>
                <div className="cart-item-info">
                  <div className="name">{item.name}</div>
                  <div className="id">ID: {item.id}</div>
                  <div className="qty-row">
                    <select value={item.qty} onChange={(e) => onQtyChange(item.id, Number(e.target.value))}>
                      {Array.from({ length: Math.min(item.stock, 10) || 1 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <span style={{ fontSize: "13px", color: "#eee" }}>{money(item.price * item.qty)}</span>
                    <button className="btn-danger" onClick={() => onRemove(item.id)}>
                      Discard
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="drawer-foot">
          <div className="sum-row">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="sum-row">
            <span>Shipping</span>
            <span>{shipping === 0 && items.length > 0 ? "FREE" : money(shipping)}</span>
          </div>
          <div className="sum-row total">
            <span>Total (Cash on Delivery)</span>
            <span>{money(total)}</span>
          </div>
          <button
            className="agree-btn"
            disabled={items.length === 0}
            onClick={() => onCheckout(items, subtotal, shipping, total)}
          >
            I Agree — Place Order
          </button>
        </div>
      </div>
    </div>
  );
}
