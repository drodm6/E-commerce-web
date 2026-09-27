import { useEffect, useMemo, useState } from "react";
import ConfirmDialog from "./ConfirmDialog.jsx";
import OrderDetail from "./OrderDetail.jsx";
import { IconSearch, IconReceipt } from "../components/Icons.jsx";
import { api } from "../api.js";
import { money, formatDate } from "../utils/helpers.js";
import { ORDER_STATUSES, isOrderNumber } from "../utils/validate.js";
import { toCSV, downloadFile, today } from "./adminUtils.js";

const label = (id) => ORDER_STATUSES.find((s) => s.id === id)?.label || id;

export default function OrdersTab({ orders, setOrders, guard, refresh, initialOpen, onOpened }) {
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [lookup, setLookup] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [open, setOpen] = useState(initialOpen || null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    if (initialOpen) {
      setOpen(initialOpen);
      onOpened();
    }
  }, [initialOpen, onOpened]);

  function checkReceipt(e) {
    e.preventDefault();
    const n = lookup.trim().toUpperCase().replace(/^#/, "").replace(/^FR(?!-)/, "FR-");
    if (!isOrderNumber(n)) {
      setLookupError("Type the order number exactly as it appears on the receipt, e.g. FR-7K2Q9MXA.");
      return;
    }
    if (!orders.some((o) => o.orderNumber === n)) {
      setLookupError(`No order #${n} found. The screenshot may be fake or edited — ask the customer to check.`);
      return;
    }
    setLookupError("");
    setOpen(n);
  }

  const counts = useMemo(() => {
    const c = { all: orders.length };
    ORDER_STATUSES.forEach((s) => (c[s.id] = orders.filter((o) => o.status === s.id).length));
    return c;
  }, [orders]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return orders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (!q) return true;
      const c = o.customer;
      const text = `${o.orderNumber} ${c.name} ${c.governorate} ${c.city} ${c.address}`.toLowerCase();
      return text.includes(q) || (digits.length >= 3 && c.phone.replace(/\D/g, "").includes(digits));
    });
  }, [orders, status, query]);

  function exportCSV() {
    const rows = [["Order", "Date", "Status", "Name", "Phone", "Governorate", "City", "Address", "Items", "Subtotal", "Delivery", "Total", "Note"]];
    orders.forEach((o) =>
      rows.push([
        o.orderNumber,
        o.createdAt,
        label(o.status),
        o.customer.name,
        o.customer.phone,
        o.customer.governorate,
        o.customer.city,
        o.customer.address,
        o.items.map((i) => `${i.qty}x ${i.name} (${i.id}) [${[i.size, i.color].filter(Boolean).join("/")}]`).join("; "),
        o.subtotal,
        o.shipping,
        o.total,
        o.adminNote,
      ])
    );
    downloadFile(`frost-orders-${today()}.csv`, toCSV(rows), "text/csv;charset=utf-8");
  }

  async function quickStatus(o, next) {
    try {
      const updated = await guard(api.admin.updateOrder(o.orderNumber, { status: next }));
      setOrders((prev) => prev.map((x) => (x.orderNumber === o.orderNumber ? updated : x)));
    } catch (e) {
      if (e.status !== 401) alert(e.message);
    }
  }

  return (
    <div className="adm-page">
      <header className="adm-page-head">
        <div>
          <p className="adm-eyebrow">Sales</p>
          <h1>Orders</h1>
        </div>
        <div className="adm-head-actions">
          <button className="adm-btn adm-btn-ghost" onClick={refresh}>
            Refresh
          </button>
          <button className="adm-btn adm-btn-ghost" onClick={exportCSV} disabled={!orders.length}>
            Export CSV
          </button>
        </div>
      </header>

      <form className="adm-card adm-lookup" onSubmit={checkReceipt}>
        <div className="adm-card-head">
          <h2>
            <IconReceipt size={20} /> Check a WhatsApp receipt
          </h2>
        </div>
        <p className="adm-muted">
          Type the order number from the customer's screenshot. You'll see the real order — customer, address, every item, size, colour and total — so you can
          confirm the screenshot matches.
        </p>
        <div className="adm-lookup-row">
          <input
            value={lookup}
            onChange={(e) => {
              setLookup(e.target.value);
              setLookupError("");
            }}
            placeholder="FR-7K2Q9MXA"
            maxLength={16}
            spellCheck={false}
            autoCapitalize="characters"
            aria-label="Order number"
          />
          <button className="adm-btn adm-btn-primary" disabled={!lookup.trim()}>
            Check order
          </button>
        </div>
        {lookupError && (
          <p className="adm-error" role="alert">
            {lookupError}
          </p>
        )}
      </form>

      <div className="adm-status-tabs" role="group" aria-label="Filter by status">
        {[{ id: "all", label: "All" }, ...ORDER_STATUSES].map((s) => (
          <button key={s.id} className={"adm-chip" + (status === s.id ? " is-active" : "")} onClick={() => setStatus(s.id)} aria-pressed={status === s.id}>
            {s.label} <em>{counts[s.id] || 0}</em>
          </button>
        ))}
      </div>

      <div className="adm-filters">
        <label className="adm-search">
          <IconSearch size={17} />
          <input placeholder="Search order #, name, phone, city, address" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={60} aria-label="Search orders" />
        </label>
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table adm-orders-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Delivery to</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((o) => (
              <tr key={o.orderNumber}>
                <td>
                  <button className="adm-order-link" onClick={() => setOpen(o.orderNumber)}>
                    #{o.orderNumber}
                  </button>
                  <small className="adm-block adm-muted">{formatDate(o.createdAt)}</small>
                </td>
                <td>
                  <b>{o.customer.name}</b>
                  <small className="adm-block adm-muted">{o.customer.phone}</small>
                </td>
                <td>
                  {o.customer.city}, {o.customer.governorate}
                  <small className="adm-block adm-muted adm-clip">{o.customer.address}</small>
                </td>
                <td className="adm-items-cell">
                  {o.items.map((i, idx) => (
                    <span key={idx} className="adm-block">
                      {i.qty}× {i.name} <small className="adm-muted">{[i.size, i.color].filter(Boolean).join(" · ")}</small>
                    </span>
                  ))}
                </td>
                <td>
                  <b>{money(o.total)}</b>
                </td>
                <td>
                  <select className={`adm-status-select s-${o.status}`} value={o.status} onChange={(e) => quickStatus(o, e.target.value)} aria-label={`Status of order ${o.orderNumber}`}>
                    {ORDER_STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <div className="adm-row-actions">
                    <button className="adm-btn adm-btn-sm adm-btn-ghost" onClick={() => setOpen(o.orderNumber)}>
                      Details
                    </button>
                    <button
                      className="adm-btn adm-btn-sm adm-btn-danger-ghost"
                      onClick={() =>
                        setConfirm({
                          title: `Delete order #${o.orderNumber}?`,
                          message: "This permanently removes it. Unshipped items go back into stock. Prefer “Cancelled” if you want to keep a record.",
                          confirmLabel: "Delete order",
                          danger: true,
                          onConfirm: async () => {
                            setConfirm(null);
                            try {
                              await guard(api.admin.deleteOrder(o.orderNumber));
                              refresh();
                            } catch (e) {
                              if (e.status !== 401) alert(e.message);
                            }
                          },
                        })
                      }
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="adm-empty">
                  {orders.length ? "No orders match." : "No orders yet. They'll appear here the moment a customer places one."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <OrderDetail
          key={open}
          orderNumber={open}
          guard={guard}
          onClose={() => setOpen(null)}
          onOpenOther={setOpen}
          onChanged={(updated) => {
            setOrders((prev) => prev.map((x) => (x.orderNumber === updated.orderNumber ? updated : x)));
            if (updated.status === "cancelled") refresh(); // stock changed
          }}
        />
      )}
      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}
