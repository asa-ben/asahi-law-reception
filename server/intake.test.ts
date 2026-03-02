import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// DB モック（新スキーマ対応）
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    createIntakeSession: vi.fn().mockResolvedValue(1),
    getIntakeSessionByToken: vi.fn().mockImplementation((token: string) => {
      if (token === "valid-token") {
        return Promise.resolve({
          id: 1,
          sessionToken: "valid-token",
          status: "intake",
          caseCategory: null,
          caseType: null,
          clientName: null,
          clientNameKana: null,
          clientBirthDate: null,
          clientPostalCode: null,
          clientAddress: null,
          clientPhone: null,
          clientMobile: null,
          clientEmail: null,
          clientOccupation: null,
          clientReferrer: null,
          consultationReason: null,
          opponentName: null,
          opponentNameKana: null,
          opponentPostalCode: null,
          opponentAddress: null,
          opponentPhone: null,
          opponentRelation: null,
          sfClientSentAt: null,
          sfOpponentSentAt: null,
          sfClientLeadId: null,
          sfOpponentLeadId: null,
          surveyResponseId: null,
          intakeCompletedAt: null,
          consultationCompletedAt: null,
          surveyCompletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      if (token === "waiting-token") {
        return Promise.resolve({
          id: 2,
          sessionToken: "waiting-token",
          status: "waiting",
          caseCategory: "with_opponent",
          caseType: "離婚",
          clientName: "朝日 太郎",
          clientNameKana: "あさひ たろう",
          clientBirthDate: null,
          clientPostalCode: "530-0001",
          clientAddress: "大阪府大阪市北区",
          clientPhone: "06-0000-0000",
          clientMobile: "090-0000-0000",
          clientEmail: "taro@example.com",
          clientOccupation: "会社員",
          clientReferrer: "ウェブ検索",
          consultationReason: "離婚について相談したい",
          opponentName: "朝日 花子",
          opponentNameKana: "あさひ はなこ",
          opponentPostalCode: null,
          opponentAddress: null,
          opponentPhone: null,
          opponentRelation: "配偶者",
          sfClientSentAt: null,
          sfOpponentSentAt: null,
          sfClientLeadId: null,
          sfOpponentLeadId: null,
          surveyResponseId: null,
          intakeCompletedAt: new Date(),
          consultationCompletedAt: null,
          surveyCompletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      return Promise.resolve(undefined);
    }),
    updateIntakeSession: vi.fn().mockResolvedValue(undefined),
    listIntakeSessions: vi.fn().mockResolvedValue([]),
    getDashboardStats: vi.fn().mockResolvedValue({ total: 0, waiting: 0, sfPending: 0, completed: 0, todayCount: 0 }),
    createSurveyResponse: vi.fn().mockResolvedValue(1),
    updateSurveyResponse: vi.fn().mockResolvedValue(undefined),
    getSurveyStats: vi.fn().mockResolvedValue({ total: 0, avgSatisfaction: 0, distribution: [0, 0, 0, 0, 0], reviewClicked: 0 }),
    getAllSettings: vi.fn().mockResolvedValue({ sf_org_id: "", sf_web_to_lead_url: "", google_review_url: "" }),
    setSetting: vi.fn().mockResolvedValue(undefined),
  };
});

function createAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@asahi.law",
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

describe("intake.createTabletSession", () => {
  it("タブレットモード用セッションを公開エンドポイントで作成できる", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.intake.createTabletSession();
    expect(result).toHaveProperty("token");
    expect(typeof result.token).toBe("string");
    expect(result.token.length).toBeGreaterThan(0);
  });

  it("認証済みユーザーもタブレットモードセッションを作成できる", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.intake.createTabletSession();
    expect(result).toHaveProperty("token");
  });
});

describe("intake.getByToken", () => {
  it("有効なトークンでセッションを取得できる", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.intake.getByToken({ token: "valid-token" });
    expect(result).not.toBeNull();
    expect(result?.sessionToken).toBe("valid-token");
    expect(result?.status).toBe("intake");
  });

  it("無効なトークンでnullを返す", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.intake.getByToken({ token: "invalid-token" });
    expect(result).toBeNull();
  });
});

describe("intake.submitIntake", () => {
  it("有効なトークンで依頼者情報（相手方あり）を送信できる", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.intake.submitIntake({
      token: "valid-token",
      caseCategory: "with_opponent",
      caseType: "離婚",
      clientName: "朝日 太郎",
      clientNameKana: "あさひ たろう",
      clientPhone: "06-0000-0000",
      clientEmail: "taro@example.com",
      opponentName: "朝日 花子",
      opponentRelation: "配偶者",
    });
    expect(result.success).toBe(true);
  });

  it("相手方なし（破産等）の案件も送信できる", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.intake.submitIntake({
      token: "valid-token",
      caseCategory: "no_opponent",
      caseType: "自己破産",
      clientName: "朝日 次郎",
    });
    expect(result.success).toBe(true);
  });

  it("存在しないトークンではエラーになる", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(
      caller.intake.submitIntake({
        token: "invalid-token",
        caseCategory: "no_opponent",
        clientName: "テスト",
      })
    ).rejects.toThrow("Session not found");
  });

  it("既に送信済みのセッションではエラーになる", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(
      caller.intake.submitIntake({
        token: "waiting-token",
        caseCategory: "no_opponent",
        clientName: "朝日 太郎",
      })
    ).rejects.toThrow("Session already submitted");
  });

  it("clientNameが空の場合はバリデーションエラー", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(
      caller.intake.submitIntake({
        token: "valid-token",
        caseCategory: "no_opponent",
        clientName: "",
      })
    ).rejects.toThrow();
  });
});

describe("intake.completeConsultation", () => {
  it("認証済みスタッフが相談完了を記録できる", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.intake.completeConsultation({ token: "waiting-token" });
    expect(result.success).toBe(true);
  });

  it("未認証ユーザーはアクセスできない", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(
      caller.intake.completeConsultation({ token: "waiting-token" })
    ).rejects.toThrow();
  });
});

describe("intake.markSfSent", () => {
  it("依頼者のSalesforce送信完了を記録できる", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.intake.markSfSent({ token: "waiting-token", type: "client" });
    expect(result.success).toBe(true);
  });

  it("相手方のSalesforce送信完了を記録できる", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.intake.markSfSent({ token: "waiting-token", type: "opponent" });
    expect(result.success).toBe(true);
  });

  it("両方まとめて送信完了を記録できる", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.intake.markSfSent({ token: "waiting-token", type: "both" });
    expect(result.success).toBe(true);
  });
});

describe("intake.list", () => {
  it("認証済みスタッフがセッション一覧を取得できる", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.intake.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("未認証ユーザーは一覧を取得できない", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(caller.intake.list({})).rejects.toThrow();
  });
});

describe("intake.stats", () => {
  it("認証済みスタッフが統計を取得できる", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.intake.stats();
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("waiting");
    expect(result).toHaveProperty("sfPending");
    expect(result).toHaveProperty("todayCount");
  });
});

describe("survey.submit", () => {
  it("満足度1〜5の範囲でアンケートを送信できる", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.survey.submit({ satisfaction: 5, googleReviewShown: true });
    expect(result).toHaveProperty("id");
  });

  it("満足度0はバリデーションエラー", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(caller.survey.submit({ satisfaction: 0 })).rejects.toThrow();
  });

  it("満足度6はバリデーションエラー", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(caller.survey.submit({ satisfaction: 6 })).rejects.toThrow();
  });
});

describe("intake.showPayment", () => {
  it("認証済みスタッフが相談料QRを表示できる", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.intake.showPayment({ token: "waiting-token", amount: 5000 });
    expect(result.success).toBe(true);
  });

  it("未認証ユーザーはアクセスできない", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(caller.intake.showPayment({ token: "waiting-token", amount: 5000 })).rejects.toThrow();
  });

  it("金額0円はバリデーションエラー", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    await expect(caller.intake.showPayment({ token: "waiting-token", amount: 0 })).rejects.toThrow();
  });
});

describe("intake.confirmPayment", () => {
  it("依頼者が支払い完了を記録できる", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.intake.confirmPayment({ token: "waiting-token" });
    expect(result.success).toBe(true);
  });
});

describe("settings", () => {
  it("認証済みスタッフが設定を取得できる", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.settings.getAll();
    expect(result).toHaveProperty("sf_org_id");
    expect(result).toHaveProperty("google_review_url");
  });

  it("認証済みスタッフが設定を保存できる", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.settings.set({ key: "sf_org_id", value: "00D5j000000XXXXX" });
    expect(result.success).toBe(true);
  });

  it("未認証ユーザーは設定を変更できない", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(caller.settings.set({ key: "sf_org_id", value: "test" })).rejects.toThrow();
  });
});
