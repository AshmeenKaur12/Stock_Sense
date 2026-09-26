import request from 'supertest';
import { createApp } from '../src/app';
import { Otp } from '../src/models/Otp';
import { RefreshToken } from '../src/models/RefreshToken';
import { User } from '../src/models/User';
import { createUser, PASSWORD, resetDb, startDb, stopDb } from './helpers';

const mockMails: { to: string; text: string }[] = [];
jest.mock('../src/config/mailer', () => ({
  sendMail: jest.fn(async (m: { to: string; text: string }) => {
    mockMails.push(m);
  }),
}));

const app = createApp();
const api = '/api/v1/auth';
const valid = { loginId: 'newuser1', email: 'new@stocksense.io', password: 'Str0ng@Pass', confirmPassword: 'Str0ng@Pass' };

const cookieValue = (res: request.Response, name: string) => {
  const raw = ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${name}=`));
  return raw?.split(';')[0]?.slice(name.length + 1);
};
const lastCode = () => /(\d{6})/.exec(mockMails[mockMails.length - 1]?.text ?? '')?.[1];

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  mockMails.length = 0;
});

describe('signup', () => {
  it('creates an account with a hashed password', async () => {
    const res = await request(app).post(`${api}/signup`).send(valid);
    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ loginId: 'newuser1', email: 'new@stocksense.io', role: 'staff' });
    expect(res.body.data.user.passwordHash).toBeUndefined();
    const stored = await User.findOne({ loginId: 'newuser1' }).select('+passwordHash').lean();
    expect(stored?.passwordHash).toMatch(/^\$2[aby]\$12\$/);
  });

  it.each([
    [{ loginId: 'abc' }, 'loginId'],
    [{ loginId: 'waytoolonglogin' }, 'loginId'],
    [{ email: 'not-an-email' }, 'email'],
    [{ password: 'Sh@rt1A', confirmPassword: 'Sh@rt1A' }, 'password'],
    [{ password: 'nouppercase@1', confirmPassword: 'nouppercase@1' }, 'password'],
    [{ password: 'NOLOWERCASE@1', confirmPassword: 'NOLOWERCASE@1' }, 'password'],
    [{ password: 'NoSpecial123', confirmPassword: 'NoSpecial123' }, 'password'],
    [{ confirmPassword: 'Different@1' }, 'confirmPassword'],
  ])('rejects %j', async (override, field) => {
    const res = await request(app).post(`${api}/signup`).send({ ...valid, ...override });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.map((e: { field: string }) => e.field)).toContain(field);
  });

  it('rejects a duplicate login id and a duplicate email with 409', async () => {
    await request(app).post(`${api}/signup`).send(valid).expect(201);
    const dupLogin = await request(app).post(`${api}/signup`).send({ ...valid, email: 'other@stocksense.io' });
    expect(dupLogin.status).toBe(409);
    expect(dupLogin.body.errors).toEqual([{ field: 'loginId', message: 'Login ID already exists' }]);
    const dupEmail = await request(app).post(`${api}/signup`).send({ ...valid, loginId: 'another1' });
    expect(dupEmail.status).toBe(409);
    expect(dupEmail.body.errors[0].field).toBe('email');
  });

  it('reports live availability for login id and email', async () => {
    await request(app).post(`${api}/signup`).send(valid).expect(201);
    const taken = await request(app).get(`${api}/check-login-id`).query({ loginId: 'NEWUSER1' });
    expect(taken.body.data).toMatchObject({ valid: true, available: false });
    const free = await request(app).get(`${api}/check-login-id`).query({ loginId: 'freeone1' });
    expect(free.body.data.available).toBe(true);
    const email = await request(app).get(`${api}/check-email`).query({ email: 'new@stocksense.io' });
    expect(email.body.data.available).toBe(false);
  });
});

describe('login / session', () => {
  beforeEach(() => createUser('staff01', 'staff'));

  it('signs in and sets httpOnly cookies', async () => {
    const res = await request(app).post(`${api}/login`).send({ loginId: 'STAFF01', password: PASSWORD });
    expect(res.status).toBe(200);
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    expect(cookies.some((c) => c.startsWith('ss_access=') && /HttpOnly/i.test(c))).toBe(true);
    expect(cookies.some((c) => c.startsWith('ss_refresh=') && /Path=\/api\/v1\/auth/.test(c))).toBe(true);
  });

  it('returns exactly "Invalid Login Id or Password" for a wrong password or unknown user', async () => {
    const wrong = await request(app).post(`${api}/login`).send({ loginId: 'staff01', password: 'Wrong@12345' });
    expect(wrong.status).toBe(401);
    expect(wrong.body.message).toBe('Invalid Login Id or Password');
    const unknown = await request(app).post(`${api}/login`).send({ loginId: 'nobody99', password: PASSWORD });
    expect(unknown.body.message).toBe('Invalid Login Id or Password');
  });

  it('GET /me requires a session', async () => {
    await request(app).get(`${api}/me`).expect(401);
    const agent = request.agent(app);
    await agent.post(`${api}/login`).send({ loginId: 'staff01', password: PASSWORD }).expect(200);
    const me = await agent.get(`${api}/me`).expect(200);
    expect(me.body.data.user.loginId).toBe('staff01');
  });

  it('rotates refresh tokens and revokes the family on reuse', async () => {
    const login = await request(app).post(`${api}/login`).send({ loginId: 'staff01', password: PASSWORD });
    const first = cookieValue(login, 'ss_refresh')!;

    const r1 = await request(app).post(`${api}/refresh`).set('Cookie', `ss_refresh=${first}`);
    expect(r1.status).toBe(200);
    const second = cookieValue(r1, 'ss_refresh')!;
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);

    // Replaying the rotated token is treated as theft…
    const replay = await request(app).post(`${api}/refresh`).set('Cookie', `ss_refresh=${first}`);
    expect(replay.status).toBe(401);
    // …and kills the whole family, including the newest token.
    const after = await request(app).post(`${api}/refresh`).set('Cookie', `ss_refresh=${second}`);
    expect(after.status).toBe(401);
    expect(await RefreshToken.countDocuments({ revokedAt: null })).toBe(0);
  });

  it('logout revokes the refresh token', async () => {
    const login = await request(app).post(`${api}/login`).send({ loginId: 'staff01', password: PASSWORD });
    const token = cookieValue(login, 'ss_refresh')!;
    await request(app).post(`${api}/logout`).set('Cookie', `ss_refresh=${token}`).expect(200);
    await request(app).post(`${api}/refresh`).set('Cookie', `ss_refresh=${token}`).expect(401);
  });
});

describe('forgot password (OTP)', () => {
  beforeEach(() => createUser('staff01', 'staff'));
  const email = 'staff01@test.io';

  it('sends a hashed 6-digit OTP and resets the password end to end', async () => {
    const login = await request(app).post(`${api}/login`).send({ loginId: 'staff01', password: PASSWORD });
    const oldRefresh = cookieValue(login, 'ss_refresh')!;

    await request(app).post(`${api}/forgot-password`).send({ email }).expect(200);
    const code = lastCode()!;
    expect(code).toMatch(/^\d{6}$/);
    const stored = await Otp.findOne({ email }).lean();
    expect(stored?.codeHash).not.toContain(code);
    expect(stored!.expiresAt.getTime() - Date.now()).toBeGreaterThan(9 * 60_000);

    const verified = await request(app).post(`${api}/verify-otp`).send({ email, code }).expect(200);
    const { resetToken } = verified.body.data;
    await request(app)
      .post(`${api}/reset-password`)
      .send({ email, resetToken, password: 'Brand@New99', confirmPassword: 'Brand@New99' })
      .expect(200);

    await request(app).post(`${api}/login`).send({ loginId: 'staff01', password: PASSWORD }).expect(401);
    await request(app).post(`${api}/login`).send({ loginId: 'staff01', password: 'Brand@New99' }).expect(200);
    // Existing sessions were revoked.
    await request(app).post(`${api}/refresh`).set('Cookie', `ss_refresh=${oldRefresh}`).expect(401);
  });

  it('enforces the 60 s resend cooldown', async () => {
    await request(app).post(`${api}/forgot-password`).send({ email }).expect(200);
    const again = await request(app).post(`${api}/forgot-password`).send({ email });
    expect(again.status).toBe(429);
    expect(again.body.message).toMatch(/wait \d+s/);

    await Otp.updateOne({ email }, { $set: { lastSentAt: new Date(Date.now() - 61_000) } });
    await request(app).post(`${api}/forgot-password`).send({ email }).expect(200);
  });

  it('allows at most 5 attempts', async () => {
    await request(app).post(`${api}/forgot-password`).send({ email }).expect(200);
    const code = lastCode()!;
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 1; i <= 4; i++) {
      const res = await request(app).post(`${api}/verify-otp`).send({ email, code: wrong });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain(`${5 - i} attempt`);
    }
    const fifth = await request(app).post(`${api}/verify-otp`).send({ email, code: wrong });
    expect(fifth.status).toBe(429);
    // Even the right code is refused after the limit.
    await request(app).post(`${api}/verify-otp`).send({ email, code }).expect(429);
  });

  it('rejects an expired code', async () => {
    await request(app).post(`${api}/forgot-password`).send({ email }).expect(200);
    const code = lastCode()!;
    await Otp.updateOne({ email }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await request(app).post(`${api}/verify-otp`).send({ email, code });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('does not reveal whether an email exists', async () => {
    const res = await request(app).post(`${api}/forgot-password`).send({ email: 'ghost@nowhere.io' });
    expect(res.status).toBe(200);
    expect(mockMails).toHaveLength(0);
  });

  it('rejects a reset without a verified token', async () => {
    const res = await request(app)
      .post(`${api}/reset-password`)
      .send({ email, resetToken: 'forged-token-value', password: 'Brand@New99', confirmPassword: 'Brand@New99' });
    expect(res.status).toBe(400);
  });
});
