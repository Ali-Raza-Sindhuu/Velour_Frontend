// The cash ledger: one row per rupee movement, written inside the same
// transaction as the event that caused it. Each source event (a payment, a
// refund, a remittance, a purchase) can post each entry type only once, so a
// retried request never double-counts money.

export const ACCOUNTS = ["jazzcash", "easypaisa", "bank", "cash"];

export async function recordCash(connection, { type, direction, amount, account, refType, refId, orderId = null, note = null, createdBy = null, occurredAt = null }) {
  const value = Math.round(Number(amount) * 100) / 100;
  if (!(value > 0)) return;
  if (!ACCOUNTS.includes(account)) throw new Error(`Unknown cash account: ${account}`);
  await connection.query(
    `INSERT INTO cash_entries (occurred_at, type, direction, amount, account, ref_type, ref_id, order_id, note, created_by)
     VALUES (COALESCE(?, NOW()), ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = id`,
    [occurredAt, type, direction, value, account, refType, refId, orderId, note ? String(note).slice(0, 255) : null, createdBy]
  );
}

// Where a refund to the customer is paid from, from their payout details or
// how they paid.
export function refundAccount({ method, payout, paymentMethod, account }) {
  if (ACCOUNTS.includes(account)) return account;
  if (method === "jazzcash_api") return "jazzcash";
  if (payout?.type && ACCOUNTS.includes(payout.type)) return payout.type;
  return paymentMethod === "jazzcash" ? "jazzcash" : "bank";
}
