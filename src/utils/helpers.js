// Generates a short unique id, e.g. uid("ORD") -> "ORD-L4X9K2Q17"
// Used both for new product ids and for unique order numbers.
export function uid(prefix) {
  return (
    prefix +
    "-" +
    Date.now().toString(36).toUpperCase() +
    Math.floor(Math.random() * 900 + 100)
  );
}

export function money(n) {
  return "$" + Number(n || 0).toFixed(2);
}

export const SHIPPING_FLAT = 4.99;
export const FREE_SHIP_THRESHOLD = 50;
export const WHATSAPP_NUMBER = "0000000000";
export const ADMIN_PASSWORD = "admin123"; // change this before real use
