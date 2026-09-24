// Pure stock arithmetic — no database — so it can be unit tested.

export const round2 = (value) => Math.round(Number(value) * 100) / 100;

// Weighted-average cost after `qty` units arrive at `cost` each. Stock
// already on hand keeps its value; the new units are blended in.
export function nextAvgCost(onHand, avgCost, qty, cost) {
  const existing = Math.max(0, Number(onHand) || 0);
  const incoming = Number(qty) || 0;
  if (incoming <= 0) return round2(avgCost || 0);
  if (existing === 0) return round2(cost);
  return round2((existing * Number(avgCost || 0) + incoming * Number(cost)) / (existing + incoming));
}

// How each movement type moves the two stock buckets for `qty` units.
// On hand = available + reserved.
export function bucketChanges(type, qty) {
  const q = Number(qty) || 0;
  switch (type) {
    case "opening":
    case "purchase":
    case "return_restock":
      return { available: q, reserved: 0 };
    case "adjustment":
      return { available: q, reserved: 0 }; // q is signed
    case "reserve":
      return { available: -q, reserved: q };
    case "release":
      return { available: q, reserved: -q };
    case "ship":
      return { available: 0, reserved: -q };
    case "unship":
      return { available: 0, reserved: q };
    case "return_scrap":
    case "cost_update":
      return { available: 0, reserved: 0 };
    default:
      throw new Error(`Unknown movement type: ${type}`);
  }
}

// Cost-of-goods effect of a movement (positive = cost recognised).
export function cogsEffect(type, qty, unitCost) {
  const value = (Number(qty) || 0) * (Number(unitCost) || 0);
  if (type === "ship") return round2(value);
  if (type === "unship" || type === "return_restock") return round2(-value);
  return 0;
}
