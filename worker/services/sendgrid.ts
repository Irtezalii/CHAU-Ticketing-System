import type { Env } from "../types";

const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";
const DEFAULT_FROM_EMAIL = "support@channelautomation.com";
const DEFAULT_FROM_NAME = "Channel Automation Support";

function wrapEmailHtml(fromName: string, bodyHtml: string): string {
  return `
    <div style="font-family: Arial, sans-serif; background:#080b10; color:#e5e7eb; padding:24px; border-radius:12px; max-width:520px; margin:0 auto;">
      ${bodyHtml}
      <p style="color:#6b7280; font-size:12px; margin-top:24px;">${escapeHtml(fromName)}</p>
    </div>
  `;
}

async function sendEmail(
  params: {
    toEmail: string;
    toName?: string;
    subject: string;
    plainText: string;
    html: string;
  },
  env: Env,
  logLabel: string,
): Promise<boolean> {
  if (!env.SENDGRID_API_KEY) {
    console.warn(`SendGrid API key missing in env; skipping ${logLabel}.`);
    return false;
  }
  if (!params.toEmail) return false;

  const fromEmail = env.SENDGRID_FROM_EMAIL || DEFAULT_FROM_EMAIL;
  const fromName = env.SENDGRID_FROM_NAME || DEFAULT_FROM_NAME;

  try {
    const response = await fetch(SENDGRID_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: params.toEmail, name: params.toName || undefined }],
            subject: params.subject,
          },
        ],
        from: { email: fromEmail, name: fromName },
        content: [
          { type: "text/plain", value: params.plainText },
          { type: "text/html", value: params.html },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Failed to send ${logLabel}:`, errText);
      return false;
    }

    console.log(`Sent ${logLabel} to ${params.toEmail}`);
    return true;
  } catch (err) {
    console.error(`Error sending ${logLabel}:`, err);
    return false;
  }
}

export async function sendTicketConfirmationEmail(
  ticket: Record<string, any>,
  ticketUrl: string,
  env: Env,
): Promise<boolean> {
  const toName = ticket.name || "there";
  const ticketRef = ticket.ticket_ref || "your ticket";
  const subject = ticket.subject || "your request";
  const fromName = env.SENDGRID_FROM_NAME || DEFAULT_FROM_NAME;

  const plainText = `Hi ${toName},

We've received your support ticket ${ticketRef}: "${subject}".

Our team will follow up shortly. You can track updates and reply here:
${ticketUrl}

- ${fromName}`;

  const html = wrapEmailHtml(
    fromName,
    `
      <h2 style="color:#60a5fa; margin-top:0;">Ticket received</h2>
      <p>Hi ${escapeHtml(toName)},</p>
      <p>We've received your support ticket <strong>${escapeHtml(ticketRef)}</strong>:</p>
      <p style="background:#111827; border:1px solid #1f2937; border-radius:8px; padding:12px 16px; color:#e5e7eb;">
        ${escapeHtml(subject)}
      </p>
      <p>Our team will follow up shortly. You can track updates and reply anytime:</p>
      <p>
        <a href="${ticketUrl}" style="display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none; padding:10px 18px; border-radius:8px; font-weight:bold;">
          View your ticket
        </a>
      </p>
    `,
  );

  return sendEmail(
    {
      toEmail: ticket.email,
      toName: ticket.name,
      subject: `We've received your ticket ${ticketRef}`,
      plainText,
      html,
    },
    env,
    `ticket confirmation email for ${ticketRef}`,
  );
}

export async function sendTicketResolvedEmail(
  ticket: Record<string, any>,
  ticketUrl: string,
  env: Env,
): Promise<boolean> {
  const toName = ticket.name || "there";
  const ticketRef = ticket.ticket_ref || "your ticket";
  const subject = ticket.subject || "your request";
  const fromName = env.SENDGRID_FROM_NAME || DEFAULT_FROM_NAME;

  const plainText = `Hi ${toName},

Good news -- your support ticket ${ticketRef}: "${subject}" has been marked resolved.

Thank you for your patience. If anything is still not working as expected, just reply on the ticket and we'll reopen it:
${ticketUrl}

- ${fromName}`;

  const html = wrapEmailHtml(
    fromName,
    `
      <h2 style="color:#34d399; margin-top:0;">Ticket resolved</h2>
      <p>Hi ${escapeHtml(toName)},</p>
      <p>Good news -- your support ticket <strong>${escapeHtml(ticketRef)}</strong> has been marked resolved:</p>
      <p style="background:#111827; border:1px solid #1f2937; border-radius:8px; padding:12px 16px; color:#e5e7eb;">
        ${escapeHtml(subject)}
      </p>
      <p>Thank you for your patience. If anything is still not working as expected, just reply on the ticket and we'll reopen it:</p>
      <p>
        <a href="${ticketUrl}" style="display:inline-block; background:#16a34a; color:#ffffff; text-decoration:none; padding:10px 18px; border-radius:8px; font-weight:bold;">
          View your ticket
        </a>
      </p>
    `,
  );

  return sendEmail(
    {
      toEmail: ticket.email,
      toName: ticket.name,
      subject: `Your ticket ${ticketRef} has been resolved`,
      plainText,
      html,
    },
    env,
    `ticket resolved email for ${ticketRef}`,
  );
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
