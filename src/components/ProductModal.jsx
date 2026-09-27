import { useLayoutEffect, useRef, useState, useId } from "react";
import { ProductVisual } from "./GarmentArt.jsx";
import { stockBadge } from "./ProductCard.jsx";
import { IconClose, IconMinus, IconPlus, IconShip, IconCash, IconWhatsApp, IconRuler, IconCheck, IconTruck } from "./Icons.jsx";
import { useDialog } from "../hooks/useDialog.js";
import { money, moneyWhole, prefersReducedMotion, whatsappLink } from "../utils/helpers.js";
import { LIMITS } from "../utils/validate.js";
import { STORE } from "../config.js";
import "./ProductModal.css";

const SIZE_GUIDES = {
  tops: {
    note: "Chest measurement, in cm.",
    head: ["Size", "Chest", "Length"],
    rows: [["S", "86–90", "64"], ["M", "90–96", "66"], ["L", "96–102", "68"], ["XL", "102–108", "70"], ["XXL", "108–114", "72"]],
  },
  trousers: {
    note: "Body measurements, in cm.",
    head: ["Size", "Waist", "Hips"],
    rows: [["S", "64–68", "88–92"], ["M", "68–72", "92–96"], ["L", "72–78", "96–102"], ["XL", "78–84", "102–108"]],
  },
  boots: {
    note: "Foot length, heel to longest toe.",
    head: ["EU", "Foot length"],
    rows: [["36", "23.0 cm"], ["37", "23.5 cm"], ["38", "24.0 cm"], ["39", "24.5 cm"], ["40", "25.0 cm"], ["41", "25.5 cm"]],
  },
};
const GUIDE_FOR = { coat: "tops", puffer: "tops", sweater: "tops", hoodie: "tops", trousers: "trousers", boots: "boots" };

// Zoom the panel out of the card that was clicked (FLIP), or slide up as a
// sheet on phones. Uses the Web Animations API — no inline <style> needed.
function animatePanel(panel, originRect, reverse) {
  if (!panel?.animate) return null;
  if (prefersReducedMotion()) {
    return panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, direction: reverse ? "reverse" : "normal", fill: "both" });
  }
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  let from;
  let opacity = 0.2;
  if (mobile) {
    from = "translateY(100%)";
    opacity = 1;
  } else if (originRect) {
    const m = panel.getBoundingClientRect();
    const s = Math.max(0.2, Math.min(originRect.width / m.width, originRect.height / m.height));
    const dx = originRect.left + originRect.width / 2 - (m.left + m.width / 2);
    const dy = originRect.top + originRect.height / 2 - (m.top + m.height / 2);
    from = `translate(${dx}px, ${dy}px) scale(${s})`;
  } else {
    from = "translateY(24px) scale(.96)";
  }
  return panel.animate([{ transform: from, opacity }, { transform: "none", opacity: 1 }], {
    duration: reverse ? 340 : 560,
    easing: reverse ? "cubic-bezier(.5,0,.75,0)" : "cubic-bezier(.16,1,.3,1)",
    direction: reverse ? "reverse" : "normal",
    fill: "both",
  });
}

export default function ProductModal({ product, originRect, onClose, onAdd }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const [closing, setClosing] = useState(false);
  const [color, setColor] = useState(product.colors[0] || null);
  const [size, setSize] = useState(product.sizes.length === 1 ? product.sizes[0] : "");
  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const [added, setAdded] = useState(false);

  const soldOut = product.stock <= 0;
  const maxQty = Math.max(1, Math.min(product.stock, LIMITS.maxQty));
  const guide = SIZE_GUIDES[GUIDE_FOR[product.art]];
  const stock = stockBadge(product);

  useLayoutEffect(() => {
    animatePanel(panelRef.current, originRect, false);
  }, [originRect]);

  function close() {
    if (closing) return;
    setClosing(true);
    const anim = animatePanel(panelRef.current, originRect, true);
    if (anim) anim.onfinish = onClose;
    else onClose();
  }

  useDialog(panelRef, close);

  function add() {
    if (product.sizes.length && !size) {
      setSizeError(true);
      panelRef.current?.querySelector(".pm-sizes")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    onAdd(product, { size, color: color?.name || "", qty });
    setAdded(true);
    setTimeout(close, 650);
  }

  const askText = `Hi Frost! I have a question about "${product.name}" (${product.id}).`;

  return (
    <div className={"pm-backdrop" + (closing ? " is-closing" : "")} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="pm-panel" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <button className="pm-close" onClick={close} aria-label="Close" data-autofocus>
          <IconClose />
        </button>

        <div className="pm-gallery">
          <div className="pm-stage" style={{ "--tint": color?.hex || "#a9774f" }}>
            <div className="pm-stage-art" key={`${imageIndex}-${color?.name}`}>
              <ProductVisual product={product} color={color} index={imageIndex} />
            </div>
            <div className="pm-badges">
              {product.isNew && <span className="badge badge-new">New</span>}
              {product.compareAt && <span className="badge badge-sale">Save {money(product.compareAt - product.price)}</span>}
            </div>
          </div>
          {product.images.length > 1 && (
            <div className="pm-thumbs" role="group" aria-label="Photos">
              {product.images.map((src, i) => (
                <button key={src} className={"pm-thumb" + (i === imageIndex ? " is-active" : "")} onClick={() => setImageIndex(i)} aria-label={`Photo ${i + 1}`} aria-pressed={i === imageIndex}>
                  <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pm-info">
          <p className="eyebrow">
            {product.category} · Pre-order
          </p>
          <h2 id={titleId} className="pm-title">
            {product.name}
          </h2>

          <div className="pm-price-row">
            <span className="pm-price">{money(product.price)}</span>
            {product.compareAt && <s className="pm-compare">{money(product.compareAt)}</s>}
            <span className={"pm-stock" + (stock ? ` is-${stock.tone}` : "")}>{stock ? stock.label : "In stock for this batch"}</span>
          </div>

          {product.desc && <p className="pm-desc">{product.desc}</p>}

          {product.colors.length > 0 && (
            <fieldset className="pm-field">
              <legend>
                Colour <b>{color?.name}</b>
              </legend>
              <div className="pm-swatches">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className={"pm-swatch" + (color?.name === c.name ? " is-active" : "")}
                    style={{ "--sw": c.hex }}
                    onClick={() => setColor(c)}
                    aria-pressed={color?.name === c.name}
                    aria-label={c.name}
                    title={c.name}
                  />
                ))}
              </div>
            </fieldset>
          )}

          {product.sizes.length > 0 && (
            <fieldset className={"pm-field pm-sizes" + (sizeError ? " has-error" : "")}>
              <legend>
                Size {size && <b>{size}</b>}
                {guide && (
                  <button type="button" className="link-btn" onClick={() => setShowGuide((v) => !v)} aria-expanded={showGuide}>
                    <IconRuler size={16} /> Size guide
                  </button>
                )}
              </legend>
              <div className="pm-size-list">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={"size-pill" + (size === s ? " is-active" : "")}
                    onClick={() => {
                      setSize(s);
                      setSizeError(false);
                    }}
                    aria-pressed={size === s}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {sizeError && (
                <p className="field-error" role="alert">
                  Please choose a size first.
                </p>
              )}
              {guide && (
                <div className={"collapse" + (showGuide ? " is-open" : "")}>
                  <div>
                    <div className="size-guide">
                      <table>
                        <thead>
                          <tr>
                            {guide.head.map((h) => (
                              <th key={h}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {guide.rows.map((r) => (
                            <tr key={r[0]} className={r[0] === size ? "is-active" : ""}>
                              {r.map((cell, i) => (
                                <td key={i}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p>{guide.note} Our pieces use Asian sizing, which often runs small — between sizes, choose the larger one or message us.</p>
                    </div>
                  </div>
                </div>
              )}
            </fieldset>
          )}

          <div className="pm-buy">
            <div className="stepper" role="group" aria-label="Quantity">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1 || soldOut} aria-label="Decrease quantity">
                <IconMinus size={16} />
              </button>
              <output aria-live="polite">{qty}</output>
              <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty || soldOut} aria-label="Increase quantity">
                <IconPlus size={16} />
              </button>
            </div>
            <button className={"btn btn-dark btn-block" + (added ? " is-done" : "")} onClick={add} disabled={soldOut || added}>
              {soldOut ? "Sold out — next batch soon" : added ? (<><IconCheck size={18} /> Added to bag</>) : `Add to bag · ${money(product.price * qty)}`}
            </button>
          </div>

          <ul className="pm-perks">
            <li>
              <IconTruck size={20} />
              <span>
                <b>Free delivery over {moneyWhole(STORE.freeShippingThreshold)}</b> to your address — anywhere in Iraq &amp; Kurdistan
              </span>
            </li>
            <li>
              <IconShip size={20} />
              <span>
                <b>Shipped by sea</b> with our next batch · arrives in about {STORE.deliveryEstimate}
              </span>
            </li>
            <li>
              <IconCash size={20} />
              <span>
                <b>Cash on delivery</b> — pay nothing until it reaches you
              </span>
            </li>
            <li>
              <IconWhatsApp size={20} />
              <span>
                <b>Confirm on WhatsApp</b> by sending us your receipt screenshot
              </span>
            </li>
          </ul>

          {(product.material || product.fit || product.care) && (
            <dl className="pm-details">
              {product.material && (
                <div>
                  <dt>Material</dt>
                  <dd>{product.material}</dd>
                </div>
              )}
              {product.fit && (
                <div>
                  <dt>Fit</dt>
                  <dd>{product.fit}</dd>
                </div>
              )}
              {product.care && (
                <div>
                  <dt>Care</dt>
                  <dd>{product.care}</dd>
                </div>
              )}
            </dl>
          )}

          <div className="pm-foot">
            <a className="link-btn" href={whatsappLink(askText)} target="_blank" rel="noopener noreferrer">
              <IconWhatsApp size={16} /> Ask us about this piece
            </a>
            <span className="pm-id">ID {product.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
