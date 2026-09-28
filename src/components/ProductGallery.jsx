import { useCallback, useEffect, useRef, useState } from "react";
import GarmentArt from "./GarmentArt.jsx";
import { prefersReducedMotion } from "../utils/helpers.js";
import "./ProductGallery.css";

const AUTO_MS = 5000;

const Chevron = ({ dir }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
  </svg>
);

// Photo slider for the product view.
//  • 1–5 photos: arrows, dots, thumbnails, swipe on phones, arrow keys
//  • moves to the next photo every 5 seconds; pauses while the pointer is
//    over it, and the 5-second count restarts after any manual change
//  • no photos: shows the garment illustration in the selected colour
export default function ProductGallery({ product, color, badges }) {
  const images = product.images;
  const count = images.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0); // bump to restart the auto timer
  const [failed, setFailed] = useState({});
  const drag = useRef(null);

  const go = useCallback(
    (i) => {
      if (count < 2) return;
      setIndex((i + count) % count);
      setTick((t) => t + 1);
    },
    [count]
  );

  // Auto-advance every 5 s (not for people who prefer reduced motion,
  // and not while the tab is hidden).
  useEffect(() => {
    if (count < 2 || paused || prefersReducedMotion()) return;
    const t = setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % count);
    }, AUTO_MS);
    return () => clearInterval(t);
  }, [count, paused, tick]);

  // Swipe (touch or mouse drag).
  function onPointerDown(e) {
    if (count < 2) return;
    drag.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp(e) {
    const start = drag.current;
    drag.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(index + (dx < 0 ? 1 : -1));
  }

  function onKeyDown(e) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(index - 1);
    }
  }

  if (count === 0) {
    return (
      <div className="gal gal-art" style={{ "--tint": color?.hex || "#a9774f" }}>
        <div className="gal-art-inner" key={color?.name}>
          <GarmentArt type={product.art} color={color?.hex || product.colors[0]?.hex || "#a9774f"} label={product.name} />
        </div>
        {badges}
      </div>
    );
  }

  return (
    <div className="gal-wrap">
      <div
        className="gal"
        role="region"
        aria-roledescription="carousel"
        aria-label={`${product.name} photos`}
        tabIndex={count > 1 ? 0 : -1}
        onKeyDown={onKeyDown}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current = null)}
      >
        <div className="gal-track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {images.map((src, i) => (
            <div className="gal-slide" key={src} aria-hidden={i !== index} aria-roledescription="slide" aria-label={`${i + 1} of ${count}`}>
              {failed[src] ? (
                <GarmentArt type={product.art} color={color?.hex || product.colors[0]?.hex || "#a9774f"} label={product.name} />
              ) : (
                <img
                  src={src}
                  alt={`${product.name} — photo ${i + 1}`}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  draggable="false"
                  referrerPolicy="no-referrer"
                  onError={() => setFailed((f) => ({ ...f, [src]: true }))}
                />
              )}
            </div>
          ))}
        </div>

        {badges}

        {count > 1 && (
          <>
            <button type="button" className="gal-arrow gal-prev" onClick={() => go(index - 1)} aria-label="Previous photo">
              <Chevron dir="left" />
            </button>
            <button type="button" className="gal-arrow gal-next" onClick={() => go(index + 1)} aria-label="Next photo">
              <Chevron dir="right" />
            </button>
            <div className="gal-dots" role="group" aria-label="Choose photo">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  className={"gal-dot" + (i === index ? " is-active" : "")}
                  onClick={() => go(i)}
                  aria-label={`Photo ${i + 1}`}
                  aria-current={i === index}
                >
                  {i === index && !paused && <span className="gal-dot-fill" key={`${index}-${tick}`} />}
                </button>
              ))}
            </div>
            <span className="gal-count" aria-live="polite">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="gal-thumbs" role="group" aria-label="Photos">
          {images.map((src, i) => (
            <button key={src} type="button" className={"gal-thumb" + (i === index ? " is-active" : "")} onClick={() => go(i)} aria-label={`Show photo ${i + 1}`}>
              <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" draggable="false" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
