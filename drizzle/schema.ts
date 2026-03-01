import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  date,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// アプリ設定テーブル（Salesforce OID・Google口コミURLなど）
export const appSettings = mysqlTable("appSettings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;

// 受付セッションテーブル（依頼者自己入力→相談→SF登録→アンケートの一連フロー管理）
export const intakeSessions = mysqlTable("intakeSessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionToken: varchar("sessionToken", { length: 64 }).notNull().unique(),

  // ステータス
  status: mysqlEnum("status", [
    "intake",       // 個人情報入力中
    "waiting",      // 相談待機中
    "consulting",   // 相談中
    "sf_pending",   // Salesforce送信待ち
    "survey",       // アンケート中
    "completed",    // 完了
  ]).default("intake").notNull(),

  // 案件種別（相手方の有無）
  caseCategory: mysqlEnum("caseCategory", [
    "with_opponent",   // 相手方あり（離婚・交通事故・債権回収など）
    "no_opponent",     // 相手方なし（破産・相続・遺言など）
  ]),
  caseType: varchar("caseType", { length: 128 }), // 具体的な事件種別（任意）

  // ── 依頼者情報 ──
  clientName: varchar("clientName", { length: 128 }),
  clientNameKana: varchar("clientNameKana", { length: 128 }),
  clientBirthDate: date("clientBirthDate"),
  clientPostalCode: varchar("clientPostalCode", { length: 10 }),
  clientAddress: text("clientAddress"),
  clientPhone: varchar("clientPhone", { length: 20 }),
  clientMobile: varchar("clientMobile", { length: 20 }),
  clientEmail: varchar("clientEmail", { length: 320 }),
  clientOccupation: varchar("clientOccupation", { length: 128 }),
  clientReferrer: varchar("clientReferrer", { length: 256 }),
  consultationReason: text("consultationReason"),

  // ── 相手方情報（caseCategory = with_opponent の場合のみ） ──
  opponentName: varchar("opponentName", { length: 128 }),
  opponentNameKana: varchar("opponentNameKana", { length: 128 }),
  opponentPostalCode: varchar("opponentPostalCode", { length: 10 }),
  opponentAddress: text("opponentAddress"),
  opponentPhone: varchar("opponentPhone", { length: 20 }),
  opponentRelation: varchar("opponentRelation", { length: 128 }), // 依頼者との関係（元配偶者・加害者など）

  // ── Salesforce送信状況 ──
  sfClientSentAt: timestamp("sfClientSentAt"),   // 依頼者リード送信日時
  sfOpponentSentAt: timestamp("sfOpponentSentAt"), // 相手方リード送信日時
  sfClientLeadId: varchar("sfClientLeadId", { length: 64 }),   // SF側のリードID（任意）
  sfOpponentLeadId: varchar("sfOpponentLeadId", { length: 64 }),

  // ── アンケート ──
  surveyResponseId: int("surveyResponseId"),

  // ── タイムスタンプ ──
  intakeCompletedAt: timestamp("intakeCompletedAt"),
  consultationCompletedAt: timestamp("consultationCompletedAt"),
  surveyCompletedAt: timestamp("surveyCompletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IntakeSession = typeof intakeSessions.$inferSelect;
export type InsertIntakeSession = typeof intakeSessions.$inferInsert;

// アンケート回答テーブル
export const surveyResponses = mysqlTable("surveyResponses", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId"), // 受付セッションIDと紐付け
  satisfaction: int("satisfaction").notNull(), // 1〜5
  goodPoints: text("goodPoints"),       // 良かった点（カンマ区切り）
  visitTrigger: text("visitTrigger"),   // 来所の決め手（カンマ区切り）
  visitTriggerOther: text("visitTriggerOther"),
  freeComment: text("freeComment"),
  googleReviewShown: boolean("googleReviewShown").default(false),
  googleReviewClicked: boolean("googleReviewClicked").default(false),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
});

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = typeof surveyResponses.$inferInsert;
