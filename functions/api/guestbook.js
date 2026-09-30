const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
});
const local = request => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname);
const configured = env => Boolean(env.GITHUB_TOKEN && env.GITHUB_OWNER && env.GITHUB_REPO && env.GITHUB_BRANCH);
const protectionReady = (env, request) => Boolean(
  (env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY) ||
  (local(request) && env.GUESTBOOK_DEV_MODE === 'true')
);
export function onRequestGet({ env, request }) {
  return json({ enabled: configured(env) && protectionReady(env, request), siteKey: env.TURNSTILE_SITE_KEY || '' });
}
export async function onRequestPost({ env, request }) {
  const origin = request.headers.get('Origin');
  if (origin !== new URL(request.url).origin) return json({ error: '허용되지 않은 요청입니다.' }, 403);
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'JSON 요청이 필요합니다.' }, 415);
  if (!configured(env) || !protectionReady(env, request)) return json({ error: '방명록 연결 설정이 필요합니다.' }, 503);
  let data;
  try {
    // Bound actual bytes, including chunked requests.
    const reader = request.body?.getReader();
    if (!reader) return json({ error: '입력값이 없습니다.' }, 400);
    const chunks = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) { await reader.cancel(); return json({ error: '요청이 너무 큽니다.' }, 413); }
      chunks.push(value);
    }
    const buffer = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
    data = JSON.parse(new TextDecoder().decode(buffer));
  } catch { return json({ error: '입력 형식을 확인해 주세요.' }, 400); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: '입력 형식을 확인해 주세요.' }, 400);
  if (data.website) return json({ error: '요청을 처리할 수 없습니다.' }, 400);
  if (typeof data.name !== 'string' || typeof data.message !== 'string') return json({ error: '이름과 메시지를 입력해 주세요.' }, 400);
  const name = data.name.trim(); const message = data.message.trim();
  if (!name || !message || name.length > 40 || message.length > 500) return json({ error: '이름 1~40자, 메시지 1~500자로 입력해 주세요.' }, 400);
  try {
    if (env.TURNSTILE_SECRET_KEY) {
      if (typeof data.token !== 'string' || !data.token || data.token.length > 2048) return json({ error: '보안 확인을 완료해 주세요.' }, 400);
      const check = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET_KEY, response: data.token,
          remoteip: request.headers.get('CF-Connecting-IP') || ''
        }), signal: AbortSignal.timeout(10000)
      });
      const verdict = await check.json();
      if (!check.ok || !verdict.success || verdict.hostname !== new URL(request.url).hostname || verdict.action !== 'guestbook') {
        return json({ error: '보안 확인에 실패했습니다. 다시 시도해 주세요.' }, 403);
      }
    }
    const createdAt = new Date().toISOString();
    const filename = createdAt.replace(/[:.]/g, '-') + '-' + crypto.randomUUID() + '.json';
    const content = JSON.stringify({ name, message, createdAt, approved: false }, null, 2) + '\n';
    const bytes = new TextEncoder().encode(content);
    const encoded = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
    const github = await fetch(
      'https://api.github.com/repos/' + encodeURIComponent(env.GITHUB_OWNER) + '/' +
      encodeURIComponent(env.GITHUB_REPO) + '/contents/content/guestbook/' + filename,
      { method: 'PUT', headers: {
        Authorization: 'Bearer ' + env.GITHUB_TOKEN,
        Accept: 'application/vnd.github+json', 'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'portfolio-guestbook'
      }, body: JSON.stringify({ message: 'Add guestbook entry', content: encoded, branch: env.GITHUB_BRANCH }),
        signal: AbortSignal.timeout(10000) }
    );
    if (!github.ok) return json({ error: '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, 502);
    return json({ ok: true }, 201);
  } catch { return json({ error: '연결에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, 502); }
}
export function onRequest({ request, next }) {
  if (!['GET', 'POST'].includes(request.method)) return json({ error: '허용되지 않은 메서드입니다.' }, 405);
  return next();
}
