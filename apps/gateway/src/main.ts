import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

app.use('/auth', createProxyMiddleware({ target: 'http://auth:3001', changeOrigin: true, pathRewrite: { '^/auth': '' } }));
app.use('/users', createProxyMiddleware({ target: 'http://users:3002', changeOrigin: true, pathRewrite: { '^/users': '' } }));

app.get('/', (req, res) => res.send('Gateway running'));
app.get('/health', (_req, res) => res.status(200).send('ok'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Gateway listening on ${port}`));
