import type { FastifyBaseLogger } from 'fastify';

/**
 * Mailer — transactional email abstraction for passwordless login.
 *
 * Transport is selected by EMAIL_PROVIDER:
 *   - "console" (default): logs the code via the Fastify logger. Dev/CI only.
 *   - "resend": POSTs to the Resend HTTP API with RESEND_API_KEY (no SDK dep,
 *     just fetch). EMAIL_FROM must be a verified sender.
 *
 * To add SMTP/SES, implement another branch returning a Mailer — nothing else
 * in the app changes (auth.routes only knows the interface).
 */
export interface Mailer {
  sendLoginCode(email: string, code: string): Promise<void>;
}

export function createMailer(log: FastifyBaseLogger): Mailer {
  const provider = (process.env.EMAIL_PROVIDER ?? 'console').toLowerCase();
  const from = process.env.EMAIL_FROM ?? 'BreakFit <login@breakfit.app>';

  if (provider === 'resend') {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      log.warn('EMAIL_PROVIDER=resend but RESEND_API_KEY is missing — falling back to console');
      return consoleMailer(log);
    }
    return {
      async sendLoginCode(email, code) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to: email,
            subject: 'Dein BreakFit-Code',
            text: `Dein Anmeldecode: ${code}\n\nDer Code ist 10 Minuten gültig.`,
            html: loginEmailHtml(code),
          }),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          throw new Error(`Resend send failed: ${res.status} ${detail}`);
        }
      },
    };
  }

  return consoleMailer(log);
}

function consoleMailer(log: FastifyBaseLogger): Mailer {
  return {
    async sendLoginCode(email, code) {
      log.info({ email, code }, 'login code (console transport)');
    },
  };
}

function loginEmailHtml(code: string): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:auto">
  <h2 style="color:#08080c">BreakFit</h2>
  <p>Dein Anmeldecode:</p>
  <p style="font-size:28px;font-weight:700;letter-spacing:4px;color:#688826">${code}</p>
  <p style="color:#666">Der Code ist 10 Minuten gültig. Wenn du das nicht warst, ignoriere diese E-Mail.</p>
</div>`;
}
