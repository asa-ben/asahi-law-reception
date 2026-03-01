import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  countCases,
  createCase,
  createClient,
  createIntakeSession,
  createOpponent,
  createSurveyResponse,
  getCaseDetail,
  getDashboardStats,
  getChecklistByCaseId,
  getClientByCaseId,
  getIntakeSessionByToken,
  getOpponentByCaseId,
  listCases,
  listClients,
  listIntakeSessions,
  listSurveyResponses,
  getSurveyStats,
  updateCase,
  updateClient,
  updateIntakeSession,
  updateOpponent,
  updateSurveyResponse,
  upsertChecklist,
} from "./db";
import { nanoid } from "nanoid";
import { z } from "zod";

// ─── Shared Schemas ───────────────────────────────────────────────────────────

const caseSchema = z.object({
  caseNumber: z.string().optional(),
  consultationDate: z.string().optional(), // ISO date string
  status: z.enum(["consultation", "ongoing", "closed"]).optional(),
  assignedLawyer: z.string().optional(),
  caseType: z.string().optional(),
  notes: z.string().optional(),
});

const clientSchema = z.object({
  caseId: z.number(),
  nameKana: z.string().optional(),
  name: z.string(),
  birthDate: z.string().optional(),
  postalCode: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  fax: z.string().optional(),
  email: z.string().optional(),
  emailType: z.enum(["pc", "mobile"]).optional(),
  invoiceSendMethod: z.enum(["email", "mail"]).optional(),
  otherPostalCode: z.string().optional(),
  otherAddress: z.string().optional(),
  otherPhone: z.string().optional(),
  referrer: z.string().optional(),
  occupation: z.string().optional(),
});

const opponentSchema = z.object({
  caseId: z.number(),
  nameKana: z.string().optional(),
  name: z.string().optional(),
  birthDate: z.string().optional(),
  postalCode: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  fax: z.string().optional(),
  agentName: z.string().optional(),
  agentPostalCode: z.string().optional(),
  agentAddress: z.string().optional(),
  agentPhone: z.string().optional(),
  agentFax: z.string().optional(),
  mailOption: z.enum(["mail_ok", "mail_ng"]).optional(),
  envelopeType: z.enum(["office", "plain"]).optional(),
  mailDestination: z.enum(["home", "work", "other"]).optional(),
  mailDestinationOther: z.string().optional(),
});

const checklistSchema = z.object({
  caseId: z.number(),
  contractCreated: z.boolean().optional(),
  contractDate: z.string().optional(),
  feeExplained: z.boolean().optional(),
  feeExplainDate: z.string().optional(),
  conflictChecked: z.boolean().optional(),
  conflictResult: z.enum(["none", "applicable"]).optional(),
  conflictArticle: z.string().optional(),
  conflictClientConsentDate: z.string().optional(),
  conflictOpponentConsentDate: z.string().optional(),
  depositChecked: z.boolean().optional(),
  depositExists: z.boolean().optional(),
  depositReceiptIssued: z.boolean().optional(),
  depositReportDate: z.string().optional(),
  identityVerified: z.boolean().optional(),
  identityVerifyType: z.enum(["not_required", "normal", "strict"]).optional(),
  identityVerifyDate: z.string().optional(),
  identityVerifier: z.string().optional(),
  processingStatus: z.enum(["consultation_only", "ongoing", "accepted"]).optional(),
  fileStatus: z.enum(["filed", "pdf", "unnecessary", "consultation_file"]).optional(),
});

const surveySchema = z.object({
  caseId: z.number().optional(),
  satisfaction: z.number().min(1).max(5),
  goodPoints: z.string().optional(),
  visitTrigger: z.string().optional(),
  visitTriggerOther: z.string().optional(),
  freeComment: z.string().optional(),
  googleReviewShown: z.boolean().optional(),
  googleReviewClicked: z.boolean().optional(),
});

// ─── Router ───────────────────────────────────────────────────────────────────

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

  // Dashboard
  dashboard: router({
    stats: protectedProcedure.query(() => getDashboardStats()),
  }),

  // Cases
  cases: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(({ input }) => listCases(input.search, input.limit, input.offset)),
    count: protectedProcedure.query(() => countCases()),
    detail: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => getCaseDetail(input.id)),
    create: protectedProcedure.input(caseSchema).mutation(async ({ input }) => {
      const consultationDate = input.consultationDate ? new Date(input.consultationDate) : undefined;
      const id = await createCase({ ...input, consultationDate } as any);
      return { id };
    }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: caseSchema }))
      .mutation(async ({ input }) => {
        const consultationDate = input.data.consultationDate ? new Date(input.data.consultationDate) : undefined;
        await updateCase(input.id, { ...input.data, consultationDate } as any);
        return { success: true };
      }),
  }),

  // Clients
  clients: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(({ input }) => listClients(input.search, input.limit, input.offset)),
    getByCaseId: protectedProcedure.input(z.object({ caseId: z.number() })).query(({ input }) => getClientByCaseId(input.caseId)),
    create: protectedProcedure.input(clientSchema).mutation(async ({ input }) => {
      const birthDate = input.birthDate ? new Date(input.birthDate) : undefined;
      const id = await createClient({ ...input, birthDate } as any);
      return { id };
    }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: clientSchema.partial() }))
      .mutation(async ({ input }) => {
        const birthDate = input.data.birthDate ? new Date(input.data.birthDate) : undefined;
        await updateClient(input.id, { ...input.data, birthDate } as any);
        return { success: true };
      }),
  }),

  // Opponents
  opponents: router({
    getByCaseId: protectedProcedure.input(z.object({ caseId: z.number() })).query(({ input }) => getOpponentByCaseId(input.caseId)),
    create: protectedProcedure.input(opponentSchema).mutation(async ({ input }) => {
      const birthDate = input.birthDate ? new Date(input.birthDate) : undefined;
      const id = await createOpponent({ ...input, birthDate } as any);
      return { id };
    }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: opponentSchema.partial() }))
      .mutation(async ({ input }) => {
        const birthDate = input.data.birthDate ? new Date(input.data.birthDate) : undefined;
        await updateOpponent(input.id, { ...input.data, birthDate } as any);
        return { success: true };
      }),
  }),

  // Checklists
  checklists: router({
    getByCaseId: protectedProcedure.input(z.object({ caseId: z.number() })).query(({ input }) => getChecklistByCaseId(input.caseId)),
    upsert: protectedProcedure.input(checklistSchema).mutation(async ({ input }) => {
      const dateFields = ["contractDate", "feeExplainDate", "conflictClientConsentDate", "conflictOpponentConsentDate", "depositReportDate", "identityVerifyDate"] as const;
      const data: Record<string, any> = { ...input };
      for (const field of dateFields) {
        if (data[field]) data[field] = new Date(data[field]);
      }
      await upsertChecklist(input.caseId, data);
      return { success: true };
    }),
  }),

  // Intake Sessions
  intake: router({
    // 新規セッション作成（スタッフがタブレットでQR表示用に生成）
    createSession: protectedProcedure.mutation(async () => {
      const token = nanoid(16);
      const id = await createIntakeSession(token);
      return { id, token };
    }),
    // 公開：トークンでセッション取得
    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const session = await getIntakeSessionByToken(input.token);
        if (!session) return null;
        return session;
      }),
    // 公開：個人情報を保存（依頼者自己入力）
    submitIntake: publicProcedure
      .input(z.object({
        token: z.string(),
        nameKana: z.string().optional(),
        name: z.string(),
        birthDate: z.string().optional(),
        postalCode: z.string().optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        mobile: z.string().optional(),
        email: z.string().optional(),
        occupation: z.string().optional(),
        referrer: z.string().optional(),
        consultationReason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const session = await getIntakeSessionByToken(input.token);
        if (!session) throw new Error("Session not found");
        if (session.status !== "intake") throw new Error("Session already submitted");
        const birthDate = input.birthDate ? new Date(input.birthDate) : undefined;
        await updateIntakeSession(session.id, {
          ...input,
          birthDate,
          status: "waiting",
          intakeCompletedAt: new Date(),
        });
        return { success: true };
      }),
    // スタッフ用：相談完了ボタン（アンケート遷移トリガー）
    completeConsultation: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const session = await getIntakeSessionByToken(input.token);
        if (!session) throw new Error("Session not found");
        await updateIntakeSession(session.id, {
          status: "survey",
          consultationCompletedAt: new Date(),
        });
        return { success: true };
      }),
    // 公開：アンケート完了時にセッションを完了に更新
    completeSurvey: publicProcedure
      .input(z.object({ token: z.string(), surveyResponseId: z.number() }))
      .mutation(async ({ input }) => {
        const session = await getIntakeSessionByToken(input.token);
        if (!session) throw new Error("Session not found");
        await updateIntakeSession(session.id, {
          status: "completed",
          surveyResponseId: input.surveyResponseId,
          surveyCompletedAt: new Date(),
        });
        return { success: true };
      }),
    // 管理画面：セッション一覧
    list: protectedProcedure
      .input(z.object({ search: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(({ input }) => listIntakeSessions(input.limit, input.offset, input.search)),
    // Salesforce出力フラグを更新
    markExported: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await updateIntakeSession(input.id, { exportedToSalesforce: true, exportedAt: new Date() });
        return { success: true };
      }),
  }),

  // Surveys
  surveys: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => {
        const surveys = await listSurveyResponses(input.limit, input.offset, input.search);
        const stats = await getSurveyStats();
        return { surveys, stats };
      }),
    submit: publicProcedure.input(surveySchema).mutation(async ({ input }) => {
      const googleReviewShown = (input.satisfaction ?? 0) >= 4;
      const id = await createSurveyResponse({ ...input, googleReviewShown });
      return { id, googleReviewShown };
    }),
    markReviewClicked: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await updateSurveyResponse(input.id, { googleReviewClicked: true });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
