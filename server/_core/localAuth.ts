/**
 * ローカル認証（VPS環境用）
 * Manus OAuthの代わりにシンプルなパスワード認証を提供する
 */
import type { Express, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import * as db from "../db";

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
    
    if (!password || password !== ENV.adminPassword) {
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

  // 認証状態確認API
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
