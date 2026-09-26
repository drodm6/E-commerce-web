import raw from "./products.json";
import { sanitizeProducts } from "../utils/validate.js";

// The published catalog shipped with the site. To publish changes made in
// the admin panel: Admin → Products → "Download products.json", replace
// src/data/products.json with it, and redeploy.
export const PUBLISHED_CATALOG = sanitizeProducts(raw);
