import { z } from "zod";
import { nanoid } from "nanoid";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createIntakeSession,
  getIntakeSessionByToken,
  updateIntakeSession,
  listIntakeSessions,
  getDashboardStats,
  createSurveyResponse,
  updateSurveyResponse,
  getSurveyStats,
  getAllSettings,
  setSetting,
} from "./db";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── 設定 ─────────────────────────────────────────────
  settings: router({
    getAll: protectedProcedure.query(async () => {
      return getAllSettings();
    }),

    set: protectedProcedure
      .input(z.object({ key: z.string(), value: z.string() }))
      .mutation(async ({ input }) => {
        await setSetting(input.key, input.value);
        return { success: true };
      }),
  }),

  // ── 受付セッション ────────────────────────────────────
  intake: router({
    // 新規セッション作成（スタッフ用）
    createSession: protectedProcedure
      .input(z.object({ source: z.enum(["url", "tablet"]).optional() }).optional())
      .mutation(async ({ input }) => {
        const token = nanoid(32);
        await createIntakeSession(token, input?.source ?? "url");
        return { token };
      }),

    // タブレットモード用セッション作成（公開・ログイン不要）
    createTabletSession: publicProcedure.mutation(async () => {
      const token = nanoid(32);
      await createIntakeSession(token, "tablet");
      return { token };
    }),

    // トークンでセッション取得（依頼者用・公開）
    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const session = await getIntakeSessionByToken(input.token);
        return session ?? null;
      }),

    // 依頼者が個人情報を送信（公開）
    submitIntake: publicProcedure
      .input(z.object({
        token: z.string(),
        // 案件種別
        caseCategory: z.enum(["with_opponent", "no_opponent"]),
        caseType: z.string().optional(),
        // 依頼者情報
        clientName: z.string().min(1, "氏名は必須です"),
        clientNameKana: z.string().optional(),
        clientBirthDate: z.string().optional(), // YYYY-MM-DD
        clientPostalCode: z.string().optional(),
        clientAddress: z.string().optional(),
        clientPhone: z.string().optional(),
        clientMobile: z.string().optional(),
        clientEmail: z.string().email("メールアドレスの形式が正しくありません").optional().or(z.literal("")),
        clientOccupation: z.string().optional(),
        clientReferrer: z.string().optional(),
        consultationReason: z.string().optional(),
        // 相手方情報（with_opponent の場合のみ）
        opponentName: z.string().optional(),
        opponentNameKana: z.string().optional(),
        opponentPostalCode: z.string().optional(),
        opponentAddress: z.string().optional(),
        opponentPhone: z.string().optional(),
        opponentRelation: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { token, ...data } = input;
        const session = await getIntakeSessionByToken(token);
        if (!session) throw new Error("Session not found");
        if (session.status !== "intake") throw new Error("Session already submitted");

        const birthDate = data.clientBirthDate ? new Date(data.clientBirthDate) : undefined;

        await updateIntakeSession(token, {
          ...data,
          clientBirthDate: birthDate,
          status: "waiting",
          intakeCompletedAt: new Date(),
        });
        return { success: true };
      }),

    // スタッフが相談完了を記録（保護）
    completeConsultation: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const session = await getIntakeSessionByToken(input.token);
        if (!session) throw new Error("Session not found");
        await updateIntakeSession(input.token, {
          status: "sf_pending",
          consultationCompletedAt: new Date(),
        });
        return { success: true };
      }),

    // Salesforce送信完了を記録（スタッフ用）
    markSfSent: protectedProcedure
      .input(z.object({
        token: z.string(),
        type: z.enum(["client", "opponent", "both"]),
      }))
      .mutation(async ({ input }) => {
        const now = new Date();
        const updateData: Record<string, unknown> = {};
        if (input.type === "client" || input.type === "both") {
          updateData.sfClientSentAt = now;
        }
        if (input.type === "opponent" || input.type === "both") {
          updateData.sfOpponentSentAt = now;
        }
        // 両方送信済みになったらsurveyステータスへ
        const session = await getIntakeSessionByToken(input.token);
        const clientSent = input.type === "client" || input.type === "both" || !!session?.sfClientSentAt;
        const opponentSent =
          session?.caseCategory === "no_opponent" ||
          input.type === "opponent" ||
          input.type === "both" ||
          !!session?.sfOpponentSentAt;

        if (clientSent && opponentSent) {
          updateData.status = "survey";
        }
        await updateIntakeSession(input.token, updateData as any);
        return { success: true };
      }),

    // 相談料表示（スタッフが金額を選んでQRを表示）
    showPayment: protectedProcedure
      .input(z.object({
        token: z.string(),
        amount: z.number().int().min(1, "金額は1円以上で入力してください"),
      }))
      .mutation(async ({ input }) => {
        const session = await getIntakeSessionByToken(input.token);
        if (!session) throw new Error("Session not found");
        // waiting/consultingからも直接PayPay QRを表示できるようにする
        // 相談完了も同時に記録
        const updateData: Record<string, unknown> = {
          paymentAmount: input.amount,
          paymentStatus: "shown",
          paymentShownAt: new Date(),
        };
        if (session.status === "waiting" || session.status === "consulting") {
          updateData.status = "sf_pending";
          updateData.consultationCompletedAt = new Date();
        }
        await updateIntakeSession(input.token, updateData as any);
        return { success: true };
      }),

    // 支払い確認（依頼者がボタンを押す）
    confirmPayment: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const session = await getIntakeSessionByToken(input.token);
        if (!session) throw new Error("Session not found");
        await updateIntakeSession(input.token, {
          paymentStatus: "confirmed",
          paymentConfirmedAt: new Date(),
          status: "survey",
        });
        return { success: true };
      }),

    // アンケート完了を記録（公開）
    completeSurvey: publicProcedure
      .input(z.object({ token: z.string(), surveyResponseId: z.number() }))
      .mutation(async ({ input }) => {
        await updateIntakeSession(input.token, {
          status: "completed",
          surveyCompletedAt: new Date(),
          surveyResponseId: input.surveyResponseId,
        });
        return { success: true };
      }),

    // セッション一覧（スタッフ用）
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return listIntakeSessions(input);
      }),

    // ダッシュボード統計
    stats: protectedProcedure.query(async () => {
      return getDashboardStats();
    }),
  }),

  // ── アンケート ────────────────────────────────────────
  survey: router({
    submit: publicProcedure
      .input(z.object({
        sessionToken: z.string().optional(),
        satisfaction: z.number().min(1).max(5),
        goodPoints: z.array(z.string()).optional(),
        visitTrigger: z.array(z.string()).optional(),
        visitTriggerOther: z.string().optional(),
        freeComment: z.string().optional(),
        googleReviewShown: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        let sessionId: number | undefined;
        if (input.sessionToken) {
          const session = await getIntakeSessionByToken(input.sessionToken);
          sessionId = session?.id;
        }
        const id = await createSurveyResponse({
          sessionId,
          satisfaction: input.satisfaction,
          goodPoints: input.goodPoints?.join(","),
          visitTrigger: input.visitTrigger?.join(","),
          visitTriggerOther: input.visitTriggerOther,
          freeComment: input.freeComment,
          googleReviewShown: input.googleReviewShown,
        });
        return { id };
      }),

    clickReview: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await updateSurveyResponse(input.id, { googleReviewClicked: true });
        return { success: true };
      }),

    stats: protectedProcedure.query(async () => {
      return getSurveyStats();
    }),
  }),
});

export type AppRouter = typeof appRouter;
