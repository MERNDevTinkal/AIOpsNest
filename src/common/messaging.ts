import * as amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
const EXCHANGE = process.env.RABBITMQ_EXCHANGE || 'app.events';

let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;

async function getChannel(): Promise<amqp.Channel> {
  if (channel) return channel;
  if (!connection) connection = await amqp.connect(RABBITMQ_URL);
  channel = await connection.createChannel();
  return channel;
}

/**
 * Simple publisher
 */
export async function publish(routingKey: string, message: any) {
  const ch = await getChannel();
  await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
  ch.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(message)), { persistent: true });
}

/**
 * Setup a queue with a retry queue (TTL -> dead-letter back to main exchange) and a DLQ.
 * - queue: main queue name
 * - routingKey: routing key to bind
 * - options: { maxRetries, retryDelayMs }
 */
export async function setupQueueWithRetries(queue: string, routingKey: string, options?: { maxRetries?: number; retryDelayMs?: number }) {
  const ch = await getChannel();

  const maxRetries = options?.maxRetries ?? 3;
  const retryDelayMs = options?.retryDelayMs ?? 10000;

  // Exchanges
  await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
  await ch.assertExchange(`${EXCHANGE}.retry`, 'topic', { durable: true });
  await ch.assertExchange(`${EXCHANGE}.dlx`, 'fanout', { durable: true });

  // Main queue
  await ch.assertQueue(queue, { durable: true });
  await ch.bindQueue(queue, EXCHANGE, routingKey);

  // Retry queue - messages published here wait (TTL) then are dead-lettered back to main exchange
  const retryQueue = `${queue}.retry`;
  await ch.assertQueue(retryQueue, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': EXCHANGE,
      'x-dead-letter-routing-key': routingKey,
      'x-message-ttl': retryDelayMs,
    },
  });
  await ch.bindQueue(retryQueue, `${EXCHANGE}.retry`, routingKey);

  // DLQ for messages that exceeded retries
  const dlq = `${queue}.dlq`;
  await ch.assertQueue(dlq, { durable: true });
  await ch.bindQueue(dlq, `${EXCHANGE}.dlx`, '#');

  return { queue, retryQueue, dlq, maxRetries, retryDelayMs };
}

/**
 * Consume with retry and DLQ handling.
 */
export async function consumeWithRetries(
  queue: string,
  routingKey: string,
  handler: (msg: any) => Promise<void>,
  options?: { maxRetries?: number; retryDelayMs?: number },
) {
  const ch = await getChannel();
  const cfg = await setupQueueWithRetries(queue, routingKey, options);

  await ch.consume(queue, async (msg) => {
    if (!msg) return;
    let payload: any;
    try {
      payload = JSON.parse(msg.content.toString());
    } catch (err) {
      console.error('Failed to parse message; sending to DLQ', err);
      // send to DLQ
      ch.publish(`${EXCHANGE}.dlx`, '', msg.content, { persistent: true });
      ch.ack(msg);
      return;
    }

    try {
      await handler(payload);
      ch.ack(msg);
    } catch (err) {
      console.error('Handler error, attempting retry or DLQ', err);
      // inspect attempts header
      const headers = msg.properties.headers || {};
      const attempts = (headers['x-attempts'] || 0) as number;

      if (attempts + 1 >= cfg.maxRetries) {
        // send to DLQ
        ch.publish(`${EXCHANGE}.dlx`, '', msg.content, { persistent: true, headers: { ...headers, 'x-attempts': attempts + 1 } });
        ch.ack(msg);
        return;
      }

      // send to retry exchange with incremented attempts header
      ch.publish(`${EXCHANGE}.retry`, routingKey, msg.content, { persistent: true, headers: { ...headers, 'x-attempts': attempts + 1 } });
      ch.ack(msg);
    }
  });
}

export async function consume(queue: string, routingKey: string, handler: (msg: any) => Promise<void>) {
  // backward compatible: use consumeWithRetries with defaults
  return consumeWithRetries(queue, routingKey, handler, { maxRetries: 3, retryDelayMs: 10000 });
}

export async function close() {
  if (channel) await channel.close();
  if (connection) await connection.close();
}
