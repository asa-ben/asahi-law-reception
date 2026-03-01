import { and, desc, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Case,
  Checklist,
  Client,
  InsertCase,
  InsertChecklist,
  InsertClient,
  InsertIntakeSession,
  InsertOpponent,
  InsertSurveyResponse,
  InsertUser,
  Opponent,
  SurveyResponse,
  cases,
  checklists,
  clients,
  intakeSessions,
  opponents,
  surveyResponses,
  users,
} from "../drizzle/schema";
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

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

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
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Cases ───────────────────────────────────────────────────────────────────

export async function createCase(data: InsertCase): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(cases).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function getCaseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
  return result[0];
}

export async function updateCase(id: number, data: Partial<InsertCase>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(cases).set(data).where(eq(cases.id, id));
}

export async function listCases(search?: string, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  if (search) {
    return db
      .select()
      .from(cases)
      .where(
        or(
          like(cases.caseNumber, `%${search}%`),
          like(cases.assignedLawyer, `%${search}%`),
          like(cases.caseType, `%${search}%`)
        )
      )
      .orderBy(desc(cases.createdAt))
      .limit(limit)
      .offset(offset);
  }
  return db.select().from(cases).orderBy(desc(cases.createdAt)).limit(limit).offset(offset);
}

export async function countCases() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(cases);
  return result.length;
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export async function createClient(data: InsertClient): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(clients).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function getClientByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(eq(clients.caseId, caseId)).limit(1);
  return result[0];
}

export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(clients).set(data).where(eq(clients.id, id));
}

export async function listClients(search?: string, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  if (search) {
    return db
      .select()
      .from(clients)
      .where(or(like(clients.name, `%${search}%`), like(clients.nameKana, `%${search}%`)))
      .orderBy(desc(clients.createdAt))
      .limit(limit)
      .offset(offset);
  }
  return db.select().from(clients).orderBy(desc(clients.createdAt)).limit(limit).offset(offset);
}

// ─── Opponents ───────────────────────────────────────────────────────────────

export async function createOpponent(data: InsertOpponent): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(opponents).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function getOpponentByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(opponents).where(eq(opponents.caseId, caseId)).limit(1);
  return result[0];
}

export async function updateOpponent(id: number, data: Partial<InsertOpponent>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(opponents).set(data).where(eq(opponents.id, id));
}

// ─── Checklists ──────────────────────────────────────────────────────────────

export async function createChecklist(data: InsertChecklist): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(checklists).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function getChecklistByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(checklists).where(eq(checklists.caseId, caseId)).limit(1);
  return result[0];
}

export async function upsertChecklist(caseId: number, data: Partial<InsertChecklist>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await getChecklistByCaseId(caseId);
  if (existing) {
    await db.update(checklists).set(data).where(eq(checklists.caseId, caseId));
  } else {
    await db.insert(checklists).values({ caseId, ...data });
  }
}

// ─── Survey Responses ────────────────────────────────────────────────────────

export async function createSurveyResponse(data: InsertSurveyResponse): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(surveyResponses).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function listSurveyResponses(limit = 50, offset = 0, search?: string) {
  const db = await getDb();
  if (!db) return [];
  if (search) {
    return db
      .select()
      .from(surveyResponses)
      .where(like(surveyResponses.freeComment, `%${search}%`))
      .orderBy(desc(surveyResponses.submittedAt))
      .limit(limit)
      .offset(offset);
  }
  return db.select().from(surveyResponses).orderBy(desc(surveyResponses.submittedAt)).limit(limit).offset(offset);
}

export async function getSurveyResponsesByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(surveyResponses).where(eq(surveyResponses.caseId, caseId));
}

export async function updateSurveyResponse(id: number, data: Partial<InsertSurveyResponse>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(surveyResponses).set(data).where(eq(surveyResponses.id, id));
}

export async function getSurveyStats() {
  const db = await getDb();
  if (!db) return { total: 0, avgSatisfaction: 0, highSatisfaction: 0, googleReviewShown: 0, distribution: {} as Record<number, number> };
  const all = await db.select().from(surveyResponses);
  const total = all.length;
  const avgSatisfaction = total > 0 ? all.reduce((s, r) => s + r.satisfaction, 0) / total : 0;
  const highSatisfaction = all.filter((r) => r.satisfaction >= 4).length;
  const googleReviewShown = all.filter((r) => r.googleReviewShown).length;
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of all) distribution[r.satisfaction] = (distribution[r.satisfaction] ?? 0) + 1;
  return { total, avgSatisfaction: Math.round(avgSatisfaction * 10) / 10, highSatisfaction, googleReviewShown, distribution };
}

// ─── Intake Sessions ─────────────────────────────────────────────────────────

export async function createIntakeSession(token: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(intakeSessions).values({ sessionToken: token, status: "intake" });
  return (result[0] as { insertId: number }).insertId;
}

export async function getIntakeSessionByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(intakeSessions).where(eq(intakeSessions.sessionToken, token)).limit(1);
  return result[0];
}

export async function getIntakeSessionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(intakeSessions).where(eq(intakeSessions.id, id)).limit(1);
  return result[0];
}

export async function updateIntakeSession(id: number, data: Partial<InsertIntakeSession>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(intakeSessions).set(data).where(eq(intakeSessions.id, id));
}

export async function listIntakeSessions(limit = 50, offset = 0, search?: string) {
  const db = await getDb();
  if (!db) return [];
  if (search) {
    return db
      .select()
      .from(intakeSessions)
      .where(or(like(intakeSessions.name, `%${search}%`), like(intakeSessions.nameKana, `%${search}%`), like(intakeSessions.email, `%${search}%`)))
      .orderBy(desc(intakeSessions.createdAt))
      .limit(limit)
      .offset(offset);
  }
  return db.select().from(intakeSessions).orderBy(desc(intakeSessions.createdAt)).limit(limit).offset(offset);
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { totalCases: 0, ongoingCases: 0, totalClients: 0, surveyStats: { total: 0, avgSatisfaction: 0, highSatisfaction: 0 } };
  const allCases = await db.select().from(cases);
  const allClients = await db.select().from(clients);
  const surveyStats = await getSurveyStats();
  return {
    totalCases: allCases.length,
    ongoingCases: allCases.filter((c) => c.status === "ongoing").length,
    totalClients: allClients.length,
    surveyStats,
  };
}

// ─── Case Detail (joined) ────────────────────────────────────────────────────

export async function getCaseDetail(caseId: number) {
  const db = await getDb();
  if (!db) return null;
  const [caseData, clientData, opponentData, checklistData, surveyData] = await Promise.all([
    getCaseById(caseId),
    getClientByCaseId(caseId),
    getOpponentByCaseId(caseId),
    getChecklistByCaseId(caseId),
    getSurveyResponsesByCaseId(caseId),
  ]);
  if (!caseData) return null;
  return { case: caseData, client: clientData, opponent: opponentData, checklist: checklistData, surveys: surveyData };
}
