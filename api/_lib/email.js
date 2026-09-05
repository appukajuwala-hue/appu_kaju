/**
 * Order emails via Resend.
 *
 * Called only from api/verify.js, only after a payment has been verified — a
 * public send endpoint would be a spam relay.
 *
 * Every function here is best-effort. The customer has already been charged by
 * the time we get called, so a mail failure must never turn into a payment
 * failure; callers log and carry on.
 */

import { products } from "../../src/constants/index.js";

const RESEND_API = "https://api.resend.com/emails";

const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

const rupees = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

/**
 * Turns the `items` note back into priced lines.
 *
 * buildNotes writes `"<id>x<qty>, …"`. No product id contains the letter "x",
 * so splitting on the last one is unambiguous. Anything that fails to parse is
 * dropped rather than guessed at — the total always comes from Razorpay, never
 * from this, so a bad parse costs a tidy line item and nothing else.
 */
export const parseItemsNote = (note) => {
  if (typeof note !== "string" || !note) return [];
  return note
    .split(",")
    .map((chunk) => {
      const part = chunk.trim();
      const at = part.lastIndexOf("x");
      if (at < 1) return null;
      const id = part.slice(0, at);
      const qty = Number(part.slice(at + 1));
      const product = products.find((p) => p.id === id);
      if (!product || !Number.isFinite(qty) || qty < 1) return null;
      return { ...product, qty, lineTotal: product.price * qty };
    })
    .filter(Boolean);
};

const lineRows = (lines) =>
  lines
    .map(
      (l) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e7ded0">
            <strong>${escapeHtml(l.brand)}</strong><br>
            <span style="color:#6b6155;font-size:13px">${escapeHtml(l.size)} × ${l.qty}</span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #e7ded0;text-align:right;white-space:nowrap">
            ${rupees(l.lineTotal)}
          </td>
        </tr>`
    )
    .join("");

const shell = (title, bodyHtml) => `
  <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#f6efe2;padding:28px">
    <div style="max-width:560px;margin:0 auto;background:#fffdf8;border-radius:16px;padding:28px;color:#2a211b">
      <h1 style="margin:0 0 18px;font-size:22px;letter-spacing:-.3px">${escapeHtml(title)}</h1>
      ${bodyHtml}
      <p style="margin:26px 0 0;color:#6b6155;font-size:12px">
        Appu Kaju · Finest cashews since 1998
      </p>
    </div>
  </div>`;

const summaryTable = (lines, total) => `
  <table style="width:100%;border-collapse:collapse;margin:18px 0">
    ${lineRows(lines)}
    <tr>
      <td style="padding:12px 0"><strong>Total paid</strong></td>
      <td style="padding:12px 0;text-align:right"><strong>${rupees(total)}</strong></td>
    </tr>
  </table>`;

const addressBlock = (c) => `
  <p style="margin:0;line-height:1.6;color:#4a4038">
    ${escapeHtml(c.name)}<br>
    ${escapeHtml(c.address)}<br>
    ${escapeHtml(c.city)}, ${escapeHtml(c.state)} ${escapeHtml(c.pin)}<br>
    ${escapeHtml(c.phone)} · ${escapeHtml(c.email)}
  </p>`;

const send = async ({ to, subject, html, replyTo }) => {
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.ORDER_EMAIL_FROM,
      to: [to],
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
};

/**
 * Sends the customer's confirmation and the shop's copy.
 *
 * Resolves to a report rather than throwing: the caller has already taken the
 * customer's money and must return success regardless.
 */
export const sendOrderEmails = async ({ receipt, paymentId, customer, lines, total, testMode }) => {
  if (!process.env.RESEND_API_KEY || !process.env.ORDER_EMAIL_FROM) {
    // Expected until Resend is configured — the Razorpay dashboard still has
    // the full order, so nothing is lost meanwhile.
    return { sent: false, reason: "email not configured" };
  }

  const flag = testMode
    ? `<p style="margin:0 0 16px;padding:10px 14px;border-radius:10px;background:#f6e2b8;color:#5b4708;font-size:13px">
         Test mode — no real money moved.
       </p>`
    : "";

  const results = await Promise.allSettled([
    send({
      to: customer.email,
      replyTo: process.env.ORDER_EMAIL_TO,
      subject: `Your Appu Kaju order ${receipt}`,
      html: shell(
        `Thank you, ${customer.name.split(" ")[0]}`,
        `${flag}
         <p style="margin:0;line-height:1.6">
           Your order <strong>${escapeHtml(receipt)}</strong> is confirmed. We'll call
           before the courier collects. Delivery is free anywhere in India.
         </p>
         ${summaryTable(lines, total)}
         <h2 style="font-size:15px;margin:22px 0 8px">Delivering to</h2>
         ${addressBlock(customer)}
         <p style="margin:18px 0 0;color:#6b6155;font-size:13px">
           Payment reference ${escapeHtml(paymentId)}
         </p>`
      ),
    }),
    process.env.ORDER_EMAIL_TO
      ? send({
          to: process.env.ORDER_EMAIL_TO,
          replyTo: customer.email,
          subject: `New order ${receipt} — ${rupees(total)}`,
          html: shell(
            `New order ${receipt}`,
            `${flag}
             ${summaryTable(lines, total)}
             <h2 style="font-size:15px;margin:22px 0 8px">Ship to</h2>
             ${addressBlock(customer)}
             <p style="margin:18px 0 0;color:#6b6155;font-size:13px">
               Razorpay payment ${escapeHtml(paymentId)}
             </p>`
          ),
        })
      : Promise.resolve(),
  ]);

  const failed = results.filter((r) => r.status === "rejected");
  failed.forEach((r) => console.error("Order email failed:", r.reason?.message || r.reason));
  return { sent: failed.length === 0, failures: failed.length };
};
