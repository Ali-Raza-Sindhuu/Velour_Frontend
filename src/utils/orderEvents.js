// One row per step in an order's life — the timeline staff and customers see.
export async function addOrderEvent(connection, orderId, { actor = "system", type, message = null, visible = true }) {
  await connection.query(
    "INSERT INTO order_events (order_id, actor, type, message, visible_to_customer) VALUES (?, ?, ?, ?, ?)",
    [orderId, actor, type, message, visible]
  );
}
