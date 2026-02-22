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

  if (!clientId) throw new Error(`⚙️ Chyba serveru: Gmail je špatně nakonfigurován. Kontaktujte správce aplikace.`);
  if (!clientSecret) throw new Error(`⚙️ Chyba serveru: Gmail je špatně nakonfigurován. Kontaktujte správce aplikace.`);
  if (!refreshToken) throw new Error(`📧 Gmail účet není připojen. Pro odesílání e-mailů je potřeba připojit Gmail účet. Přejít na nastavení?`);

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
    throw new Error(`❌ Nelze se připojit ke Gmailu. Pokus se znovu připojit v nastavení. Pokud problém přetrvává, odpojte a připojte znovu.`);
  }

  const data = await resp.json();
  if (!data.access_token) throw new Error("❌ Gmail token chyba. Zkuste znovu připojit Gmail.");
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
  const body = `${headers.join("\r\n")}\r\n\r\n--${boundary}\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${toBase64Url(
    plainText
  )}\r\n\r\n--${boundary}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${toBase64Url(
    params.html
  )}\r\n\r\n--${boundary}--\r\n`;

  const encodedMessage = toBase64Url(body);

  const gmailResp = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: encodedMessage,
    }),
  });

  if (!gmailResp.ok) {
    const errText = await gmailResp.text();
    throw new Error(`📤 Odeslání e-mailu selhalo. Zkuste znovu nebo kontaktujte podporu.`);
  }

  return true;
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

// Save email to IMAP Sent folder (so it appears in email client)
async function saveToImapSent(params: {
  imapHost: string;
  imapPort: number;
  email: string;
  password: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  try {
    const { ImapFlow } = require("imapflow");
    
    const client = new ImapFlow({
      host: params.imapHost,
      port: params.imapPort,
      secure: true,
      auth: {
        user: params.email,
        pass: params.password,
      },
      logger: false,
    });

    await client.connect();

    try {
      // Find Sent folder (different names for different providers)
      const sentFolderNames = ['Sent', 'Odeslaná pošta', 'Odoslané', 'INBOX.Sent'];
      let sentFolder = 'Sent';

      const mailboxes = await client.list();
      for (const folderName of sentFolderNames) {
        const found = mailboxes.find((mb: any) => 
          mb.path === folderName || 
          mb.name === folderName ||
          mb.path.toLowerCase().includes('sent') ||
          mb.path.toLowerCase().includes('odeslan')
        );
        if (found) {
          sentFolder = found.path;
          break;
        }
      }

      // Build RFC822 message
      const boundary = '----=_Part_' + Date.now();
      const date = new Date().toUTCString();
      
      let message = '';
      message += `From: ${params.from}\r\n`;
      message += `To: ${params.to}\r\n`;
      message += `Subject: ${params.subject}\r\n`;
      message += `Date: ${date}\r\n`;
      message += `MIME-Version: 1.0\r\n`;
      message += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`;
      message += `X-Mailer: SkautREG\r\n`;
      message += `\r\n`;
      
      // Text part
      message += `--${boundary}\r\n`;
      message += `Content-Type: text/plain; charset=UTF-8\r\n`;
      message += `\r\n`;
      message += `${params.text || 'Tento e-mail obsahuje HTML obsah.'}\r\n`;
      message += `\r\n`;
      
      // HTML part
      message += `--${boundary}\r\n`;
      message += `Content-Type: text/html; charset=UTF-8\r\n`;
      message += `\r\n`;
      message += `${params.html}\r\n`;
      message += `\r\n`;
      
      message += `--${boundary}--\r\n`;

      // Append to sent folder with \Seen flag
      await client.append(sentFolder, message, ['\\Seen'], new Date());
    } finally {
      await client.logout();
    }
  } catch (error: any) {
    // Don't fail the whole operation if IMAP save fails
    console.warn(`Failed to save to Sent folder: ${error?.message}`);
  }
}

// Send via SMTP (Seznam, Centrum, etc.)
async function sendSmtpMessage(params: {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  // Optional IMAP params to save to Sent folder
  imapHost?: string;
  imapPort?: number;
}) {
  try {
    // Using require for Node.js environment
    const nodemailer = require("nodemailer");
    
    const transporter = nodemailer.createTransport({
      host: params.smtpHost,
      port: params.smtpPort,
      secure: params.smtpPort === 465,
      auth: {
        user: params.smtpUser,
        pass: params.smtpPassword,
      },
    });

    const mailOptions = {
      from: params.from,
      to: params.to,
      subject: encodeSubject(params.subject),
      html: params.html,
      replyTo: params.replyTo,
      headers: {
        "X-Mailer": "SkautREG",
      },
    };

    await transporter.sendMail(mailOptions);

    // Automatically save to IMAP Sent folder (runs in background, doesn't block)
    if (params.imapHost && params.imapPort) {
      // Fire and forget - don't wait for IMAP save to complete
      saveToImapSent({
        imapHost: params.imapHost,
        imapPort: params.imapPort,
        email: params.smtpUser,
        password: params.smtpPassword,
        from: params.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }).catch((error) => {
        // Log but don't fail - email was already sent successfully
        console.warn(`IMAP Sent folder save failed (email was sent): ${error?.message}`);
      });
    }
  } catch (error: any) {
    throw new Error(`SMTP Error: ${error?.message || "Failed to send email"}`);
  }
}

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
    total: number;
    error?: string;
  }> => {
    try {
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

      // Check permissions - vedoucí (normal leader) and main_leader can send
      const leaders = await ctx.runQuery(api.troops.getLeaders, { troopId: trip.trip.troopId });
      const canSend = leaders?.some((l: any) => 
        l?._id === user._id && (l.role === "owner" || l.role === "main_leader" || l.role === "vedouci")
      );
      
      if (!canSend) {
        return {
          sentCount: 0,
          skippedCount: 0,
          failed: [],
          total: 0,
          error: "Pouze vedoucí mohou odesílat e-maily. Kontaktujte vedoucího jednotky.",
        };
      }

      // Use troop's email provider (new format or legacy Gmail)
      const emailProvider = (troop as any).emailProvider;
      const troopGmail = (troop as any).gmailOAuth;
      
      // Determine which provider to use
      let accessToken: string | null = null;
      let smtpConfig: any = null;
      
      if (emailProvider?.provider === "gmail" || (!emailProvider && troopGmail)) {
        // Gmail OAuth
        const troopRefreshToken = emailProvider?.refreshToken || troopGmail?.refreshToken;
        const senderEmail = emailProvider?.email || troopGmail?.email;
        if (!troopRefreshToken || !senderEmail) {
          throw new Error("Gmail není připojen. Připojte Gmail v nastavení jednotky.");
        }
        accessToken = await getGmailAccessToken(troopRefreshToken);
      } else if (emailProvider?.provider === "seznam" || emailProvider?.provider === "centrum") {
        // SMTP
        if (!emailProvider?.smtpHost || !emailProvider?.smtpPort || !emailProvider?.smtpPassword) {
          throw new Error("SMTP není správně nakonfigurován. Zkontrolujte nastavení e-mailu.");
        }
        smtpConfig = {
          smtpHost: emailProvider.smtpHost,
          smtpPort: emailProvider.smtpPort,
          smtpUser: emailProvider.email,
          smtpPassword: emailProvider.smtpPassword,
          // Add IMAP params for saving to Sent folder
          imapHost: emailProvider.provider === "seznam" ? "imap.seznam.cz" : "imap.centrum.cz",
          imapPort: 993,
        };
      } else if (emailProvider?.provider === "google-groups") {
        // Google Groups - use first member's email or fallback to Gmail
        const troopRefreshToken = emailProvider?.refreshToken || troopGmail?.refreshToken;
        const senderEmail = emailProvider?.email || troopGmail?.email;
        if (!troopRefreshToken || !senderEmail) {
          throw new Error("Google Groups není správně připojen.");
        }
        accessToken = await getGmailAccessToken(troopRefreshToken);
      } else {
        throw new Error("Žádný e-mailový provider není připojen. Připojte e-mail v nastavení jednotky.");
      }
      
      const fromName = troop.name || process.env.GMAIL_FROM_NAME || "SkautREG";
      const replyTo = troop.infoEmail || troop.contactEmail || undefined;
      const senderEmail = emailProvider?.email || troopGmail?.email;
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
          if (accessToken) {
            // Use Gmail
            await sendGmailMessage({
              accessToken,
              from: `${fromName} <${senderEmail}>`,
              to: email,
              subject: draft.subject,
              html,
              replyTo,
            });
          } else if (smtpConfig) {
            // Use SMTP
            await sendSmtpMessage({
              ...smtpConfig,
              from: `${fromName} <${senderEmail}>`,
              to: email,
              subject: draft.subject,
              html,
              replyTo,
            });
          }
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
    } catch (err: any) {
      console.error("mailer:sendFromDraft failed", {
        draftId: args.draftId,
        baseUrl: args.baseUrl,
        hasClientId: Boolean(process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID),
        hasClientSecret: Boolean(process.env.GMAIL_CLIENT_SECRET),
        error: err?.message || err,
      });
      const message = err?.message || "Unknown error";
      throw new Error(`[mailer:sendFromDraft] ${message}`);
    }
  },
});
// Fetch Google Groups members via Google Admin API
export const fetchGoogleGroupsMembers = action({
  args: {
    groupEmail: v.string(), // e.g., "group-name@googlegroups.com"
    accessToken: v.string(), // Gmail access token with admin scope
  },
  handler: async (ctx, args): Promise<Array<{ email: string; name?: string }>> => {
    try {
      // Use Google Directory API to list group members
      const response = await fetch(
        `https://www.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(args.groupEmail)}/members`,
        {
          headers: {
            Authorization: `Bearer ${args.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Google API Error: ${error?.error?.message || "Failed to fetch group members"}`);
      }

      const data = await response.json();
      const members = (data.members || []).map((m: any) => ({
        email: m.email,
        name: m.givenName && m.familyName 
          ? `${m.givenName} ${m.familyName}` 
          : m.name || m.email,
      }));

      return members;
    } catch (error: any) {
      throw new Error(`Failed to fetch Google Groups members: ${error?.message || "Unknown error"}`);
    }
  },
});

// Test email connection (SMTP/IMAP) from UI
export const testEmailConnection = action({
  args: {
    provider: v.string(), // "seznam" | "centrum"
    email: v.string(),
    password: v.string(),
    testRecipient: v.optional(v.string()), // Optional: send test email to this address
  },
  handler: async (ctx, args): Promise<{ 
    smtp: { success: boolean; error?: string };
    imap: { success: boolean; error?: string };
    testEmail?: { success: boolean; error?: string };
  }> => {
    const results: any = {
      smtp: { success: false },
      imap: { success: false },
    };

    // Provider configs
    const providers: any = {
      seznam: {
        smtp: { host: 'smtp.seznam.cz', port: 465 },
        imap: { host: 'imap.seznam.cz', port: 993 },
      },
      centrum: {
        smtp: { host: 'smtp.centrum.cz', port: 465 },
        imap: { host: 'imap.centrum.cz', port: 993 },
      },
    };

    const config = providers[args.provider];
    if (!config) {
      throw new Error(`Unsupported provider: ${args.provider}`);
    }

    // Test SMTP
    try {
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: true,
        auth: {
          user: args.email,
          pass: args.password,
        },
      });
      await transporter.verify();
      results.smtp = { success: true };
    } catch (error: any) {
      results.smtp = { success: false, error: error?.message || "SMTP connection failed" };
    }

    // Test IMAP
    try {
      const { ImapFlow } = require("imapflow");
      const client = new ImapFlow({
        host: config.imap.host,
        port: config.imap.port,
        secure: true,
        auth: {
          user: args.email,
          pass: args.password,
        },
        logger: false,
      });
      await client.connect();
      await client.logout();
      results.imap = { success: true };
    } catch (error: any) {
      results.imap = { success: false, error: error?.message || "IMAP connection failed" };
    }

    // Send test email if recipient provided and SMTP works
    if (args.testRecipient && results.smtp.success) {
      try {
        const nodemailer = require("nodemailer");
        const transporter = nodemailer.createTransport({
          host: config.smtp.host,
          port: config.smtp.port,
          secure: true,
          auth: {
            user: args.email,
            pass: args.password,
          },
        });

        const mailContent = {
          from: args.email,
          to: args.testRecipient,
          subject: `Test Email from SkauTreg - ${args.provider}`,
          html: `<p>This is a test email sent from <strong>SkauTreg</strong> using <strong>${args.provider}</strong> SMTP.</p>
                 <p>Your email connection is working correctly! ✅</p>
                 <p style="color: #6b7280; font-size: 0.875rem;">This email has been automatically saved to your Sent folder.</p>`,
        };

        await transporter.sendMail(mailContent);

        // Automatically save to Sent folder (fire and forget)
        if (results.imap.success) {
          saveToImapSent({
            imapHost: config.imap.host,
            imapPort: config.imap.port,
            email: args.email,
            password: args.password,
            from: args.email,
            to: args.testRecipient,
            subject: mailContent.subject,
            html: mailContent.html,
          }).catch(() => {
            // Silently ignore - email was already sent
          });
        }

        results.testEmail = { success: true };
      } catch (error: any) {
        results.testEmail = { success: false, error: error?.message || "Failed to send test email" };
      }
    }

    return results;
  },
});