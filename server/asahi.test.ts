import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// DB関数をモック
vi.mock("./db", () => ({
  getDashboardStats: vi.fn().mockResolvedValue({
    totalCases: 5,
    ongoingCases: 2,
    totalClients: 3,
    surveyStats: { total: 10, avgSatisfaction: 4.2, highSatisfaction: 8 },
  }),
  listCases: vi.fn().mockResolvedValue([
    { id: 1, caseNumber: "2024-001", status: "ongoing", assignedLawyer: "山田弁護士", caseType: "離婚", consultationDate: new Date(), notes: null, createdAt: new Date(), updatedAt: new Date() },
  ]),
  countCases: vi.fn().mockResolvedValue(1),
  getCaseDetail: vi.fn().mockResolvedValue({
    case: { id: 1, caseNumber: "2024-001", status: "ongoing", assignedLawyer: "山田弁護士", caseType: "離婚", consultationDate: new Date(), notes: null, createdAt: new Date(), updatedAt: new Date() },
    client: null,
    opponent: null,
    checklist: null,
    surveys: [],
  }),
  createCase: vi.fn().mockResolvedValue(1),
  updateCase: vi.fn().mockResolvedValue(undefined),
  listClients: vi.fn().mockResolvedValue([]),
  getClientByCaseId: vi.fn().mockResolvedValue(undefined),
  createClient: vi.fn().mockResolvedValue(1),
  updateClient: vi.fn().mockResolvedValue(undefined),
  getOpponentByCaseId: vi.fn().mockResolvedValue(undefined),
  createOpponent: vi.fn().mockResolvedValue(1),
  updateOpponent: vi.fn().mockResolvedValue(undefined),
  getChecklistByCaseId: vi.fn().mockResolvedValue(undefined),
  upsertChecklist: vi.fn().mockResolvedValue(undefined),
  listSurveyResponses: vi.fn().mockResolvedValue([
    { id: 1, caseId: null, satisfaction: 5, goodPoints: "explanation,atmosphere", visitTrigger: "hp", visitTriggerOther: null, freeComment: "とても丁寧でした", googleReviewShown: true, googleReviewClicked: false, submittedAt: new Date() },
  ]),
  getSurveyStats: vi.fn().mockResolvedValue({
    total: 10,
    avgSatisfaction: 4.2,
    highSatisfaction: 8,
    googleReviewShown: 8,
    distribution: { 1: 0, 2: 0, 3: 2, 4: 3, 5: 5 },
  }),
  createSurveyResponse: vi.fn().mockResolvedValue(42),
  updateSurveyResponse: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
}));

function createAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@asahi-law.jp",
      name: "管理者",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createPublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("dashboard.stats", () => {
  it("ダッシュボード統計を返す", async () => {
    const ctx = createAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.dashboard.stats();
    expect(stats.totalCases).toBe(5);
    expect(stats.ongoingCases).toBe(2);
    expect(stats.surveyStats.avgSatisfaction).toBe(4.2);
  });
});

describe("cases.list", () => {
  it("事件一覧を返す", async () => {
    const ctx = createAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const cases = await caller.cases.list({});
    expect(Array.isArray(cases)).toBe(true);
    expect(cases[0]?.caseNumber).toBe("2024-001");
  });
});

describe("cases.create", () => {
  it("新規事件を作成する", async () => {
    const ctx = createAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.cases.create({
      caseNumber: "2024-002",
      status: "consultation",
      assignedLawyer: "田中弁護士",
      caseType: "相続",
    });
    expect(result.id).toBe(1);
  });
});

describe("surveys.submit", () => {
  it("満足度4以上でgoogleReviewShown=trueを返す", async () => {
    const ctx = createPublicCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.surveys.submit({ satisfaction: 5 });
    expect(result.googleReviewShown).toBe(true);
    expect(result.id).toBe(42);
  });

  it("満足度3以下でgoogleReviewShown=falseを返す", async () => {
    const ctx = createPublicCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.surveys.submit({ satisfaction: 3 });
    expect(result.googleReviewShown).toBe(false);
  });
});

describe("surveys.list", () => {
  it("アンケート一覧とstatsを返す", async () => {
    const ctx = createAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const data = await caller.surveys.list({});
    expect(data.surveys.length).toBeGreaterThan(0);
    expect(data.stats.total).toBe(10);
    expect(data.stats.avgSatisfaction).toBe(4.2);
    expect(data.stats.googleReviewShown).toBe(8);
  });
});

describe("auth.logout", () => {
  it("セッションクッキーをクリアして成功を返す", async () => {
    const ctx = createAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});
