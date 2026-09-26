import express from 'express';
import request from 'supertest';
import { createApp } from '../src/app';
import { mongoSanitize } from '../src/middlewares/sanitize';

const app = createApp();

describe('app shell', () => {
  it('GET /api/v1/health returns the standard success shape', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('unknown routes return 404 in the standard error shape', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: expect.stringContaining('Route not found'), errors: [] });
  });

  it('unknown API routes require authentication first (401)', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(401);
  });

  it('malformed JSON returns 400', async () => {
    const res = await request(app).post('/api/v1/health').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, message: 'Malformed JSON body', errors: [] });
  });

  it('sets security headers via helmet', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('mongoSanitize', () => {
  const echo = express()
    .use(express.json())
    .use(mongoSanitize)
    .post('/echo', (req, res) => res.json({ body: req.body, query: req.query }));

  it('strips $-operators and dotted keys from body and query', async () => {
    const res = await request(echo)
      .post('/echo?search[$regex]=.*&ok=1')
      .send({ loginId: { $ne: null }, 'a.b': 1, nested: { keep: true, $gt: 5 } });

    expect(res.body.body).toEqual({ loginId: {}, nested: { keep: true } });
    expect(res.body.query).toEqual({ search: {}, ok: '1' });
  });
});
