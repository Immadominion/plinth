import { eq } from 'drizzle-orm';
import { db } from './client.js';
import { notificationSettings } from './schema.js';

export interface NotificationSettings {
  smsEnabled:     boolean;
  emailEnabled:   boolean;
  brandOverride:  string | null;
  disabledEvents: string[];
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  smsEnabled:     true,
  emailEnabled:   true,
  brandOverride:  null,
  disabledEvents: [],
};

export interface NotificationSettingsRepo {
  // Returns the tenant's settings, or the all-on defaults when no row exists.
  get(tenantId: string): Promise<NotificationSettings>;
  upsert(tenantId: string, settings: NotificationSettings, now: Date): Promise<void>;
}

export class DrizzleNotificationSettingsRepo implements NotificationSettingsRepo {
  async get(tenantId: string): Promise<NotificationSettings> {
    const rows = await db.select().from(notificationSettings).where(eq(notificationSettings.tenantId, tenantId));
    const row = rows[0];
    if (!row) return { ...DEFAULT_NOTIFICATION_SETTINGS };
    return {
      smsEnabled:     row.smsEnabled,
      emailEnabled:   row.emailEnabled,
      brandOverride:  row.brandOverride ?? null,
      disabledEvents: row.disabledEvents ?? [],
    };
  }

  async upsert(tenantId: string, settings: NotificationSettings, now: Date): Promise<void> {
    await db
      .insert(notificationSettings)
      .values({
        tenantId,
        smsEnabled:     settings.smsEnabled,
        emailEnabled:   settings.emailEnabled,
        brandOverride:  settings.brandOverride,
        disabledEvents: settings.disabledEvents,
        updatedAt:      now,
      })
      .onConflictDoUpdate({
        target: notificationSettings.tenantId,
        set: {
          smsEnabled:     settings.smsEnabled,
          emailEnabled:   settings.emailEnabled,
          brandOverride:  settings.brandOverride,
          disabledEvents: settings.disabledEvents,
          updatedAt:      now,
        },
      });
  }
}
