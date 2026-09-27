import GarmentArt from "./GarmentArt.jsx";
import { IconArrowRight, IconInstagram, IconTruck, IconPin, IconCash } from "./Icons.jsx";
import { STORE } from "../config.js";
import { instagramLink, moneyWhole } from "../utils/helpers.js";

const FALLBACK_LAYERS = [
  { id: "a", art: "coat", hex: "#b5835a", category: "Coats", name: "Wool-blend coats" },
  { id: "b", art: "puffer", hex: "#efe4d2", category: "Jackets", name: "Cloud puffers" },
  { id: "c", art: "sweater", hex: "#3b2a20", category: "Knitwear", name: "Chunky knits" },
];

export default function Hero({ products }) {
  const ig = instagramLink();
  const featured = products.filter((p) => p.featured).slice(0, 3);
  const layers =
    featured.length === 3
      ? featured.map((p) => ({ id: p.id, art: p.art, hex: p.colors[0]?.hex || "#a9774f", category: p.category, name: p.name }))
      : FALLBACK_LAYERS;

  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero-inner">
        <div className="hero-copy">
          <p className="eyebrow">Winter collection · Pre-order now</p>
          <h1 id="hero-title">
            Dressed for the cold,
            <br />
            <em>made to layer.</em>
          </h1>
          <p className="hero-lede">
            Warm coats, soft knits and everyday winter essentials — hand-picked, shipped together to keep prices low, and paid for in
            cash when they reach your door.
          </p>
          <div className="hero-ctas">
            <a className="btn btn-dark" href="#shop">
              Shop the collection <IconArrowRight size={18} />
            </a>
            {ig && (
              <a className="btn btn-outline" href={ig} target="_blank" rel="noopener noreferrer">
                <IconInstagram size={18} /> @{STORE.instagram}
              </a>
            )}
          </div>
        </div>

        <div className="hero-stack" aria-hidden="true">
          {layers.map((p, i) => (
            <div key={p.id} className={`layer layer-${i}`}>
              <div className="layer-art">
                <GarmentArt type={p.art} color={p.hex} />
              </div>
              <div className="layer-cap">
                <span>{p.category}</span>
                <b>{p.name}</b>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ul className="perks" aria-label="Delivery and payment">
        <li>
          <IconTruck size={22} />
          <span>
            <b>Free delivery over {moneyWhole(STORE.freeShippingThreshold)}</b>
            <small>Straight to your address</small>
          </span>
        </li>
        <li>
          <IconPin size={22} />
          <span>
            <b>All Iraq &amp; Kurdistan</b>
            <small>We deliver to every governorate</small>
          </span>
        </li>
        <li>
          <IconCash size={22} />
          <span>
            <b>Cash on delivery</b>
            <small>Pay when it arrives · {STORE.deliveryEstimate}</small>
          </span>
        </li>
      </ul>
    </section>
  );
}
