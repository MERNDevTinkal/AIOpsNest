import { handler } from './main';

describe('Email worker handler', () => {
  it('skips sending when EMAIL_ENABLED=false', async () => {
    process.env.EMAIL_ENABLED = 'false';
    await expect(handler({ email: 'a@b.com' })).resolves.toBeUndefined();
  });
});
