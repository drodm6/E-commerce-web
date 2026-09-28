import { STORE } from "../config.js";
import { moneyWhole } from "../utils/helpers.js";

// Slim announcement bar above the header.
export default function DeliveryBar() {
  return (
    <div className="delivery-bar" role="note">
      <p>
        <b>Free delivery to your door on orders over {moneyWhole(STORE.freeShippingThreshold)}</b>
        <span className="dot" aria-hidden="true">·</span>
        We deliver to {STORE.deliveryArea}
        <span className="dot hide-xs" aria-hidden="true">·</span>
        <span className="hide-xs">Cash on delivery</span>
      </p>
    </div>
  );
}
