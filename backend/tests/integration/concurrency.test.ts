import { describe, expect, it } from "vitest";
import { AUTH, api, createProductAs } from "../helpers/request.js";
import { useTestDb } from "../helpers/db.js";

useTestDb();

/**
 * These are the tests that give the most confidence the feature won't oversell.
 * They fire many requests concurrently at the same variant and assert the
 * invariant that matters: stock never goes negative and successes never exceed
 * the stock that actually existed.
 */
describe("concurrent purchases (no oversell)", () => {
  it("lets at most `stock` single-unit purchases of the last units succeed", async () => {
    const created = await createProductAs(AUTH.amara, {
      variants: [{ sku: "LAST-5", attributes: { Color: "Red", Size: "S" }, price: 100, stock: 5 }],
    });
    const id = created.body.id;
    const variantId = created.body.variants[0].id;

    // 20 buyers race for 5 units, 1 each.
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        api().post(`/api/products/${id}/variants/${variantId}/purchase`).send({ qty: 1 }),
      ),
    );

    const ok = results.filter((r) => r.status === 200);
    const soldOut = results.filter((r) => r.status === 409);
    expect(ok).toHaveLength(5);
    expect(soldOut).toHaveLength(15);

    const after = await api().get(`/api/products/${id}`);
    expect(after.body.variants[0].stock).toBe(0);
    expect(after.body.variants[0].stock).toBeGreaterThanOrEqual(0);
  });

  it("never drives stock negative under mixed quantities", async () => {
    const created = await createProductAs(AUTH.amara, {
      variants: [{ sku: "MIX-10", attributes: { Color: "Red", Size: "S" }, price: 100, stock: 10 }],
    });
    const id = created.body.id;
    const variantId = created.body.variants[0].id;

    const qtys = [3, 4, 5, 2, 6, 1, 3, 4]; // sums to 28, only 10 available
    // Promise.all preserves order, so results[i] corresponds to qtys[i].
    const results = await Promise.all(
      qtys.map((qty) => api().post(`/api/products/${id}/variants/${variantId}/purchase`).send({ qty })),
    );

    const after = await api().get(`/api/products/${id}`);
    const remaining = after.body.variants[0].stock;
    expect(remaining).toBeGreaterThanOrEqual(0);
    // The remaining stock must exactly equal 10 minus the units actually sold.
    expect(remaining).toBe(10 - sold(results, qtys));
  });

  it("applies concurrent seller stock deltas without losing an update", async () => {
    const created = await createProductAs(AUTH.amara, {
      variants: [{ sku: "ADD-0", attributes: { Color: "Red", Size: "S" }, price: 100, stock: 0 }],
    });
    const id = created.body.id;
    const variantId = created.body.variants[0].id;

    // 50 concurrent +1 restocks must all land (atomic $inc, no read-modify-write).
    await Promise.all(
      Array.from({ length: 50 }, () =>
        api()
          .patch(`/api/seller/products/${id}/variants/${variantId}/stock`)
          .set("Authorization", AUTH.amara)
          .send({ delta: 1 }),
      ),
    );

    const after = await api().get(`/api/seller/products/${id}`).set("Authorization", AUTH.amara);
    expect(after.body.variants[0].stock).toBe(50);
  });
});

/** Total units actually sold across the successful purchases. */
function sold(results: Array<{ status: number }>, qtys: number[]): number {
  return results.reduce((sum, r, i) => (r.status === 200 ? sum + qtys[i]! : sum), 0);
}
