import nodemailer from "nodemailer";
import { Resend } from "resend";
import { getSetting, setSetting } from "./campSites.ts";

// Admin-configurable outbound email (currently only used for the "forgot password" flow).
// Two interchangeable providers are supported — Resend (API-key based) or a plain SMTP
// account (the vendor's own domain mailbox) — selected via `email_active_provider`. All
// values live in the existing server-side `settings` key-value table (see server/campSites.ts)
// so they're editable from the admin panel without touching .env or restarting the process.
export type EmailProvider = "none" | "resend" | "smtp";

export interface EmailConfig {
  activeProvider: EmailProvider;
  resendApiKey: string;
  resendFromEmail: string;
  resendFromName: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  smtpFromEmail: string;
  smtpFromName: string;
}

const KEYS = {
  activeProvider: "email_active_provider",
  resendApiKey: "email_resend_api_key",
  resendFromEmail: "email_resend_from_email",
  resendFromName: "email_resend_from_name",
  smtpHost: "email_smtp_host",
  smtpPort: "email_smtp_port",
  smtpSecure: "email_smtp_secure",
  smtpUser: "email_smtp_user",
  smtpPassword: "email_smtp_password",
  smtpFromEmail: "email_smtp_from_email",
  smtpFromName: "email_smtp_from_name",
} as const;

export async function getEmailConfig(): Promise<EmailConfig> {
  const activeProvider = (await getSetting(KEYS.activeProvider, "none")) as EmailProvider;
  return {
    activeProvider: activeProvider === "resend" || activeProvider === "smtp" ? activeProvider : "none",
    resendApiKey: await getSetting(KEYS.resendApiKey, ""),
    resendFromEmail: await getSetting(KEYS.resendFromEmail, ""),
    resendFromName: await getSetting(KEYS.resendFromName, "GedəkGörək"),
    smtpHost: await getSetting(KEYS.smtpHost, ""),
    smtpPort: parseInt(await getSetting(KEYS.smtpPort, "587"), 10) || 587,
    smtpSecure: (await getSetting(KEYS.smtpSecure, "false")) === "true",
    smtpUser: await getSetting(KEYS.smtpUser, ""),
    smtpPassword: await getSetting(KEYS.smtpPassword, ""),
    smtpFromEmail: await getSetting(KEYS.smtpFromEmail, ""),
    smtpFromName: await getSetting(KEYS.smtpFromName, "GedəkGörək"),
  };
}

// Masked view for the admin panel's GET endpoint — secrets are never sent back to the
// browser once saved, only whether one is currently set. The PUT endpoint below treats an
// empty string for a secret field as "leave unchanged", so the admin only re-types it when
// actually rotating the key/password.
export async function getEmailConfigMasked() {
  const cfg = await getEmailConfig();
  return {
    activeProvider: cfg.activeProvider,
    resend: {
      apiKeyConfigured: !!cfg.resendApiKey,
      fromEmail: cfg.resendFromEmail,
      fromName: cfg.resendFromName,
    },
    smtp: {
      host: cfg.smtpHost,
      port: cfg.smtpPort,
      secure: cfg.smtpSecure,
      user: cfg.smtpUser,
      passwordConfigured: !!cfg.smtpPassword,
      fromEmail: cfg.smtpFromEmail,
      fromName: cfg.smtpFromName,
    },
  };
}

export interface EmailConfigUpdate {
  activeProvider?: EmailProvider;
  resendApiKey?: string;
  resendFromEmail?: string;
  resendFromName?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFromEmail?: string;
  smtpFromName?: string;
}

export async function updateEmailConfig(update: EmailConfigUpdate): Promise<void> {
  if (update.activeProvider !== undefined) await setSetting(KEYS.activeProvider, update.activeProvider);
  // Secret fields: only overwrite when a non-empty value was actually submitted.
  if (update.resendApiKey) await setSetting(KEYS.resendApiKey, update.resendApiKey);
  if (update.resendFromEmail !== undefined) await setSetting(KEYS.resendFromEmail, update.resendFromEmail);
  if (update.resendFromName !== undefined) await setSetting(KEYS.resendFromName, update.resendFromName);
  if (update.smtpHost !== undefined) await setSetting(KEYS.smtpHost, update.smtpHost);
  if (update.smtpPort !== undefined) await setSetting(KEYS.smtpPort, String(update.smtpPort));
  if (update.smtpSecure !== undefined) await setSetting(KEYS.smtpSecure, update.smtpSecure ? "true" : "false");
  if (update.smtpUser !== undefined) await setSetting(KEYS.smtpUser, update.smtpUser);
  if (update.smtpPassword) await setSetting(KEYS.smtpPassword, update.smtpPassword);
  if (update.smtpFromEmail !== undefined) await setSetting(KEYS.smtpFromEmail, update.smtpFromEmail);
  if (update.smtpFromName !== undefined) await setSetting(KEYS.smtpFromName, update.smtpFromName);
}

interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
}

// Throws on failure — callers decide how to surface that (the forgot-password route swallows
// it behind a generic response so it can't be used to probe which emails exist; the admin's
// "send test email" button surfaces the real error message instead).
export async function sendEmail({ to, subject, html }: SendEmailArgs): Promise<void> {
  const cfg = await getEmailConfig();

  if (cfg.activeProvider === "resend") {
    if (!cfg.resendApiKey) throw new Error("Resend API açarı təyin edilməyib.");
    if (!cfg.resendFromEmail) throw new Error("Resend 'from' e-poçt ünvanı təyin edilməyib.");
    const resend = new Resend(cfg.resendApiKey);
    const { error } = await resend.emails.send({
      from: `${cfg.resendFromName} <${cfg.resendFromEmail}>`,
      to,
      subject,
      html,
    });
    if (error) throw new Error(error.message || "Resend email göndərə bilmədi.");
    return;
  }

  if (cfg.activeProvider === "smtp") {
    if (!cfg.smtpHost || !cfg.smtpUser || !cfg.smtpPassword) {
      throw new Error("SMTP parametrləri tam doldurulmayıb (host/istifadəçi/parol).");
    }
    if (!cfg.smtpFromEmail) throw new Error("SMTP 'from' e-poçt ünvanı təyin edilməyib.");
    const transporter = nodemailer.createTransport({
      host: cfg.smtpHost,
      port: cfg.smtpPort,
      secure: cfg.smtpSecure,
      auth: { user: cfg.smtpUser, pass: cfg.smtpPassword },
    });
    await transporter.sendMail({
      from: `${cfg.smtpFromName} <${cfg.smtpFromEmail}>`,
      to,
      subject,
      html,
    });
    return;
  }

  throw new Error("Email göndərmə aktiv deyil. Zəhmət olmasa admin panelində Resend və ya SMTP təyin edin.");
}
