/**
 * ローカル認証（VPS環境用）
 * Manus OAuthの代わりにシンプルなパスワード認証を提供する
 */
import type { Express, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import * as db from "../db";

// .envファイルのパスを解決
function getEnvFilePath(): string {
  // プロジェクトルートの.envを探す
  // ESM環境では__dirnameが使えないため、import.meta.urlを使用
  let currentFileDir: string;
  try {
    currentFileDir = path.dirname(fileURLToPath(import.meta.url));
  } catch {
    currentFileDir = process.cwd();
  }
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(currentFileDir, "../.env"),
    path.resolve(currentFileDir, "../../.env"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0]; // フォールバック
}

// .envファイルの特定のキーを更新する
function updateEnvFile(key: string, value: string): boolean {
  try {
    const envPath = getEnvFilePath();
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content = content.trimEnd() + `\n${key}=${value}\n`;
    }
    fs.writeFileSync(envPath, content, "utf8");
    // メモリ上の環境変数も更新
    process.env[key] = value;
    return true;
  } catch (e) {
    console.error("[LocalAuth] Failed to update .env file:", e);
    return false;
  }
}

const LOCAL_ADMIN_OPEN_ID = "local-admin";
const LOCAL_ADMIN_NAME = "管理者";

function getSecretKey() {
  return new TextEncoder().encode(ENV.cookieSecret || "local-secret-key-fallback");
}

async function createLocalSession(): Promise<string> {
  const secretKey = getSecretKey();
  const issuedAt = Date.now();
  const expiresInMs = ONE_YEAR_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);

  return new SignJWT({
    openId: LOCAL_ADMIN_OPEN_ID,
    appId: "local",
    name: LOCAL_ADMIN_NAME,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

export async function verifyLocalSession(token: string): Promise<{ openId: string; name: string } | null> {
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
    const { openId, name } = payload as Record<string, unknown>;
    if (typeof openId !== "string" || typeof name !== "string") return null;
    return { openId, name };
  } catch {
    return null;
  }
}

export function registerLocalAuthRoutes(app: Express) {
  // ログインページ（フロントエンドで処理するためここでは不要）
  
  // パスワードログインAPI
  app.post("/api/local-auth/login", async (req: Request, res: Response) => {
    const { password } = req.body;
    
    // process.envを直接参照（パスワード変更後に即座反映させるため）
    const currentAdminPassword = process.env.ADMIN_PASSWORD ?? ENV.adminPassword;
    if (!password || password !== currentAdminPassword) {
      res.status(401).json({ error: "パスワードが正しくありません" });
      return;
    }

    // ローカル管理者ユーザーをDBに登録（存在しない場合のみ）
    try {
      await db.upsertUser({
        openId: LOCAL_ADMIN_OPEN_ID,
        name: LOCAL_ADMIN_NAME,
        email: null,
        loginMethod: "local",
        role: "admin",
        lastSignedIn: new Date(),
      });
    } catch (error) {
      console.error("[LocalAuth] Failed to upsert user:", error);
    }

    const sessionToken = await createLocalSession();
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    res.json({ success: true });
  });

  // ログアウトAPI
  app.post("/api/local-auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });
  // パスワード変更API（認証必要）
  app.post("/api/local-auth/change-password", async (req: Request, res: Response) => {
    // セッション確認
    const cookies = req.headers.cookie;
    if (!cookies) {
      res.status(401).json({ error: "ログインが必要です" });
      return;
    }
    const cookieMap = Object.fromEntries(
      cookies.split(";").map(c => {
        const [k, ...v] = c.trim().split("=");
        return [k, v.join("=")];
      })
    );
    const token = cookieMap[COOKIE_NAME];
    if (!token) {
      res.status(401).json({ error: "ログインが必要です" });
      return;
    }
    const session = await verifyLocalSession(token);
    if (!session) {
      res.status(401).json({ error: "セッションが無効です" });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    // 現在のパスワードを確認（process.envを直接参照して即座反映）
    const currentAdminPassword = process.env.ADMIN_PASSWORD ?? ENV.adminPassword;
    if (!currentPassword || currentPassword !== currentAdminPassword) {
      res.status(400).json({ error: "現在のパスワードが正しくありません" });
      return;
    }

    // 新しいパスワードのバリデーション
    if (!newPassword || typeof newPassword !== "string") {
      res.status(400).json({ error: "新しいパスワードを入力してください" });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: "パスワードは8文字以上で入力してください" });
      return;
    }
    if (newPassword === currentPassword) {
      res.status(400).json({ error: "新しいパスワードは現在のパスワードと異なるものを入力してください" });
      return;
    }

    // .envファイルを更新
    const success = updateEnvFile("ADMIN_PASSWORD", newPassword);
    if (!success) {
      res.status(500).json({ error: "パスワードの保存に失敗しました" });
      return;
    }

    console.log("[LocalAuth] Password changed successfully");
    res.json({ success: true, message: "パスワードを変更しました" });
  });

  // 認証状態確認 API
  app.get("/api/local-auth/me", async (req: Request, res: Response) => {
    const cookies = req.headers.cookie;
    if (!cookies) {
      res.json({ user: null });
      return;
    }
    
    const cookieMap = Object.fromEntries(
      cookies.split(";").map(c => {
        const [k, ...v] = c.trim().split("=");
        return [k, v.join("=")];
      })
    );
    
    const token = cookieMap[COOKIE_NAME];
    if (!token) {
      res.json({ user: null });
      return;
    }

    const session = await verifyLocalSession(token);
    if (!session) {
      res.json({ user: null });
      return;
    }

    res.json({
      user: {
        openId: session.openId,
        name: session.name,
        email: null,
        role: "admin",
      }
    });
  });
}
