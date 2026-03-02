import { eq, desc, like, or, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, intakeSessions, surveyResponses, appSettings, InsertIntakeSession } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ── Users ──────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;

    for (const field of textFields) {
      const value = user[field];
      if (value === undefined) continue;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── App Settings ────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  return result[0]?.value ?? null;
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select().from(appSettings);
  return Object.fromEntries(rows.map((r) => [r.key, r.value ?? ""]));
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(appSettings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}

// ── Intake Sessions ─────────────────────────────────────

export async function createIntakeSession(token: string, source: "url" | "tablet" = "url"): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(intakeSessions).values({ sessionToken: token, source });
  return Number(result[0].insertId);
}

export async function getIntakeSessionByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(intakeSessions).where(eq(intakeSessions.sessionToken, token)).limit(1);
  return result[0] ?? undefined;
}

export async function getIntakeSessionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(intakeSessions).where(eq(intakeSessions.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function updateIntakeSession(
  token: string,
  data: Partial<InsertIntakeSession>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(intakeSessions).set(data).where(eq(intakeSessions.sessionToken, token));
}

export async function listIntakeSessions(opts?: {
  search?: string;
  status?: string;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const limit = opts?.limit ?? 50;

  let query = db.select().from(intakeSessions).$dynamic();

  if (opts?.search) {
    const s = `%${opts.search}%`;
    query = query.where(
      or(
        like(intakeSessions.clientName, s),
        like(intakeSessions.clientEmail, s),
        like(intakeSessions.clientPhone, s),
        like(intakeSessions.clientMobile, s),
      )
    );
  }

  return query.orderBy(desc(intakeSessions.createdAt)).limit(limit);
}

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { total: 0, waiting: 0, sfPending: 0, completed: 0, todayCount: 0 };

  const rows = await db.select().from(intakeSessions);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return {
    total: rows.length,
    waiting: rows.filter((r) => r.status === "waiting" || r.status === "consulting").length,
    sfPending: rows.filter((r) => r.status === "sf_pending").length,
    completed: rows.filter((r) => r.status === "completed").length,
    todayCount: rows.filter((r) => new Date(r.createdAt) >= today).length,
  };
}

// ── Survey Responses ────────────────────────────────────

export async function createSurveyResponse(data: {
  sessionId?: number;
  satisfaction: number;
  goodPoints?: string;
  visitTrigger?: string;
  visitTriggerOther?: string;
  freeComment?: string;
  googleReviewShown?: boolean;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(surveyResponses).values(data);
  return Number(result[0].insertId);
}

export async function updateSurveyResponse(id: number, data: { googleReviewClicked?: boolean }): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(surveyResponses).set(data).where(eq(surveyResponses.id, id));
}

export async function getSurveyStats() {
  const db = await getDb();
  if (!db) return { total: 0, avgSatisfaction: 0, distribution: [0, 0, 0, 0, 0], reviewClicked: 0 };

  const rows = await db.select().from(surveyResponses);
  if (rows.length === 0) return { total: 0, avgSatisfaction: 0, distribution: [0, 0, 0, 0, 0], reviewClicked: 0 };

  const distribution = [1, 2, 3, 4, 5].map((s) => rows.filter((r) => r.satisfaction === s).length);
  const avgSatisfaction = rows.reduce((sum, r) => sum + r.satisfaction, 0) / rows.length;
  const reviewClicked = rows.filter((r) => r.googleReviewClicked).length;

  return { total: rows.length, avgSatisfaction: Math.round(avgSatisfaction * 10) / 10, distribution, reviewClicked };
}
