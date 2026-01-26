export class RevertAgent {
  id = 'revert-agent';

  async evaluate(alert: any) {
    // This agent suggests a revert if a recent deploy is implicated
    if (!alert || !alert.type || alert.type !== 'deploy-failure') {
      return { approved: false, message: 'not-applicable' };
    }

    // Suggest revert; in real infra we'd create a rollback job
    return { approved: true, message: 'suggest-revert' };
  }
}
