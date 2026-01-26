export type AgentVote = {
  agentId: string;
  approved: boolean;
  message?: string;
};

export class AiOpsCoordinator {
  private agents: Array<any> = [];

  registerAgent(agent: any) {
    this.agents.push(agent);
  }

  async handleAlert(alert: any) {
    // Collect votes from agents in parallel
    const votes = await Promise.all(
      this.agents.map(async (agent) => {
        try {
          const result = await agent.evaluate(alert);
          return { agentId: agent.id, approved: result.approved, message: result.message };
        } catch (err: any) {
          return { agentId: agent.id, approved: false, message: `error: ${err.message}` };
        }
      }),
    );

    const approvals = votes.filter((v) => v.approved).length;
    const rejections = votes.length - approvals;

    // Simple majority decision
    const approved = approvals > rejections;

    // For now, do not auto-apply; just return decision and votes
    const decision = { approved, votes };

    // Log decision - in production this should publish to an event bus and create a PR
    console.log('AiOps decision', JSON.stringify(decision, null, 2));

    return decision;
  }
}
