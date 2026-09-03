"use node";

import { randomBytes } from "node:crypto";
import { ConvexError, v } from "convex/values";
import nodemailer from "nodemailer";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { normalizeMemberContactFields } from "./lib/memberEmails";

type ContactKind = "member" | "guardian" | "guardian2";
type DeliveryTarget = { memberId: Id<"members">; contactKind: ContactKind; email: string };
type PreparedTarget = DeliveryTarget & { memberName: string; capabilityKey: string | null };

const toBase64Url = (input: string) => Buffer.from(input, "utf8").toString("base64url");
const toBase64 = (input: string) => Buffer.from(input, "utf8").toString("base64");
const GMAIL_SMTP_HOST = "smtp.gmail.com";
const GMAIL_SMTP_PORT = 465;

const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const appOrigin = () => {
  const value = process.env.APP_ORIGIN?.replace(/\/$/, "");
  if (!value || !/^https:\/\//.test(value)) {
    throw new ConvexError({ code: "APP_ORIGIN_NOT_CONFIGURED", message: "Adresa aplikace není nakonfigurována." });
  }
  return value;
};

const activeCapabilityKey = (participation: { secureAccessKey?: string; accessKey: string; legacyAccessExpiresAt?: string }) => {
  if (participation.secureAccessKey) return participation.secureAccessKey;
  const expires = participation.legacyAccessExpiresAt ? Date.parse(participation.legacyAccessExpiresAt) : Number.NaN;
  return Number.isFinite(expires) && expires >= Date.now() ? participation.accessKey : null;
};

const deliveryTargets = (member: Record<string, unknown> | null | undefined): DeliveryTarget[] => {
  if (!member?._id) return [];
  const normalized = normalizeMemberContactFields(member);
  const candidates: Array<{ contactKind: ContactKind; email: unknown }> = [
    { contactKind: "member", email: normalized.email },
    { contactKind: "guardian", email: normalized.guardianEmail },
    { contactKind: "guardian2", email: normalized.guardian2Email },
  ];
  const seen = new Set<string>();
  return candidates.flatMap(({ contactKind, email }) => {
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!normalizedEmail || normalizedEmail.length > 254 || seen.has(normalizedEmail)) return [];
    seen.add(normalizedEmail);
    return [{ memberId: member._id as Id<"members">, contactKind, email: normalizedEmail }];
  });
};

const errorCode = (error: unknown, fallback: string) =>
  error instanceof ConvexError && typeof error.data === "object" && error.data && "code" in error.data
    ? String(error.data.code)
    : fallback;

const normalizeAppPassword = (value: string) => value.replace(/\s/g, "");

const createGmailSmtpTransport = (email: string, appPassword: string) => nodemailer.createTransport({
  host: GMAIL_SMTP_HOST,
  port: GMAIL_SMTP_PORT,
  secure: true,
  auth: { user: email, pass: appPassword },
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 20_000,
});

const gmailSmtpError = (error: unknown) => {
  const smtpError = error as { code?: string; responseCode?: number };
  if (smtpError.code === "EAUTH" || smtpError.responseCode === 534 || smtpError.responseCode === 535) {
    return new ConvexError({
      code: "GMAIL_SMTP_AUTH_FAILED",
      message: "Google odmítl e-mail nebo heslo aplikace. Vygenerujte nové heslo aplikace a připojení obnovte.",
    });
  }
  if (["ETIMEDOUT", "ECONNECTION", "ECONNRESET", "ESOCKET", "EDNS"].includes(smtpError.code ?? "") || (smtpError.responseCode ?? 0) >= 400 && (smtpError.responseCode ?? 0) < 500) {
    return new ConvexError({ code: "GMAIL_TEMPORARILY_UNAVAILABLE", message: "Gmail SMTP je dočasně nedostupný. Zkuste to později." });
  }
  return new ConvexError({ code: "GMAIL_DELIVERY_FAILED", message: "Gmail zprávu přes SMTP nepřijal." });
};

async function getGmailAccessToken(refreshToken?: string) {
  const clientId = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new ConvexError({ code: "GMAIL_NOT_CONFIGURED", message: "Gmail není na serveru nakonfigurován." });
  }
  if (!refreshToken) {
    throw new ConvexError({ code: "GMAIL_RECONNECT_REQUIRED", message: "Gmail není připojen nebo vyžaduje nové přihlášení." });
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }).toString(),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (result.error === "invalid_grant" || response.status === 401) {
      throw new ConvexError({ code: "GMAIL_RECONNECT_REQUIRED", message: "Připojení ke Gmailu vypršelo nebo bylo odvoláno." });
    }
    throw new ConvexError({ code: "GMAIL_TEMPORARILY_UNAVAILABLE", message: "Google nyní nevydal přístupový token." });
  }
  const result = await response.json() as { access_token?: string };
  if (!result.access_token) {
    throw new ConvexError({ code: "GMAIL_RECONNECT_REQUIRED", message: "Google nevrátil přístupový token." });
  }
  return result.access_token;
}

function encodeSubject(subject: string) {
  return /[^\x00-\x7F]/.test(subject)
    ? `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`
    : subject;
}

async function sendGmailMessage(params: {
  accessToken: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  const randomId = randomBytes(12).toString("hex");
  const domain = params.from.match(/@([^>]+)>?$/)?.[1] || "skautreg.app";
  const boundary = `----=_Part_${randomId}`;
  const plainText = params.html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
  const headers = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${encodeSubject(params.subject)}`,
    params.replyTo ? `Reply-To: ${params.replyTo}` : null,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${Date.now()}.${randomId}@${domain}>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "X-Mailer: SkauTreg",
  ].filter(Boolean) as string[];
  const mime = `${headers.join("\r\n")}\r\n\r\n--${boundary}\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${toBase64(plainText)}\r\n\r\n--${boundary}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${toBase64(params.html)}\r\n\r\n--${boundary}--\r\n`;
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${params.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: toBase64Url(mime) }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    if (response.status === 401) throw new ConvexError({ code: "GMAIL_RECONNECT_REQUIRED", message: "Google připojení bylo odvoláno." });
    if (response.status === 429) throw new ConvexError({ code: "RATE_LIMITED", message: "Google dočasně omezil odesílání." });
    throw new ConvexError({
      code: response.status >= 500 ? "GMAIL_TEMPORARILY_UNAVAILABLE" : "GMAIL_DELIVERY_FAILED",
      message: "Google zprávu nepřijal.",
    });
  }
  const result = await response.json().catch(() => ({})) as { id?: string };
  return result.id;
}

async function sendGmailSmtpMessage(params: {
  transport: ReturnType<typeof createGmailSmtpTransport>;
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  try {
    const result = await params.transport.sendMail({
      from: { name: params.fromName, address: params.fromEmail },
      to: params.to,
      subject: params.subject,
      text: params.html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim(),
      html: params.html,
      replyTo: params.replyTo,
      headers: { "X-Mailer": "SkauTreg" },
    });
    return result.messageId;
  } catch (error) {
    throw gmailSmtpError(error);
  }
}

export const connectGmailSmtp = action({
  args: {
    troopId: v.id("troops"),
    email: v.string(),
    appPassword: v.string(),
  },
  handler: async (ctx, args): Promise<{ email: string }> => {
    if (!await ctx.auth.getUserIdentity()) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "Pro připojení Gmailu se musíte přihlásit." });
    }
    const role = await ctx.runQuery(api.troops.getMyRole, { troopId: args.troopId });
    if (role !== "owner" && role !== "main_leader") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Gmail může připojit pouze majitel nebo hlavní vedoucí." });
    }
    const email = args.email.trim().toLowerCase();
    const appPassword = normalizeAppPassword(args.appPassword);
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Zadejte platnou e-mailovou adresu Google účtu." });
    }
    if (!/^[a-zA-Z0-9]{16}$/.test(appPassword)) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Heslo aplikace Google musí mít 16 znaků." });
    }

    const transport = createGmailSmtpTransport(email, appPassword);
    try {
      await transport.verify();
    } catch (error) {
      throw gmailSmtpError(error);
    } finally {
      transport.close();
    }

    await ctx.runMutation(internal.troops.storeGmailSmtp, {
      troopId: args.troopId,
      email,
      appPassword,
    });
    return { email };
  },
});

export const sendFromDraft = action({
  args: {
    draftId: v.id("email_drafts"),
    memberIds: v.optional(v.array(v.id("members"))),
    idempotencyKey: v.string(),
    retryAttemptId: v.optional(v.id("email_send_attempts")),
  },
  handler: async (ctx, args): Promise<{
    attemptId: Id<"email_send_attempts">;
    status: "sent" | "partial" | "failed";
    sentCount: number;
    skippedCount: number;
    failed: Array<{ memberId: Id<"members">; contactKind: ContactKind; errorCode: string }>;
    total: number;
  }> => {
    try {
      await ctx.runMutation(api.rateLimits.consume, { operation: "email_send" });
      if (!await ctx.auth.getUserIdentity()) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Pro odeslání se musíte přihlásit." });
      const user = await ctx.runQuery(api.users.viewer, {});
      if (!user) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Uživatelský profil nebyl nalezen." });
      const draft = await ctx.runQuery(api.emailDrafts.getById, { id: args.draftId });
      if (!draft) throw new ConvexError({ code: "NOT_FOUND", message: "Koncept nebyl nalezen." });
      const trip = await ctx.runQuery(api.trips.getDashboard, { tripId: draft.tripId });
      if (!trip) throw new ConvexError({ code: "NOT_FOUND", message: "Výprava nebyla nalezena." });
      const troop = await ctx.runQuery(internal.troops.getEmailConfiguration, { troopId: trip.trip.troopId });
      if (!troop) throw new ConvexError({ code: "NOT_FOUND", message: "Oddíl nebyl nalezen." });

      const provider = troop.emailProvider;
      const legacy = troop.gmailOAuth;
      if (provider?.requiresReconnect) throw new ConvexError({ code: "GMAIL_RECONNECT_REQUIRED", message: "Gmail je potřeba znovu připojit." });
      const usesSmtp = provider?.provider === "gmail-smtp";
      const usesOAuth = provider?.provider === "gmail" || Boolean(legacy);
      if (!usesSmtp && !usesOAuth) throw new ConvexError({ code: "GMAIL_RECONNECT_REQUIRED", message: "Gmail není připojen." });
      const senderEmail = provider?.email || legacy?.email;
      const refreshToken = provider?.refreshToken || legacy?.refreshToken;
      const smtpPassword = provider?.smtpPassword;
      if (!senderEmail || (usesSmtp ? !smtpPassword : !refreshToken)) {
        throw new ConvexError({ code: "GMAIL_RECONNECT_REQUIRED", message: "Gmail není připojen." });
      }

      const recipients = await ctx.runQuery(internal.emailDrafts.listRecipientsForSend, { tripId: draft.tripId });
      const selected = args.memberIds ? new Set(args.memberIds) : null;
      const participantRows = selected ? recipients.filter((row) => row.member && selected.has(row.member._id)) : recipients;
      let prepared: PreparedTarget[] = participantRows.flatMap((row) => {
        const member = normalizeMemberContactFields(row.member);
        return deliveryTargets(member).map((target) => ({
          ...target,
          memberName: typeof member?.name === "string" ? member.name : "",
          capabilityKey: activeCapabilityKey(row.participation),
        }));
      });
      const skippedCount = participantRows.filter((row) => deliveryTargets(row.member).length === 0).length;

      if (args.retryAttemptId) {
        const retryTargets = await ctx.runQuery(internal.emailDelivery.getRetryTargets, { attemptId: args.retryAttemptId, draftId: args.draftId });
        const allowed = new Set(retryTargets.map((target) => `${target.memberId}:${target.contactKind}`));
        prepared = prepared.filter((target) => allowed.has(`${target.memberId}:${target.contactKind}`));
      }
      if (prepared.length === 0) throw new ConvexError({ code: "VALIDATION_ERROR", message: "Nejsou vybráni žádní příjemci k odeslání." });
      if (!/^[a-zA-Z0-9_-]{16,128}$/.test(args.idempotencyKey)) throw new ConvexError({ code: "VALIDATION_ERROR", message: "Neplatný identifikátor odeslání." });

      const started = await ctx.runMutation(internal.emailDelivery.startAttempt, {
        draftId: args.draftId,
        tripId: draft.tripId,
        requestedBy: user._id,
        idempotencyKey: args.idempotencyKey,
        recipientCount: prepared.length,
        retryOfAttemptId: args.retryAttemptId,
      });
      if (!started.created) {
        const existing = started.attempt;
        if (existing.status === "sent" || existing.status === "partial" || existing.status === "failed") {
          return { attemptId: existing._id, status: existing.status, sentCount: existing.sentCount, skippedCount: 0, failed: [], total: existing.recipientCount };
        }
        throw new ConvexError({ code: "EMAIL_SEND_IN_PROGRESS", message: "Toto odeslání již probíhá." });
      }
      const attempt = started.attempt;
      if (!attempt) throw new ConvexError({ code: "EMAIL_ATTEMPT_FAILED", message: "Pokus o odeslání se nepodařilo založit." });
      await ctx.runMutation(internal.emailDelivery.initializeDeliveries, { attemptId: attempt._id, targets: prepared.map(({ memberId, contactKind }) => ({ memberId, contactKind })) });

      let accessToken: string | undefined;
      const smtpTransport = usesSmtp ? createGmailSmtpTransport(senderEmail, smtpPassword as string) : undefined;
      if (!usesSmtp) {
        try {
          accessToken = await getGmailAccessToken(refreshToken);
        } catch (error) {
          const code = errorCode(error, "GMAIL_TEMPORARILY_UNAVAILABLE");
          if (code === "GMAIL_RECONNECT_REQUIRED") await ctx.runMutation(internal.troops.markGmailReconnectRequired, { troopId: trip.trip.troopId });
          for (const target of prepared) {
            await ctx.runMutation(internal.emailDelivery.recordDelivery, { attemptId: attempt._id, memberId: target.memberId, contactKind: target.contactKind, status: "failed", errorCode: code });
          }
          await ctx.runMutation(internal.emailDelivery.completeAttempt, { attemptId: attempt._id, sentCount: 0, failedCount: prepared.length });
          throw error;
        }
      }

      const fromName = (troop.name || process.env.GMAIL_FROM_NAME || "SkauTreg").replace(/[\r\n]/g, " ");
      const replyToCandidate = troop.infoEmail || troop.contactEmail;
      const replyTo = replyToCandidate && /^\S+@\S+\.\S+$/.test(replyToCandidate) ? replyToCandidate : undefined;
      const origin = appOrigin();
      const results: Array<{ memberId: Id<"members">; contactKind: ContactKind; sent: boolean; errorCode?: string }> = [];
      for (let offset = 0; offset < prepared.length; offset += 4) {
        const batch = prepared.slice(offset, offset + 4);
        results.push(...await Promise.all(batch.map(async (target) => {
          if (!target.capabilityKey) {
            await ctx.runMutation(internal.emailDelivery.recordDelivery, { attemptId: attempt._id, memberId: target.memberId, contactKind: target.contactKind, status: "failed", errorCode: "MISSING_CAPABILITY_KEY" });
            return { memberId: target.memberId, contactKind: target.contactKind, sent: false, errorCode: "MISSING_CAPABILITY_KEY" };
          }
          const link = `${origin}/rsvp/${target.capabilityKey}`;
          const bodyText = escapeHtml(draft.body)
            .replace(/&lt;user\.sign\.link&gt;/g, escapeHtml(link))
            .replace(/@userlink/g, escapeHtml(link))
            .replace(/&lt;user\.name&gt;/g, escapeHtml(target.memberName));
          const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#333;max-width:600px;margin:0;padding:20px">${bodyText.replace(/\n/g, "<br/>")}</body></html>`;
          try {
            const providerMessageId = smtpTransport
              ? await sendGmailSmtpMessage({ transport: smtpTransport, fromName, fromEmail: senderEmail, to: target.email, subject: draft.subject, html, replyTo })
              : await sendGmailMessage({ accessToken: accessToken as string, from: `${fromName} <${senderEmail}>`, to: target.email, subject: draft.subject, html, replyTo });
            await ctx.runMutation(internal.emailDelivery.recordDelivery, { attemptId: attempt._id, memberId: target.memberId, contactKind: target.contactKind, status: "sent", providerMessageId });
            return { memberId: target.memberId, contactKind: target.contactKind, sent: true };
          } catch (error) {
            const code = errorCode(error, "GMAIL_DELIVERY_FAILED");
            await ctx.runMutation(internal.emailDelivery.recordDelivery, { attemptId: attempt._id, memberId: target.memberId, contactKind: target.contactKind, status: "failed", errorCode: code });
            return { memberId: target.memberId, contactKind: target.contactKind, sent: false, errorCode: code };
          }
        })));
      }

      const sentCount = results.filter((result) => result.sent).length;
      const failed = results.filter((result): result is typeof result & { errorCode: string } => !result.sent && Boolean(result.errorCode));
      smtpTransport?.close();
      if (failed.some((result) => ["GMAIL_RECONNECT_REQUIRED", "GMAIL_SMTP_AUTH_FAILED"].includes(result.errorCode))) {
        await ctx.runMutation(internal.troops.markGmailReconnectRequired, { troopId: trip.trip.troopId });
      }
      await ctx.runMutation(internal.emailDelivery.completeAttempt, { attemptId: attempt._id, sentCount, failedCount: failed.length });
      if (failed.length === 0 && sentCount > 0) await ctx.runMutation(api.emailDrafts.markAsSent, { id: args.draftId, recipientCount: sentCount });
      return {
        attemptId: attempt._id,
        status: failed.length === 0 ? "sent" : sentCount > 0 ? "partial" : "failed",
        sentCount,
        skippedCount,
        failed: failed.map(({ memberId, contactKind, errorCode: code }) => ({ memberId, contactKind, errorCode: code })),
        total: prepared.length,
      };
    } catch (error) {
      console.error("Email send failed", { operation: "email_send", code: errorCode(error, "EMAIL_SEND_FAILED") });
      if (error instanceof ConvexError) throw error;
      throw new ConvexError({ code: "EMAIL_SEND_FAILED", message: "Odeslání se nepodařilo. Zkuste to později." });
    }
  },
});
