export const PROFILE_KEY = "o3ero:buyer_profile";

export type BuyerProfile = {
  phone: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Отчество — если есть */
  patronymicName?: string;
  /** Серия паспорта РФ, 4 цифры */
  passportSeries: string;
  /** Номер паспорта РФ, 6 цифр */
  passportNumber: string;
  /** YYYY-MM-DD — иногда требует personalization */
  birthday?: string;
  preferredPaymentType?: "QrPay" | "SberPay" | "Card";
  updatedAt: string;
};

export type TicketPerson = {
  firstName: string;
  lastName: string;
  patronymicName: string;
  birthday: string | null;
  documentType: "Passport";
  documentSeries: string;
  documentNumber: string;
  name: string;
};

/** Parse "4510 123456" / "4510123456" / series+number into RF passport parts. */
export function parsePassport(
  raw: string,
  series?: string,
  number?: string,
): { series: string; number: string } | { error: string } {
  if (series && number) {
    const s = series.replace(/\D/g, "");
    const n = number.replace(/\D/g, "");
    if (s.length === 4 && n.length === 6) return { series: s, number: n };
    return { error: "Серия — 4 цифры, номер — 6 цифр" };
  }
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return { series: digits.slice(0, 4), number: digits.slice(4) };
  }
  return { error: "Паспорт РФ: 10 цифр (серия+номер), например 4510 123456" };
}

export function fullName(profile: Pick<BuyerProfile, "firstName" | "lastName" | "patronymicName">): string {
  return [profile.lastName, profile.firstName, profile.patronymicName]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toTicketPerson(profile: BuyerProfile): TicketPerson {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    patronymicName: profile.patronymicName ?? "",
    birthday: profile.birthday ?? null,
    documentType: "Passport",
    documentSeries: profile.passportSeries,
    documentNumber: profile.passportNumber,
    name: fullName(profile),
  };
}

export function maskPassport(series: string, number: string): string {
  return `${series} **${number.slice(-2)}`;
}

export function publicProfile(profile: BuyerProfile): Record<string, string | undefined> {
  return {
    phone: profile.phone,
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    patronymicName: profile.patronymicName,
    passport: maskPassport(profile.passportSeries, profile.passportNumber),
    birthday: profile.birthday,
    preferredPaymentType: profile.preferredPaymentType,
    updatedAt: profile.updatedAt,
  };
}

export function profileReadyForPurchase(profile: BuyerProfile | undefined): string | null {
  if (!profile) return "Нет профиля покупателя — вызови save_buyer_profile.";
  if (!profile.phone || !profile.email) return "В профиле нужны phone и email.";
  if (!profile.firstName || !profile.lastName) return "В профиле нужны имя и фамилия.";
  if (!profile.passportSeries || !profile.passportNumber) {
    return "В профиле нужен паспорт (серия и номер).";
  }
  return null;
}
