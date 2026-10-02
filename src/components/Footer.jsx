import { IconSnow, IconInstagram, IconWhatsApp } from "./Icons.jsx";
import { STORE } from "../config.js";
import { instagramLink, isValidWhatsAppNumber, whatsappLink, moneyWhole } from "../utils/helpers.js";

export default function Footer() {
  const ig = instagramLink();
  const wa = isValidWhatsAppNumber(STORE.whatsappNumber) ? whatsappLink() : "";

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <IconSnow size={18} />
            </span>
            <span className="brand-word">FROST</span>
          </div>
          <p>
            A small winter clothing shop. We hand-pick every piece, collect orders, and ship them together by sea or air so you get
            great quality at honest prices.
          </p>
        </div>

        <div className="footer-col">
          <h3>Ordering</h3>
          <ul>
            <li>Pre-order · {STORE.deliveryEstimate}</li>
            <li>Cash on delivery</li>
            <li>Free delivery to your door over {moneyWhole(STORE.freeShippingThreshold)}</li>
            <li>Delivering to all Iraq &amp; Kurdistan</li>
          </ul>
        </div>

        <div className="footer-col">
          <h3>Say hello</h3>
          <ul>
            {ig && (
              <li>
                <a href={ig} target="_blank" rel="noopener noreferrer">
                  <IconInstagram size={16} /> @{STORE.instagram}
                </a>
              </li>
            )}
            {wa && (
              <li>
                <a href={wa} target="_blank" rel="noopener noreferrer">
                  <IconWhatsApp size={16} /> {STORE.whatsappDisplay}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <p className="footer-legal">© {new Date().getFullYear()} Frost. All rights reserved.</p>
    </footer>
  );
}
