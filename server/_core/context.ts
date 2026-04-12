import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { verifyLocalSession } from "./localAuth";
import { ENV } from "./env";
import * as db from "../db";
import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    if (ENV.useLocalAuth) {
      // VPS環境用ローカル認証
      const cookies = parseCookieHeader(opts.req.headers.cookie ?? "");
      const token = cookies[COOKIE_NAME];
      if (token) {
        const session = await verifyLocalSession(token);
        if (session) {
          user = (await db.getUserByOpenId(session.openId)) ?? null;
        }
      }
    } else {
      // Manus OAuth
      user = await sdk.authenticateRequest(opts.req);
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
