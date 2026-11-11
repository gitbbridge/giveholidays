import { randomUUID } from "node:crypto";
import type {
  Express,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import type { Database, Actor, Query } from "./database.ts";
import { digest, keyedHash, safeEqual, token, code } from "./security.ts";
import { queueMail } from "./private-mail.ts";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export interface PrivateConfig {
  database: Database;
  secret: string;
  origin: string;
  production: boolean;
  adminEmails: string[];
  contentPath: string;
  documentDirectory: string;
  legalReviewApproved: boolean;
  scanFile?: (path: string) => Promise<boolean>;
}
export function getActor(res: Response) {
  return res.locals.actor as Actor;
}
export async function audit(
  query: Query,
  actor: Actor,
  action: string,
  id: string,
  metadata: Record<string, unknown> = {},
) {
  await query(
    "INSERT INTO audit_events(id,admin_id,action,record_id,metadata) VALUES($1,$2,$3,$4,$5)",
    [randomUUID(), actor.adminId || null, action, id, JSON.stringify(metadata)],
  );
}
export async function initializeAccess(config: PrivateConfig) {
  if (Buffer.from(config.secret, "base64").length !== 32)
    throw new Error("A 32-byte base64 PRIVATE_SECRET is required.");
  if (config.production && new URL(config.origin).protocol !== "https:")
    throw new Error("Production PUBLIC_ORIGIN must use HTTPS.");
  for (const email of config.adminEmails) {
    if (!z.email().safeParse(email).success)
      throw new Error("Invalid administrator email configuration.");
    await config.database.query(
      "INSERT INTO administrative_users(id,email) VALUES($1,$2) ON CONFLICT(email) DO UPDATE SET active=true",
      [randomUUID(), email],
    );
  }
}
export function registerAccess(app: Express, config: PrivateConfig) {
  const { database, secret, origin, production } = config,
    cookieName = production ? "__Host-gh_session" : "gh_session";
  app.use(cookieParser());
  const originGuard: RequestHandler = (req, _res, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.get("origin") !== origin
    )
      return next(
        new HttpError(403, "Submit requests from the Give Holidays website."),
      );
    next();
  };
  app.use(
    ["/api/access", "/api/private", "/api/admin"],
    (_req, res, next) => {
      res.set({
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "Referrer-Policy": "no-referrer",
      });
      next();
    },
    originGuard,
  );
  app.use(
    "/api/access",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 20,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  async function actorFromRequest(req: Request): Promise<Actor | undefined> {
    const value = req.cookies?.[cookieName];
    if (typeof value !== "string" || value.length > 100) return;
    const row = (
      await database.query(
        "SELECT * FROM private_sessions WHERE id_hash=$1 AND revoked_at IS NULL AND expires_at>now()",
        [digest(value)],
      )
    ).rows[0];
    if (!row) return;
    if (row.role === "admin") {
      if (!config.adminEmails.includes(String(row.email))) return;
      if (
        !(
          await database.query(
            "SELECT id FROM administrative_users WHERE id=$1 AND active=true",
            [row.admin_id],
          )
        ).rows.length
      )
        return;
    } else {
      if (
        !(
          await database.query(
            "SELECT id FROM invitations WHERE id=$1 AND hotel_id=$2 AND revoked_at IS NULL AND consumed_at IS NOT NULL AND expires_at>now()",
            [row.invitation_id, row.hotel_id],
          )
        ).rows.length
      )
        return;
    }
    return {
      role: row.role as Actor["role"],
      email: String(row.email),
      adminId: row.admin_id ? String(row.admin_id) : undefined,
      hotelId: row.hotel_id ? String(row.hotel_id) : undefined,
      invitationId: row.invitation_id ? String(row.invitation_id) : undefined,
      sessionId: String(row.id_hash),
      csrf: String(row.csrf),
    };
  }
  const authenticate: RequestHandler = async (req, res, next) => {
    const actor = await actorFromRequest(req);
    if (!actor) return next(new HttpError(401, "Verified access is required."));
    res.locals.actor = actor;
    next();
  };
  const csrf: RequestHandler = (req, res, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      !safeEqual(req.get("x-csrf-token") || "", getActor(res).csrf)
    )
      return next(
        new HttpError(403, "Refresh the page before making this change."),
      );
    next();
  };
  const admin: RequestHandler = (_req, res, next) => {
    if (getActor(res).role !== "admin")
      return next(new HttpError(403, "Administrator access is required."));
    next();
  };
  const hotel: RequestHandler = (_req, res, next) => {
    if (getActor(res).role !== "hotel")
      return next(new HttpError(403, "Hotel invitation access is required."));
    next();
  };
  app.post("/api/access/admin-challenge", async (req, res) => {
    const email = z.email().max(254).safeParse(req.body?.email);
    if (!email.success)
      throw new HttpError(400, "Enter a valid business email.");
    const address = email.data.toLowerCase(),
      id = randomUUID();
    if (
      config.adminEmails.includes(address) &&
      (
        await database.query(
          "SELECT id FROM administrative_users WHERE email=$1 AND active=true",
          [address],
        )
      ).rows.length
    ) {
      const verificationCode = code();
      await database.transaction(async (q) => {
        await q(
          "INSERT INTO auth_challenges(id,email,role,code_hash,expires_at) VALUES($1,$2,$3,$4,now()+interval '10 minutes')",
          [
            id,
            address,
            "admin",
            keyedHash(`${id}:${verificationCode}`, secret),
          ],
        );
        await queueMail(
          q,
          {
            to: address,
            subject: "Give Holidays administrator verification",
            text: `Your verification code is ${verificationCode}. It expires in 10 minutes. If you did not request access, ignore this email.`,
          },
          secret,
        );
      });
    }
    res
      .status(202)
      .json({
        challengeId: id,
        message:
          "If this email is authorized, a verification code will be sent.",
      });
  });
  app.post("/api/access/invitation-challenge", async (req, res) => {
    const supplied = z
      .string()
      .regex(/^[A-Za-z0-9_-]{43}$/)
      .safeParse(req.body?.token);
    if (!supplied.success)
      throw new HttpError(400, "Check the invitation credential.");
    const id = randomUUID();
    await database.transaction(async (q) => {
      const invitation = (
        await q(
          "SELECT * FROM invitations WHERE token_hash=$1 AND revoked_at IS NULL AND consumed_at IS NULL AND expires_at>now() FOR UPDATE",
          [digest(supplied.data)],
        )
      ).rows[0];
      if (!invitation) return;
      const verificationCode = code();
      await q(
        "INSERT INTO auth_challenges(id,email,role,invitation_id,code_hash,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '10 minutes')",
        [
          id,
          invitation.email,
          "hotel",
          invitation.id,
          keyedHash(`${id}:${verificationCode}`, secret),
        ],
      );
      await queueMail(
        q,
        {
          to: String(invitation.email),
          subject: "Verify your Give Holidays invitation",
          text: `Your verification code is ${verificationCode}. It expires in 10 minutes and is valid only for the invitation you opened.`,
        },
        secret,
      );
    });
    res
      .status(202)
      .json({
        challengeId: id,
        message:
          "If the invitation is valid, a code will be sent to the approved business email.",
      });
  });
  app.post("/api/access/verify", async (req, res) => {
    const input = z
      .object({ challengeId: z.uuid(), code: z.string().regex(/^\d{6}$/) })
      .safeParse(req.body);
    if (!input.success)
      throw new HttpError(400, "Enter the six-digit verification code.");
    const sessionToken = token(),
      sessionCsrf = token();
    const result = await database.transaction(async (q) => {
      const challenge = (
        await q("SELECT * FROM auth_challenges WHERE id=$1 FOR UPDATE", [
          input.data.challengeId,
        ])
      ).rows[0];
      if (
        !challenge ||
        challenge.used_at ||
        Number(challenge.attempts) >= 5 ||
        new Date(String(challenge.expires_at)).getTime() <= Date.now()
      )
        return;
      await q("UPDATE auth_challenges SET attempts=attempts+1 WHERE id=$1", [
        challenge.id,
      ]);
      if (
        !safeEqual(
          String(challenge.code_hash),
          keyedHash(`${challenge.id}:${input.data.code}`, secret),
        )
      )
        return;
      let adminId: unknown = null,
        hotelId: unknown = null;
      if (challenge.role === "admin") {
        if (!config.adminEmails.includes(String(challenge.email))) return;
        adminId = (
          await q(
            "SELECT id FROM administrative_users WHERE email=$1 AND active=true",
            [challenge.email],
          )
        ).rows[0]?.id;
        if (!adminId) return;
      } else {
        const invitation = (
          await q(
            "SELECT * FROM invitations WHERE id=$1 AND revoked_at IS NULL AND consumed_at IS NULL AND expires_at>now() FOR UPDATE",
            [challenge.invitation_id],
          )
        ).rows[0];
        if (!invitation || invitation.email !== challenge.email) return;
        hotelId = invitation.hotel_id;
        await q("UPDATE invitations SET consumed_at=now() WHERE id=$1", [
          invitation.id,
        ]);
      }
      await q("UPDATE auth_challenges SET used_at=now() WHERE id=$1", [
        challenge.id,
      ]);
      await q(
        "INSERT INTO private_sessions(id_hash,role,email,admin_id,hotel_id,invitation_id,csrf,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,now()+interval '2 hours')",
        [
          digest(sessionToken),
          challenge.role,
          challenge.email,
          adminId,
          hotelId,
          challenge.invitation_id,
          sessionCsrf,
        ],
      );
      await q(
        "INSERT INTO audit_events(id,admin_id,action,record_id) VALUES($1,$2,$3,$4)",
        [
          randomUUID(),
          adminId,
          challenge.role === "admin"
            ? "administrator_verified"
            : "hotel_invitation_verified",
          String(adminId || challenge.invitation_id),
        ],
      );
      const old = req.cookies?.[cookieName];
      if (typeof old === "string")
        await q(
          "UPDATE private_sessions SET revoked_at=now() WHERE id_hash=$1",
          [digest(old)],
        );
      return { role: challenge.role };
    });
    if (!result)
      throw new HttpError(
        400,
        "The code or invitation is invalid, expired, already used, or revoked.",
      );
    res.cookie(cookieName, sessionToken, {
      httpOnly: true,
      secure: production,
      sameSite: "strict",
      path: "/",
      maxAge: 2 * 60 * 60 * 1000,
    });
    res.json({ role: result.role, csrf: sessionCsrf });
  });
  app.get("/api/private/me", authenticate, (_req, res) => {
    const actor = getActor(res);
    res.json({ role: actor.role, email: actor.email, csrf: actor.csrf });
  });
  app.post("/api/private/logout", authenticate, csrf, async (_req, res) => {
    await database.query(
      "UPDATE private_sessions SET revoked_at=now() WHERE id_hash=$1",
      [getActor(res).sessionId],
    );
    res.clearCookie(cookieName, {
      httpOnly: true,
      secure: production,
      sameSite: "strict",
      path: "/",
    });
    res.json({ signedOut: true });
  });
  return { authenticate, csrf, admin, hotel, actorFromRequest, originGuard };
}
export function safeAsync(
  handler: (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
