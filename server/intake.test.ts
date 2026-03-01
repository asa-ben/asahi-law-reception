import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// DB モック
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
          name: null,
          nameKana: null,
          birthDate: null,
          postalCode: null,
          address: null,
          phone: null,
          mobile: null,
          email: null,
          occupation: null,
          referrer: null,
          consultationReason: null,
          caseId: null,
          surveyResponseId: null,
          exportedToSalesforce: false,
          exportedAt: null,
          intakeCompletedAt: null,
          consultationStartedAt: null,
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
          name: "朝日 太郎",
          nameKana: "あさひ たろう",
          birthDate: null,
          postalCode: null,
          address: null,
          phone: null,
          mobile: null,
          email: null,
          occupation: null,
          referrer: null,
          consultationReason: null,
          caseId: null,
          surveyResponseId: null,
          exportedToSalesforce: false,
          exportedAt: null,
          intakeCompletedAt: new Date(),
          consultationStartedAt: null,
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
  it("有効なトークンで個人情報を送信できる", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.intake.submitIntake({
      token: "valid-token",
      name: "朝日 太郎",
      nameKana: "あさひ たろう",
      phone: "06-0000-0000",
      email: "taro@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("存在しないトークンではエラーになる", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(
      caller.intake.submitIntake({ token: "invalid-token", name: "テスト" })
    ).rejects.toThrow("Session not found");
  });

  it("既に送信済みのセッションではエラーになる", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(
      caller.intake.submitIntake({ token: "waiting-token", name: "朝日 太郎" })
    ).rejects.toThrow("Session already submitted");
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

describe("intake.list", () => {
  it("認証済みスタッフがセッション一覧を取得できる", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.intake.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});
