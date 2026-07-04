// SMS delivery. Twilio is the live provider (real SMS); the Noop adapter just logs what it *would*
// send, so notifications work in dev / before credentials are configured.

export interface SmsAdapter {
  send(to: string, message: string): Promise<{ ok: boolean; id?: string }>;
}

// Normalize a Nigerian number to international MSISDN format (2348012345678).
export function toNgMsisdn(phone: string): string {
  const d = phone.replace(/[^\d]/g, '');
  if (d.startsWith('234')) return d;
  if (d.startsWith('0')) return `234${d.slice(1)}`;
  if (d.length === 10) return `234${d}`;
  return d;
}

// Twilio wants strict E.164 with a leading '+'. Reuse the NG normalizer, then prefix.
export function toE164(phone: string): string {
  const d = toNgMsisdn(phone);
  return d.startsWith('+') ? d : `+${d}`;
}

export class NoopSmsAdapter implements SmsAdapter {
  async send(to: string, message: string): Promise<{ ok: boolean }> {
    console.log(`[sms:noop] → ${to}: ${message}`);
    return { ok: true };
  }
}

export class TwilioSmsAdapter implements SmsAdapter {
  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly from: string,
    private readonly baseUrl = 'https://api.twilio.com',
  ) {}

  async send(to: string, message: string): Promise<{ ok: boolean; id?: string }> {
    const url = `${this.baseUrl}/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    const body = new URLSearchParams({ To: toE164(to), From: this.from, Body: message });
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
    if (!res.ok) {
      console.warn(`[sms:twilio] send failed ${res.status}: ${JSON.stringify(json)}`);
      return { ok: false };
    }
    return json.sid ? { ok: true, id: json.sid } : { ok: true };
  }
}
