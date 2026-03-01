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

// 事件テーブル（メインエンティティ）
export const cases = mysqlTable("cases", {
  id: int("id").autoincrement().primaryKey(),
  caseNumber: varchar("caseNumber", { length: 64 }), // 管理番号
  consultationDate: date("consultationDate"), // 相談日
  status: mysqlEnum("status", ["consultation", "ongoing", "closed"]).default("consultation").notNull(), // 相談のみ終了/継続相談/受任
  assignedLawyer: varchar("assignedLawyer", { length: 128 }), // 担当弁護士
  caseType: varchar("caseType", { length: 128 }), // 事件種別
  notes: text("notes"), // 備考
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Case = typeof cases.$inferSelect;
export type InsertCase = typeof cases.$inferInsert;

// 依頼者テーブル
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(), // 事件ID
  // 基本情報
  nameKana: varchar("nameKana", { length: 128 }), // ふりがな
  name: varchar("name", { length: 128 }).notNull(), // 氏名
  birthDate: date("birthDate"), // 生年月日
  // 住所
  postalCode: varchar("postalCode", { length: 10 }),
  address: text("address"),
  // 連絡先
  phone: varchar("phone", { length: 20 }),
  mobile: varchar("mobile", { length: 20 }),
  fax: varchar("fax", { length: 20 }),
  email: varchar("email", { length: 320 }),
  emailType: mysqlEnum("emailType", ["pc", "mobile"]).default("pc"),
  // 請求書送付方法
  invoiceSendMethod: mysqlEnum("invoiceSendMethod", ["email", "mail"]).default("email"),
  // その他連絡先
  otherPostalCode: varchar("otherPostalCode", { length: 10 }),
  otherAddress: text("otherAddress"),
  otherPhone: varchar("otherPhone", { length: 20 }),
  // 紹介者・職業
  referrer: varchar("referrer", { length: 128 }), // 紹介者
  occupation: varchar("occupation", { length: 128 }), // 職業
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// 相手方テーブル
export const opponents = mysqlTable("opponents", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(), // 事件ID
  // 基本情報
  nameKana: varchar("nameKana", { length: 128 }),
  name: varchar("name", { length: 128 }),
  birthDate: date("birthDate"),
  // 住所
  postalCode: varchar("postalCode", { length: 10 }),
  address: text("address"),
  // 連絡先
  phone: varchar("phone", { length: 20 }),
  mobile: varchar("mobile", { length: 20 }),
  fax: varchar("fax", { length: 20 }),
  // 相手方代理人
  agentName: varchar("agentName", { length: 128 }),
  agentPostalCode: varchar("agentPostalCode", { length: 10 }),
  agentAddress: text("agentAddress"),
  agentPhone: varchar("agentPhone", { length: 20 }),
  agentFax: varchar("agentFax", { length: 20 }),
  // 郵送設定
  mailOption: mysqlEnum("mailOption", ["mail_ok", "mail_ng"]).default("mail_ok"),
  envelopeType: mysqlEnum("envelopeType", ["office", "plain"]),
  mailDestination: mysqlEnum("mailDestination", ["home", "work", "other"]),
  mailDestinationOther: varchar("mailDestinationOther", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Opponent = typeof opponents.$inferSelect;
export type InsertOpponent = typeof opponents.$inferInsert;

// 処理チェックリストテーブル
export const checklists = mysqlTable("checklists", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull().unique(), // 事件ID（1対1）
  // 委任契約書
  contractCreated: boolean("contractCreated").default(false),
  contractDate: date("contractDate"),
  // 報酬説明
  feeExplained: boolean("feeExplained").default(false),
  feeExplainDate: date("feeExplainDate"),
  // 利益相反
  conflictChecked: boolean("conflictChecked").default(false),
  conflictResult: mysqlEnum("conflictResult", ["none", "applicable"]).default("none"),
  conflictArticle: varchar("conflictArticle", { length: 64 }),
  conflictClientConsentDate: date("conflictClientConsentDate"),
  conflictOpponentConsentDate: date("conflictOpponentConsentDate"),
  // 預り金
  depositChecked: boolean("depositChecked").default(false),
  depositExists: boolean("depositExists").default(false),
  depositReceiptIssued: boolean("depositReceiptIssued").default(false),
  depositReportDate: date("depositReportDate"),
  // 本人確認
  identityVerified: boolean("identityVerified").default(false),
  identityVerifyType: mysqlEnum("identityVerifyType", ["not_required", "normal", "strict"]).default("not_required"),
  identityVerifyDate: date("identityVerifyDate"),
  identityVerifier: varchar("identityVerifier", { length: 128 }),
  // 処理状況
  processingStatus: mysqlEnum("processingStatus", ["consultation_only", "ongoing", "accepted"]).default("consultation_only"),
  fileStatus: mysqlEnum("fileStatus", ["filed", "pdf", "unnecessary", "consultation_file"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Checklist = typeof checklists.$inferSelect;
export type InsertChecklist = typeof checklists.$inferInsert;

// アンケート回答テーブル
export const surveyResponses = mysqlTable("surveyResponses", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId"), // 事件IDと紐付け（任意）
  // Q1: 満足度
  satisfaction: int("satisfaction").notNull(), // 1〜5
  // Q2: 良かった点（カンマ区切り）
  goodPoints: text("goodPoints"),
  // Q3: 来所の決め手（カンマ区切り）
  visitTrigger: text("visitTrigger"),
  visitTriggerOther: text("visitTriggerOther"),
  // Q4: 自由記述
  freeComment: text("freeComment"),
  // Google口コミ誘導フラグ
  googleReviewShown: boolean("googleReviewShown").default(false),
  googleReviewClicked: boolean("googleReviewClicked").default(false),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
});

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = typeof surveyResponses.$inferInsert;

// 受付セッションテーブル（依頼者自己入力→相談→アンケートの一連フロー管理）
export const intakeSessions = mysqlTable("intakeSessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionToken: varchar("sessionToken", { length: 64 }).notNull().unique(), // URLトークン
  // ステータス: intake=個人情報入力中, waiting=相談待機中, consulting=相談中, survey=アンケート中, completed=完了
  status: mysqlEnum("status", ["intake", "waiting", "consulting", "survey", "completed"]).default("intake").notNull(),
  // 個人情報（依頼者自己入力）
  nameKana: varchar("nameKana", { length: 128 }),
  name: varchar("name", { length: 128 }),
  birthDate: date("birthDate"),
  postalCode: varchar("postalCode", { length: 10 }),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  mobile: varchar("mobile", { length: 20 }),
  email: varchar("email", { length: 320 }),
  occupation: varchar("occupation", { length: 128 }),
  referrer: varchar("referrer", { length: 128 }),
  consultationReason: text("consultationReason"), // 相談の概要（任意）
  // 紐付け
  caseId: int("caseId"), // 事件IDと紐付け（任意）
  surveyResponseId: int("surveyResponseId"), // アンケート回答IDと紐付け
  // Salesforce出力フラグ
  exportedToSalesforce: boolean("exportedToSalesforce").default(false),
  exportedAt: timestamp("exportedAt"),
  // タイムスタンプ
  intakeCompletedAt: timestamp("intakeCompletedAt"),
  consultationStartedAt: timestamp("consultationStartedAt"),
  consultationCompletedAt: timestamp("consultationCompletedAt"),
  surveyCompletedAt: timestamp("surveyCompletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IntakeSession = typeof intakeSessions.$inferSelect;
export type InsertIntakeSession = typeof intakeSessions.$inferInsert;
