import { prompt } from "@cursor/bdk";
import type { JsonValue } from "@cursor/bdk";
import { defineTool } from "@cursor/bdk/tools";
import { z } from "zod";
import {
  AFISHA_AUTH_KEY,
  clearLocalAuth,
  listStoredCards,
  loadLocalAuth,
  pollAfishaAuth,
  saveLocalAuth,
  startAfishaAuth,
  type AfishaAuthSession,
} from "../lib/afisha-auth.js";

function asJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

export default defineTool({
  description: prompt`
    Подключить кабинет Afisha через Sber ID.
    start — создать сессию и выдать loginUrl (пользователь входит сам).
    status — проверить, завершён ли вход; при success сохранить кабинет.
    cards — список сохранённых карт (нужен успешный вход).
    disconnect — забыть сессию.
  `,
  effect: (input) => (input.action === "cards" ? "read" : "write"),
  inputSchema: z.discriminatedUnion("action", [
    z.object({
      action: z.literal("start"),
      expectedName: z
        .string()
        .min(2)
        .max(120)
        .default("Кузьма Марчук")
        .describe("ФИО кабинета для проверки после входа"),
      loginHint: z.string().optional().describe("Телефон для подсказки Sber ID"),
    }),
    z.object({ action: z.literal("status") }),
    z.object({ action: z.literal("cards") }),
    z.object({ action: z.literal("disconnect") }),
  ]),
  async execute(input, ctx) {
    if (input.action === "disconnect") {
      await ctx.host.kv.delete(AFISHA_AUTH_KEY);
      await clearLocalAuth();
      return { ok: true as const, disconnected: true };
    }

    if (input.action === "start") {
      const started = await startAfishaAuth({
        expectedName: input.expectedName,
        loginHint: input.loginHint,
      });
      if (!started.ok) {
        return { ok: false as const, status: started.status, error: asJson(started.error) };
      }
      await ctx.host.kv.put(AFISHA_AUTH_KEY, asJson(started.data));
      await saveLocalAuth(started.data);
      return {
        ok: true as const,
        phase: "awaiting_login" as const,
        expectedName: started.data.expectedName,
        userSessionId: started.data.userSessionId,
        loginUrl: started.data.loginUrl,
        note: "Открой loginUrl, войди в Sber ID кабинета Кузьма Марчук, затем вызови connect_afisha action=status.",
      };
    }

    const stored =
      ((await ctx.host.kv.get(AFISHA_AUTH_KEY)) as AfishaAuthSession | undefined) ??
      (await loadLocalAuth());
    if (!stored?.userSessionId) {
      return {
        ok: false as const,
        error: "Нет активной сессии. Сначала connect_afisha action=start.",
      };
    }

    if (input.action === "status") {
      const polled = await pollAfishaAuth(stored);
      if (!polled.ok) {
        return { ok: false as const, status: polled.status, error: asJson(polled.error) };
      }
      await ctx.host.kv.put(AFISHA_AUTH_KEY, asJson(polled.data));
      await saveLocalAuth(polled.data);
      return {
        ok: true as const,
        phase: polled.data.status,
        account: polled.data.account ?? null,
        expectedName: polled.data.expectedName,
        loginUrl: polled.data.status === "inProgress" ? polled.data.loginUrl : null,
        note:
          polled.data.status === "success"
            ? "Кабинет подключён."
            : polled.data.status === "mismatch"
              ? `Вошли как «${polled.data.account?.name ?? "?"}», ожидали «${polled.data.expectedName}». disconnect и start заново.`
              : polled.data.status === "error"
                ? "Ошибка авторизации Sber ID — start заново."
                : "Ещё inProgress — заверши вход по loginUrl и повтори status.",
      };
    }

    // cards
    const cards = await listStoredCards(stored);
    if (!cards.ok) {
      return {
        ok: false as const,
        status: cards.status,
        error: asJson(cards.error),
        hint: stored.status !== "success" ? "Сначала status=success" : undefined,
      };
    }
    return { ok: true as const, cards: asJson(cards.data) };
  },
});
