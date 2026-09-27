import { useRef, useState, useId } from "react";
import { ProductVisual } from "./GarmentArt.jsx";
import { IconClose, IconMinus, IconPlus, IconTrash, IconShip, IconArrowRight, IconBag } from "./Icons.jsx";
import { useDialog, useExitAnimation } from "../hooks/useDialog.js";
import { money, moneyWhole, computeTotals } from "../utils/helpers.js";
import { validateCustomer, CUSTOMER_FIELDS, LIMITS } from "../utils/validate.js";
import { STORE, GOVERNORATES } from "../config.js";
import "./CartDrawer.css";

const EMPTY_CUSTOMER = { name: "", phone: "", governorate: "", city: "", address: "", notes: "" };

export default function CartDrawer({ lines, onClose, onQtyChange, onRemove, onPlaceOrder }) {
  const ref = useRef(null);
  const titleId = useId();
  const [closing, requestClose] = useExitAnimation(onClose, 320);
  const [step, setStep] = useState("bag");
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [errors, setErrors] = useState({});
  const [agreed, setAgreed] = useState(false);
  const [agreeError, setAgreeError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [honeypot, setHoneypot] = useState("");
  useDialog(ref, requestClose);

  const { subtotal, shipping, total } = computeTotals(lines);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const toFree = Math.max(0, STORE.freeShippingThreshold - subtotal);
  const freePct = Math.min(100, (subtotal / STORE.freeShippingThreshold) * 100);

  const focusFirstError = () =>
    setTimeout(() => ref.current?.querySelector("[aria-invalid='true'], .agree.has-error")?.focus?.(), 0);

  async function submit(e) {
    e.preventDefault();
    if (submitting) return;
    const result = validateCustomer(customer);
    setErrors(result.errors);
    setAgreeError(!agreed);
    setServerError("");
    if (!result.ok || !agreed || lines.length === 0) return focusFirstError();
    setSubmitting(true);
    try {
      await onPlaceOrder(result.value, honeypot);
    } catch (err) {
      setServerError(err.message);
      if (err.fields) {
        setErrors(err.fields);
        focusFirstError();
      }
      setSubmitting(false);
    }
  }

  const field = (key, label, props = {}) => (
    <label className={"field" + (errors[key] ? " has-error" : "")}>
      <span className="field-label">
        {label}
        {CUSTOMER_FIELDS[key].min === 0 && <i> (optional)</i>}
      </span>
      <input
        value={customer[key]}
        maxLength={CUSTOMER_FIELDS[key].max}
        onChange={(e) => {
          setCustomer({ ...customer, [key]: e.target.value });
          if (errors[key]) setErrors({ ...errors, [key]: undefined });
        }}
        aria-invalid={errors[key] ? "true" : "false"}
        disabled={submitting}
        {...props}
      />
      {errors[key] && <span className="field-error">{errors[key]}</span>}
    </label>
  );

  return (
    <div className={"drawer-backdrop" + (closing ? " is-closing" : "")} onMouseDown={(e) => e.target === e.currentTarget && requestClose()}>
      <aside className="drawer" ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="drawer-head">
          {step === "details" ? (
            <button className="link-btn back-btn" onClick={() => setStep("bag")}>
              ← Back to bag
            </button>
          ) : null}
          <h2 id={titleId}>{step === "bag" ? <>Your bag <span className="muted">({count})</span></> : "Delivery details"}</h2>
          <button className="icon-btn" onClick={requestClose} aria-label="Close bag" data-autofocus>
            <IconClose />
          </button>
        </div>

        <div className="drawer-steps" aria-hidden="true">
          <span className={step === "bag" ? "is-on" : "is-done"}>1 · Bag</span>
          <span className={step === "details" ? "is-on" : ""}>2 · Details</span>
          <span>3 · Receipt</span>
        </div>

        {step === "bag" && (
          <>
            <div className="drawer-body">
              {lines.length === 0 ? (
                <div className="bag-empty">
                  <span className="bag-empty-icon">
                    <IconBag size={30} />
                  </span>
                  <p>Your bag is empty.</p>
                  <button className="btn btn-dark" onClick={requestClose}>
                    Browse the collection
                  </button>
                </div>
              ) : (
                <>
                  <div className="free-ship">
                    <p>
                      {toFree > 0 ? (
                        <>
                          Add <b>{money(toFree)}</b> more for <b>free delivery</b> to your door
                        </>
                      ) : (
                        <b>You've unlocked free delivery to your address ✓</b>
                      )}
                    </p>
                    <div className="free-bar">
                      <span style={{ width: `${freePct}%` }} />
                    </div>
                  </div>

                  <ul className="bag-lines">
                    {lines.map((l) => {
                      const color = l.product.colors.find((c) => c.name === l.color);
                      const max = Math.min(l.product.stock, LIMITS.maxQty);
                      return (
                        <li className="bag-line" key={l.key}>
                          <div className="bag-thumb">
                            <ProductVisual product={l.product} color={color} />
                          </div>
                          <div className="bag-info">
                            <p className="bag-name">{l.name}</p>
                            <p className="bag-meta">{[l.size && `Size ${l.size}`, l.color].filter(Boolean).join(" · ")}</p>
                            <div className="bag-controls">
                              <div className="stepper stepper-sm" role="group" aria-label={`Quantity for ${l.name}`}>
                                <button onClick={() => onQtyChange(l.key, l.qty - 1)} disabled={l.qty <= 1} aria-label="Decrease">
                                  <IconMinus size={14} />
                                </button>
                                <output>{l.qty}</output>
                                <button onClick={() => onQtyChange(l.key, l.qty + 1)} disabled={l.qty >= max} aria-label="Increase">
                                  <IconPlus size={14} />
                                </button>
                              </div>
                              <button className="icon-btn icon-btn-sm" onClick={() => onRemove(l.key)} aria-label={`Remove ${l.name}`}>
                                <IconTrash size={16} />
                              </button>
                            </div>
                          </div>
                          <p className="bag-price">{money(l.price * l.qty)}</p>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="preorder-note">
                    <IconShip size={20} />
                    <p>
                      <b>Pre-order:</b> we collect orders and ship them together by sea to keep prices low. Delivered to {STORE.deliveryArea}{" "}
                      in about {STORE.deliveryEstimate}. Free delivery on orders over {moneyWhole(STORE.freeShippingThreshold)}. You pay in cash when it arrives.
                    </p>
                  </div>
                </>
              )}
            </div>

            {lines.length > 0 && (
              <div className="drawer-foot">
                <Totals subtotal={subtotal} shipping={shipping} total={total} />
                <button className="btn btn-dark btn-block" onClick={() => setStep("details")}>
                  Continue to delivery details <IconArrowRight size={18} />
                </button>
              </div>
            )}
          </>
        )}

        {step === "details" && (
          <form className="drawer-form" onSubmit={submit} noValidate>
            <div className="drawer-body">
              <p className="form-intro">We'll use these details to deliver your order and to match your WhatsApp message.</p>
              {field("name", "Full name", { autoComplete: "name", required: true })}
              {field("phone", "Phone / WhatsApp number", { autoComplete: "tel", inputMode: "tel", type: "tel", required: true })}
              <label className={"field" + (errors.governorate ? " has-error" : "")}>
                <span className="field-label">Governorate</span>
                <select
                  value={customer.governorate}
                  onChange={(e) => {
                    setCustomer({ ...customer, governorate: e.target.value });
                    if (errors.governorate) setErrors({ ...errors, governorate: undefined });
                  }}
                  aria-invalid={errors.governorate ? "true" : "false"}
                  disabled={submitting}
                  required
                >
                  <option value="">Choose your governorate…</option>
                  <optgroup label="Kurdistan Region">
                    {GOVERNORATES.slice(0, 4).map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Iraq">
                    {GOVERNORATES.slice(4).map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </optgroup>
                </select>
                {errors.governorate && <span className="field-error">{errors.governorate}</span>}
              </label>
              {field("city", "City / area", { autoComplete: "address-level2", required: true })}
              {field("address", "Address or nearest landmark", { autoComplete: "street-address", required: true })}
              {field("notes", "Note for us", { placeholder: "e.g. best time to call" })}

              {/* Honeypot: invisible to people, bots fill it in and get rejected. */}
              <label className="hp" aria-hidden="true">
                Website
                <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
              </label>

              <label className={"agree" + (agreeError ? " has-error" : "")} tabIndex={-1}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    setAgreeError(false);
                  }}
                />
                <span>
                  I understand this is a <b>pre-order</b>: it ships by sea in about {STORE.deliveryEstimate}, and I'll pay{" "}
                  <b>{money(total)}</b> in cash on delivery.
                </span>
              </label>
              {agreeError && <p className="field-error">Please tick the box to continue.</p>}
              {serverError && (
                <p className="form-error" role="alert">
                  {serverError}
                </p>
              )}
            </div>

            <div className="drawer-foot">
              <Totals subtotal={subtotal} shipping={shipping} total={total} />
              <button type="submit" className="btn btn-dark btn-block" disabled={submitting}>
                {submitting ? "Placing your order…" : "Place order & get receipt"}
              </button>
            </div>
          </form>
        )}
      </aside>
    </div>
  );
}

function Totals({ subtotal, shipping, total }) {
  return (
    <dl className="totals">
      <div>
        <dt>Subtotal</dt>
        <dd>{money(subtotal)}</dd>
      </div>
      <div>
        <dt>Delivery</dt>
        <dd>{shipping === 0 ? "Free" : money(shipping)}</dd>
      </div>
      <div className="totals-grand">
        <dt>Total · cash on delivery</dt>
        <dd>{money(total)}</dd>
      </div>
    </dl>
  );
}
