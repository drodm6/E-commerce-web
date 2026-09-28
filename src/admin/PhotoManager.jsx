import { useRef, useState } from "react";
import { api } from "../api.js";
import { LIMITS, safeImageUrl } from "../utils/validate.js";

const MAX_SIDE = 1600; // px — plenty for a phone or laptop screen
const QUALITY = 0.85;

// Shrinks a photo in the browser before uploading: faster uploads, smaller
// files, and it strips hidden data such as the phone's GPS location.
async function shrink(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`Couldn't read “${file.name}”. Try a JPG or PNG photo.`);
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const toBlob = (type) => new Promise((res) => canvas.toBlob(res, type, QUALITY));
  let blob = await toBlob("image/webp");
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg"); // older Safari
  if (!blob) throw new Error(`Couldn't process “${file.name}”.`);
  return blob;
}

// Up to 5 photos per product. The first one is the main photo shown on the
// product card. Upload from the device, or paste a link.
export default function PhotoManager({ images, onChange, error }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState("");
  const [problem, setProblem] = useState("");
  const [link, setLink] = useState("");
  const left = LIMITS.maxImages - images.length;

  async function upload(e) {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;
    setProblem("");
    const chosen = files.slice(0, left);
    if (files.length > left) setProblem(`Only ${LIMITS.maxImages} photos per product — added the first ${left}.`);
    const added = [];
    try {
      for (let i = 0; i < chosen.length; i++) {
        setBusy(`Uploading ${i + 1} of ${chosen.length}…`);
        added.push(await api.admin.uploadPhoto(await shrink(chosen[i])));
      }
    } catch (err) {
      setProblem(err.message);
    } finally {
      if (added.length) onChange([...images, ...added]);
      setBusy("");
    }
  }

  function addLink() {
    const url = safeImageUrl(link);
    if (!url) {
      setProblem("That link isn't allowed — it must start with https://");
      return;
    }
    if (images.includes(url)) return setLink("");
    onChange([...images, url]);
    setLink("");
    setProblem("");
  }

  function move(i, dir) {
    const next = [...images];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  }

  return (
    <div className={"adm-field adm-photos" + (error ? " has-error" : "")}>
      <span>
        Photos <small>({images.length}/{LIMITS.maxImages}) · the first photo is the main one</small>
      </span>

      {images.length > 0 && (
        <ul className="adm-photo-list">
          {images.map((src, i) => (
            <li key={src} className="adm-photo">
              <img src={src} alt={`Photo ${i + 1}`} referrerPolicy="no-referrer" />
              {i === 0 && <em className="adm-photo-main">Main</em>}
              <div className="adm-photo-actions">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move photo ${i + 1} left`}>
                  ←
                </button>
                <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))} aria-label={`Remove photo ${i + 1}`}>
                  ×
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label={`Move photo ${i + 1} right`}>
                  →
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {left > 0 && (
        <div className="adm-photo-add">
          <button type="button" className="adm-btn adm-btn-primary" onClick={() => fileRef.current?.click()} disabled={!!busy}>
            {busy || "Upload photos"}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" multiple hidden onChange={upload} />
          <div className="adm-photo-link">
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLink())}
              placeholder="…or paste a photo link (https://)"
              maxLength={500}
              spellCheck={false}
              aria-label="Photo link"
            />
            <button type="button" className="adm-btn adm-btn-ghost" onClick={addLink} disabled={!link.trim()}>
              Add
            </button>
          </div>
        </div>
      )}

      {(problem || error) && <em className="adm-field-error">{problem || error}</em>}
    </div>
  );
}
