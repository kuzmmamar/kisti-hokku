import { prompt } from "@cursor/bdk";
import type { JsonValue } from "@cursor/bdk";
import { defineTool } from "@cursor/bdk/tools";
import { z } from "zod";
import {
  PROFILE_KEY,
  parsePassport,
  publicProfile,
  type BuyerProfile,
} from "../lib/buyer.js";

export default defineTool({
  description: prompt`
    Сохранить данные покупателя для Afisha: телефон, email, имя, фамилия,
    паспорт РФ (серия+номер). Карты не сохраняй — только персональные данные билета.
  `,
  effect: "write",
  inputSchema: z.object({
    phone: z.string().min(10).max(32).describe("Телефон +7..."),
    email: z.string().email(),
    firstName: z.string().min(1).max(80).describe("Имя"),
    lastName: z.string().min(1).max(80).describe("Фамилия"),
    patronymicName: z.string().min(1).max(80).optional().describe("Отчество"),
    passport: z
      .string()
      .min(10)
      .max(20)
      .optional()
      .describe("Паспорт целиком: 4510 123456 или 4510123456"),
    passportSeries: z.string().optional().describe("Серия, 4 цифры"),
    passportNumber: z.string().optional().describe("Номер, 6 цифр"),
    birthday: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Дата рождения YYYY-MM-DD, если спросит personalization"),
    preferredPaymentType: z.enum(["QrPay", "SberPay", "Card"]).optional(),
  }),
  async execute(input, ctx) {
    const parsed = parsePassport(
      input.passport ?? "",
      input.passportSeries,
      input.passportNumber,
    );
    if ("error" in parsed) {
      return { ok: false as const, error: parsed.error };
    }

    const profile: BuyerProfile = {
      phone: input.phone.trim(),
      email: input.email.trim().toLowerCase(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      patronymicName: input.patronymicName?.trim(),
      passportSeries: parsed.series,
      passportNumber: parsed.number,
      birthday: input.birthday,
      preferredPaymentType: input.preferredPaymentType,
      updatedAt: new Date().toISOString(),
    };
    await ctx.host.kv.put(PROFILE_KEY, profile as unknown as JsonValue);
    return {
      ok: true as const,
      saved: true,
      profile: publicProfile(profile),
    };
  },
});
