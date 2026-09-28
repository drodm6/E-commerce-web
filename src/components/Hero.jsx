import { IconArrowRight, IconInstagram } from "./Icons.jsx";
import { STORE } from "../config.js";
import { instagramLink } from "../utils/helpers.js";

// First screen: one clear message and two choices — see the products, or
// visit Instagram. Delivery details live in the bar above the header.
export default function Hero() {
  const ig = instagramLink();

  function seeProducts(e) {
    e.preventDefault();
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <p className="eyebrow">Winter collection</p>
      <h1 id="hero-title">
        Dressed for the cold,
        <br />
        <em>made to layer.</em>
      </h1>
      <p className="hero-lede">Warm coats, knits and winter essentials — delivered to your door.</p>
      <div className="hero-ctas">
        <a className="btn btn-dark" href="#shop" onClick={seeProducts}>
          See products <IconArrowRight size={18} />
        </a>
        {ig && (
          <a className="btn btn-outline" href={ig} target="_blank" rel="noopener noreferrer">
            <IconInstagram size={18} /> Instagram
          </a>
        )}
      </div>
    </section>
  );
}
