// CSV export with protection against CSV / formula injection
// (OWASP "CSV Injection"): cells that start with = + - @ tab or CR are
// prefixed with a single quote so spreadsheet apps treat them as text.
function csvCell(value) {
  let s = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCSV(rows) {
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

export function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

// wa.me link to a customer, only if their number looks like a real
// international number (digits only after cleaning).
export function customerWhatsApp(phone, text = "") {
  const digits = String(phone || "").replace(/\D/g, "").replace(/^00/, "");
  if (!/^[1-9]\d{7,14}$/.test(digits)) return "";
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
