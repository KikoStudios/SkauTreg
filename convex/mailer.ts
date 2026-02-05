"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const getEnv = (key: string) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env: ${key}`);
  return value;
};

const toBase64Url = (input: string) =>
  Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

// Encode subject for RFC 2047 compliance
const encodeSubject = (subject: string) => {
  // Check if subject contains non-ASCII characters
  if (/[^\x00-\x7F]/.test(subject)) {
    return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
  }
  return subject;
};

// Get access token from troop's OAuth refresh token
async function getGmailAccessToken(troopRefreshToken?: string) {
  const clientId = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = troopRefreshToken;

  if (!clientId) throw new Error(`Missing env: NEXT_PUBLIC_GMAIL_CLIENT_ID`);
  if (!clientSecret) throw new Error(`Missing env: GMAIL_CLIENT_SECRET`);
  if (!refreshToken) throw new Error(`Troop must have Gmail OAuth configured. Please connect Gmail in settings.`);

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gmail token error: ${errText}`);
  }

  const data = await resp.json();
  if (!data.access_token) throw new Error("Missing access token");
  return data.access_token as string;
}

async function sendGmailMessage(params: {
  accessToken: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  // Generate unique Message-ID to look more legitimate
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const domain = params.from.match(/@([^>]+)>?$/)?.[1] || "skautreg.app";
  const messageId = `<${timestamp}.${randomId}@${domain}>`;
  
  // Create plain text version (important for avoiding promotions)
  const plainText = params.html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
  
  // Boundary for multipart message
  const boundary = `----=_Part_${randomId}`;
  
  const headers = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${encodeSubject(params.subject)}`,
    params.replyTo ? `Reply-To: ${params.replyTo}` : null,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "X-Priority: 3",
    "X-Mailer: SkautREG",
  ].filter(Boolean) as string[];

  // Build multipart body with both plain text and HTML
  const bodyParts = [
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: quoted-printable",
    "",
    plainText.split("\n").map(line => {
      return line.replace(/[^\x00-\x7F]/g, (char) => {
        return char
          .split("")
          .map(c => "=" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"))
          .join("");
      });
    }).join("\r\n"),
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: quoted-printable",
    "",
    params.html.split("\n").map(line => {
      return line.replace(/[^\x00-\x7F]/g, (char) => {
        return char
          .split("")
          .map(c => "=" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"))
          .join("");
      });
    }).join("\r\n"),
    "",
    `--${boundary}--`,
  ].join("\r\n");

  const rawMessage = `${headers.join("\r\n")}\r\n\r\n${bodyParts}`;
  const raw = toBase64Url(rawMessage);

  const resp = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gmail send error: ${errText}`);
  }
}

export const sendTripEmail = action({
  args: {
    tripId: v.id("trips"),
    subject: v.string(),
    body: v.string(),
    baseUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ sentCount: number; skippedCount: number; failed: Array<{ email: string; error: string }>; total: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.runQuery(api.users.viewer, {});
    if (!user) throw new Error("User not found");

    const dashboard: any = await ctx.runQuery(api.trips.getDashboard, { tripId: args.tripId });
    if (!dashboard) throw new Error("Trip not found");

    const troop = await ctx.runQuery(api.troops.getById, { id: dashboard.trip.troopId });
    if (!troop) throw new Error("Troop not found");

    const leaders = await ctx.runQuery(api.troops.getLeaders, { troopId: dashboard.trip.troopId });
    const canSend = leaders?.some((l: any) => l?._id === user._id && (l.role === "owner" || l.role === "main_leader"));
    if (!canSend) throw new Error("Nemáte oprávnění rozesílat emaily.");

    // Use troop's OAuth if available, otherwise fallback to global
    const troopRefreshToken = (troop as any).gmailOAuth?.refreshToken;
    const senderEmail = (troop as any).gmailOAuth?.email;
    
    if (!troopRefreshToken) {
      throw new Error("Gmail není připojen. Připojte Gmail v Nastavení → Emaily.");
    }
    
    if (!senderEmail) {
      throw new Error("Gmail email není nastaven. Zkuste znovu připojit Gmail.");
    }
    
    const fromName = troop.name || "SkautREG";
    const replyTo = troop.infoEmail || troop.contactEmail || undefined;

    const accessToken = await getGmailAccessToken(troopRefreshToken);
    const baseUrl = args.baseUrl.replace(/\/$/, "");

    let sentCount = 0;
    let skippedCount = 0;
    const failed: Array<{ email: string; error: string }> = [];

    for (const p of dashboard.participants) {
      const email = p.member?.email;
      if (!email) {
        skippedCount++;
        continue;
      }

      const userLink = `${baseUrl}/rsvp/${p.accessKey}`;
      const memberName = p.member?.name || "";
      
      // Replace smart tags - no @userlink support
      let html = args.body
        .replace(/<user\.sign\.link>/g, userLink)
        .replace(/<user\.name>/g, memberName)
        .replace(/\n/g, "<br/>");

      try {
        await sendGmailMessage({
          accessToken,
          from: `${fromName} <${senderEmail}>`,
          to: email,
          subject: args.subject,
          html,
          replyTo,
        });
        sentCount++;
      } catch (err: any) {
        failed.push({ email, error: err?.message || "Failed" });
      }
    }

    return {
      sentCount,
      skippedCount,
      failed,
      total: dashboard.participants.length,
    };
  },
});

// Send email from draft with enhanced smart tags
export const sendFromDraft = action({
  args: {
    draftId: v.id("email_drafts"),
    baseUrl: v.string(),
    memberIds: v.optional(v.array(v.id("members"))),
  },
  handler: async (ctx, args): Promise<{ 
    sentCount: number; 
    skippedCount: number; 
    failed: Array<{ email: string; error: string }>; 
    total: number 
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.runQuery(api.users.viewer, {});
    if (!user) throw new Error("User not found");

    const draft: any = await ctx.runQuery(api.emailDrafts.getById, { id: args.draftId });
    if (!draft) throw new Error("Draft not found");

    const trip: any = await ctx.runQuery(api.trips.getDashboard, { tripId: draft.tripId });
    if (!trip) throw new Error("Trip not found");

    const troop = await ctx.runQuery(api.troops.getById, { id: trip.trip.troopId });
    if (!troop) throw new Error("Troop not found");

    // Check permissions - only main_leader or owner can send
    const leaders = await ctx.runQuery(api.troops.getLeaders, { troopId: trip.trip.troopId });
    const canSend = leaders?.some((l: any) => 
      l?._id === user._id && (l.role === "owner" || l.role === "main_leader")
    );
    
    if (!canSend) {
      throw new Error("Pouze vedoucí může odesílat e-maily.");
    }

    // Use troop's OAuth only
    const troopGmail = (troop as any).gmailOAuth;
    const troopRefreshToken = troopGmail?.refreshToken;
    const senderEmail = troopGmail?.email;
    if (!troopRefreshToken || !senderEmail) {
      throw new Error("Gmail není připojen. Připojte Gmail v nastavení jednotky.");
    }
    const fromName = troop.name || process.env.GMAIL_FROM_NAME || "SkautREG";
    const replyTo = troop.infoEmail || troop.contactEmail || undefined;

    const accessToken = await getGmailAccessToken(troopRefreshToken);
    const baseUrl = args.baseUrl.replace(/\/$/, "");

    let sentCount = 0;
    let skippedCount = 0;
    const failed: Array<{ email: string; error: string }> = [];

    // Filter participants by selected memberIds if provided
    const selectedMemberIds = args.memberIds ? new Set(args.memberIds) : null;
    const participantsToSend = selectedMemberIds 
      ? trip.participants.filter((p: any) => selectedMemberIds.has(p.member?._id))
      : trip.participants;

    for (const p of participantsToSend) {
      const email = p.member?.email;
      if (!email) {
        skippedCount++;
        continue;
      }

      const userLink = `${baseUrl}/rsvp/${p.accessKey}`;
      const memberName = p.member?.name || "";
      
      // Replace smart tags
      let bodyText = draft.body
        .replace(/<user\.sign\.link>/g, userLink)
        .replace(/<user\.name>/g, memberName);
      
      // Create simple, personal HTML (avoid promotional styling)
      let html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333; max-width: 600px; margin: 0; padding: 20px;">
${bodyText.replace(/\n/g, "<br/>")}
</body>
</html>`;

      try {
        await sendGmailMessage({
          accessToken,
          from: `${fromName} <${senderEmail}>`,
          to: email,
          subject: draft.subject,
          html,
          replyTo,
        });
        sentCount++;
      } catch (err: any) {
        failed.push({ email, error: err?.message || "Failed" });
      }
    }

    // Mark draft as sent
    await ctx.runMutation(api.emailDrafts.markAsSent, {
      id: args.draftId,
      recipientCount: sentCount,
    });

    return {
      sentCount,
      skippedCount,
      failed,
      total: trip.participants.length,
    };
  },
});
