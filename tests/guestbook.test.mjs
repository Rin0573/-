import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet, onRequestPost, onRequest } from '../functions/api/guestbook.js';
const env = {
  GITHUB_TOKEN: 'test-token', GITHUB_OWNER: 'Rin0573', GITHUB_REPO: 'portfolio',
  GITHUB_BRANCH: 'test-branch', TURNSTILE_SITE_KEY: 'site', TURNSTILE_SECRET_KEY: 'secret'
};
function request(data, url = 'https://portfolio.example/api/guestbook', extra = {}) {
  return new Request(url, { method: 'POST',
    headers: { Origin: new URL(url).origin, 'Content-Type': 'application/json', ...extra },
    body: JSON.stringify(data) });
}
test('public config exposes site key only and production fails closed', async () => {
  const config = await onRequestGet({ env, request: new Request('https://portfolio.example/api/guestbook') }).json();
  assert.deepEqual(config, { enabled: true, siteKey: 'site' });
  const missing = { ...env, TURNSTILE_SECRET_KEY: '', GUESTBOOK_DEV_MODE: 'true' };
  assert.equal((await onRequestGet({ env: missing, request: new Request('https://portfolio.example/api/guestbook') }).json()).enabled, false);
});
test('invalid input, honeypot, origin and body size rejected without upstream requests', async () => {
  for (const data of [null, [], {}, { name: '', message: 'x' }, { name: 'n'.repeat(41), message: 'x' },
    { name: 'n', message: 'x'.repeat(501) }, { name: 'n', message: 'x', website: 'spam' }]) {
    assert.equal((await onRequestPost({ env, request: request(data) })).status, 400);
  }
  assert.equal((await onRequestPost({ env, request: request({ name: 'n', message: 'x' }, undefined, { Origin: 'https://evil.example' }) })).status, 403);
  assert.equal((await onRequestPost({ env, request: request({ name: 'n', message: 'x'.repeat(9000) }) })).status, 413);
});
test('Turnstile invalid hostname/action or failed token cannot write to GitHub', async () => {
  const original = globalThis.fetch;
  try {
    for (const verdict of [{ success: false }, { success: true, hostname: 'evil.example', action: 'guestbook' },
      { success: true, hostname: 'portfolio.example', action: 'login' }]) {
      let calls = 0;
      globalThis.fetch = async () => { calls++; return Response.json(verdict); };
      assert.equal((await onRequestPost({ env, request: request({ name: 'n', message: 'm', token: 'token' }) })).status, 403);
      assert.equal(calls, 1);
    }
  } finally { globalThis.fetch = original; }
});
test('valid Unicode entry is JSON encoded, unapproved and written to configured branch', async () => {
  const original = globalThis.fetch; let saved; let endpoint;
  try {
    globalThis.fetch = async (url, options) => {
      if (url.includes('siteverify')) return Response.json({ success: true, hostname: 'portfolio.example', action: 'guestbook' });
      endpoint = url; saved = JSON.parse(options.body);
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      return Response.json({}, { status: 201 });
    };
    const response = await onRequestPost({ env, request: request({ name: '도도', message: '<script>한글</script>', token: 'token' }) });
    assert.equal(response.status, 201);
    assert.match(endpoint, /repos\/Rin0573\/portfolio\/contents\/content\/guestbook\/.+\.json$/);
    const record = JSON.parse(Buffer.from(saved.content, 'base64').toString('utf8'));
    assert.equal(record.name, '도도'); assert.equal(record.message, '<script>한글</script>');
    assert.equal(record.approved, false); assert.ok(record.createdAt);
    assert.equal(saved.branch, 'test-branch');
  } finally { globalThis.fetch = original; }
});
test('GitHub failure is not reported as success', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async url => url.includes('siteverify')
      ? Response.json({ success: true, hostname: 'portfolio.example', action: 'guestbook' })
      : Response.json({ message: 'private diagnostic' }, { status: 403 });
    const response = await onRequestPost({ env, request: request({ name: 'n', message: 'm', token: 'token' }) });
    assert.equal(response.status, 502);
    assert.ok(!(await response.text()).includes('private diagnostic'));
  } finally { globalThis.fetch = original; }
});
test('development bypass works only on localhost and methods are restricted', async () => {
  const dev = { ...env, TURNSTILE_SITE_KEY: '', TURNSTILE_SECRET_KEY: '', GUESTBOOK_DEV_MODE: 'true' };
  assert.equal((await onRequestPost({ env: dev, request: request({ name: 'n', message: 'm' }) })).status, 503);
  assert.equal((await onRequestGet({ env: dev, request: new Request('http://localhost/api/guestbook') }).json()).enabled, true);
  assert.equal(onRequest({ request: new Request('https://portfolio.example/api/guestbook', { method: 'DELETE' }) }).status, 405);
});
