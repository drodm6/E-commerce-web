import GarmentArt from "./GarmentArt.jsx";
import { IconArrowRight, IconInstagram } from "./Icons.jsx";
import { STORE } from "../config.js";
import { instagramLink } from "../utils/helpers.js";

const FLAKES = Array.from({ length: 18 }, (_, i) => i);

export default function Hero({ products }) {
  const ig = instagramLink();
  // Three layered cards built from the first featured pieces.
  const featured = products.filter((p) => p.featured).slice(0, 3);
  const layers = featured.length === 3 ? featured : products.slice(0, 3);

  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero-snow" aria-hidden="true">
        {FLAKES.map((i) => (
          <span key={i} className={`flake f${i}`} />
        ))}
      </div>

      <div className="hero-inner">
        <div className="hero-copy">
          <p className="eyebrow eyebrow-light">Winter collection · Pre-order now</p>
          <h1 id="hero-title">
            Dressed for the cold,
            <br />
            <em>made to layer.</em>
          </h1>
          <p className="hero-lede">
            Warm coats, soft knits and everyday winter essentials — hand-picked, shipped together to keep prices low, and
            paid for in cash when they reach your door.
          </p>
          <div className="hero-ctas">
            <a className="btn btn-cream" href="#shop">
              Shop the collection <IconArrowRight size={18} />
            </a>
            {ig && (
              <a className="btn btn-ghost-light" href={ig} target="_blank" rel="noopener noreferrer">
                <IconInstagram size={18} /> @{STORE.instagram}
              </a>
            )}
          </div>
          <dl className="hero-facts">
            <div>
              <dt>Delivery</dt>
              <dd>{STORE.deliveryEstimate}</dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>Cash on delivery</dd>
            </div>
            <div>
              <dt>Orders</dt>
              <dd>Confirmed on WhatsApp</dd>
            </div>
          </dl>
        </div>

        <div className="hero-stack" aria-hidden="true">
          {layers.map((p, i) => (
            <div key={p.id} className={`layer layer-${i}`}>
              <div className="layer-art">
                <GarmentArt type={p.art} color={p.colors[0]?.hex || "#a9774f"} />
              </div>
              <div className="layer-cap">
                <span>{p.category}</span>
                <b>{p.name}</b>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
