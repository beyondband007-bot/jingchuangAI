import { createHttpError } from "../../shared/http.js";

const RECHARGE_TIERS = new Map([
  [50, 5000],
  [200, 21000],
  [1000, 110000],
  [5000, 550000],
]);

export function getRechargeTier(value) {
  const amount = Number(value);
  const points = RECHARGE_TIERS.get(amount);
  if (!Number.isInteger(amount) || points === undefined) {
    throw createHttpError("请选择 50、200、1000 或 5000 元充值档位", 400);
  }
  return { amount, points };
}
