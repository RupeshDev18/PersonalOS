export class SchedulerWorker {
  public async start(): Promise<void> {
    console.log('[SchedulerWorker] Recurring execution is disabled. No jobs will run automatically.');
  }

  public async stop(): Promise<void> {}
}
