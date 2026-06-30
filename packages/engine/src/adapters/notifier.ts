export interface NotifyParams {
  customerId: string;
  tenantId: string;
  event: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface Notifier {
  send(params: NotifyParams): Promise<void>;
}

export class ConsoleNotifier implements Notifier {
  async send(params: NotifyParams): Promise<void> {
    console.log(
      JSON.stringify({
        level: 'info',
        logger: 'ConsoleNotifier',
        event: params.event,
        customerId: params.customerId,
        tenantId: params.tenantId,
        message: params.message,
        metadata: params.metadata ?? {},
      }),
    );
  }
}
