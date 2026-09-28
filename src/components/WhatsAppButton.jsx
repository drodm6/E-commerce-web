import { IconWhatsApp } from "./Icons.jsx";
import { STORE } from "../config.js";
import { isValidWhatsAppNumber, whatsappLink } from "../utils/helpers.js";

// Floating "message us" button — opens a WhatsApp chat with the shop
// (straight into the app on phones).
export default function WhatsAppButton() {
  if (!isValidWhatsAppNumber(STORE.whatsappNumber)) return null;
  return (
    <a className="wa-fab" href={whatsappLink()} target="_blank" rel="noopener noreferrer" aria-label={`Message us on WhatsApp: ${STORE.whatsappDisplay}`}>
      <IconWhatsApp size={26} />
      <span className="wa-fab-label">Message us</span>
    </a>
  );
}
