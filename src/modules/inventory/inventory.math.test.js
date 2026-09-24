import { test } from "node:test";
import assert from "node:assert/strict";
import { bucketChanges, cogsEffect, nextAvgCost } from "./inventory.math.js";

test("average cost blends new stock with what's on hand", () => {
  assert.equal(nextAvgCost(10, 1000, 10, 1200), 1100);
  assert.equal(nextAvgCost(3, 500, 1, 900), 600);
});

test("average cost with nothing on hand is the new cost", () => {
  assert.equal(nextAvgCost(0, 0, 5, 750), 750);
  assert.equal(nextAvgCost(-2, 400, 5, 750), 750);
});

test("receiving nothing leaves the cost alone", () => {
  assert.equal(nextAvgCost(4, 333.33, 0, 999), 333.33);
});

test("average cost is rounded to paisa", () => {
  assert.equal(nextAvgCost(1, 100, 2, 100.01), 100.01);
  assert.equal(nextAvgCost(2, 10, 1, 11), 10.33);
});

test("an order's life keeps on-hand stock consistent", () => {
  // available 10, reserved 0
  let available = 10;
  let reserved = 0;
  const apply = (type, qty) => {
    const change = bucketChanges(type, qty);
    available += change.available;
    reserved += change.reserved;
  };
  apply("reserve", 2); // order placed
  assert.deepEqual([available, reserved, available + reserved], [8, 2, 10]);
  apply("ship", 2); // shipped
  assert.deepEqual([available, reserved, available + reserved], [8, 0, 8]);
  apply("unship", 2); // courier brought it back
  assert.deepEqual([available, reserved, available + reserved], [8, 2, 10]);
  apply("release", 2); // cancelled
  assert.deepEqual([available, reserved, available + reserved], [10, 0, 10]);
});

test("returns and adjustments", () => {
  assert.deepEqual(bucketChanges("return_restock", 1), { available: 1, reserved: 0 });
  assert.deepEqual(bucketChanges("return_scrap", 1), { available: 0, reserved: 0 });
  assert.deepEqual(bucketChanges("adjustment", -3), { available: -3, reserved: 0 });
  assert.throws(() => bucketChanges("teleport", 1));
});

test("cost of goods is recognised on ship and reversed on unship / restock", () => {
  assert.equal(cogsEffect("ship", 2, 1000), 2000);
  assert.equal(cogsEffect("unship", 2, 1000), -2000);
  assert.equal(cogsEffect("return_restock", 1, 1000), -1000);
  assert.equal(cogsEffect("return_scrap", 1, 1000), 0);
  assert.equal(cogsEffect("purchase", 5, 1000), 0);
});
