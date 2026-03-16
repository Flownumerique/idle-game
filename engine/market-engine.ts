import itemsData from "@/items.json";
import {
  MARKET_PRICE_FLOOR,
  MARKET_PRICE_DECAY,
  MARKET_SALES_WINDOW_MS,
} from "./constants";

// ──────────────────────────────────────────────
// Item price data
// ──────────────────────────────────────────────

interface ItemPriceData {
  id: string;
  buyPrice?: number;
  sellPrice?: number;
}

const itemPrices = new Map<string, ItemPriceData>();
for (const item of (itemsData as { items: ItemPriceData[] }).items) {
  itemPrices.set(item.id, item);
}

export function getBasePrice(itemId: string): { buy: number; sell: number } {
  const item = itemPrices.get(itemId);
  return {
    buy: item?.buyPrice ?? 0,
    sell: item?.sellPrice ?? 0,
  };
}

// ──────────────────────────────────────────────
// Dynamic sell price
// ──────────────────────────────────────────────

export interface SalesRecord {
  count: number;
  windowStart: number;
}

export function getDynamicSellPrice(
  itemId: string,
  salesRecord: SalesRecord | undefined,
  now = Date.now()
): number {
  const base = getBasePrice(itemId).sell;
  if (base <= 0) return 0;

  if (!salesRecord) return base;

  // Reset window if expired
  const effectiveCount =
    now - salesRecord.windowStart < MARKET_SALES_WINDOW_MS
      ? salesRecord.count
      : 0;

  const multiplier = Math.max(
    MARKET_PRICE_FLOOR,
    1 - (effectiveCount / 100) * MARKET_PRICE_DECAY
  );
  return Math.floor(base * multiplier);
}

/** Record a sale, returning the updated SalesRecord */
export function recordSale(
  existing: SalesRecord | undefined,
  quantity: number,
  now = Date.now()
): SalesRecord {
  if (!existing || now - existing.windowStart >= MARKET_SALES_WINDOW_MS) {
    return { count: quantity, windowStart: now };
  }
  return { count: existing.count + quantity, windowStart: existing.windowStart };
}
