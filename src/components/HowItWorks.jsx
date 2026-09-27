import { IconHanger, IconReceipt, IconWhatsApp, IconShip } from "./Icons.jsx";
import { STORE } from "../config.js";

const STEPS = [
  {
    icon: IconHanger,
    title: "Pick your pieces",
    text: "Tap any item to see sizes, colours and every detail, then add it to your bag.",
  },
  {
    icon: IconReceipt,
    title: "Place your order",
    text: "Add your delivery details and you'll get a receipt with your own order number.",
  },
  {
    icon: IconWhatsApp,
    title: "Send it on WhatsApp",
    text: "Screenshot the receipt and message it to us. We reply to confirm your order.",
  },
  {
    icon: IconShip,
    title: "Shipped together, pay at the door",
    text: `Orders travel together by sea to keep prices low, then we deliver to your door anywhere in Iraq & Kurdistan in about ${STORE.deliveryEstimate}. Free delivery over $${STORE.freeShippingThreshold}.`,
  },
];

export default function HowItWorks() {
  return (
    <section className="how" id="how" aria-labelledby="how-title">
      <div className="section-head">
        <p className="eyebrow">Simple &amp; honest</p>
        <h2 id="how-title">How ordering works</h2>
      </div>
      <ol className="how-steps">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="how-step">
            <span className="how-num">{String(i + 1).padStart(2, "0")}</span>
            <span className="how-icon">
              <Icon size={22} />
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
