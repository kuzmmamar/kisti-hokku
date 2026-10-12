export const WATCHES_KEY = "o3ero:watches";

export type WatchTarget = {
  id: string;
  creationQuery: string;
  creationId?: number;
  sessionId?: number;
  /** Prefers sessions on this calendar day YYYY-MM-DD (local Moscow date ok as string match on time). */
  date?: string;
  quantity: number;
  maxPrice?: number;
  paymentType: "QrPay" | "SberPay" | "Card";
  autoBuy: boolean;
  createdAt: string;
  lastCheckedAt?: string;
  lastStatus?: string;
  fulfilledOrderId?: string;
};

export function newWatchId(): string {
  return `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
