export const PROFILE_KEY = "o3ero:buyer_profile";

export type BuyerProfile = {
  phone: string;
  email: string;
  preferredPaymentType?: "QrPay" | "SberPay" | "Card";
  updatedAt: string;
};
