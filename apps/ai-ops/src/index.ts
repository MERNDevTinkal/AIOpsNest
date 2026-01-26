import express from 'express';
import bodyParser from 'body-parser';
import { AiOpsCoordinator } from './lib/coordinator';
import { LintFixAgent } from './agents/lintFixAgent';
import { TestRunnerAgent } from './agents/testRunnerAgent';

const app = express();
app.use(bodyParser.json());

const coordinator = new AiOpsCoordinator();
coordinator.registerAgent(new LintFixAgent());
coordinator.registerAgent(new TestRunnerAgent());

app.post('/webhook/error', async (req, res) => {
  const alert = req.body;
  await coordinator.handleAlert(alert);
  res.status(202).send({ status: 'accepted' });
});

app.get('/health', (req, res) => res.send({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`ai-ops listening on ${PORT}`));
