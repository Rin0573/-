(() => {
  const status = document.getElementById('works-status');
  const safeURL = (value, image = false) => {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value, document.baseURI);
      if (!['http:', 'https:'].includes(url.protocol)) return '';
      if (!image && (url.origin !== location.origin || !url.pathname.endsWith('.html'))) return '';
      return url.href;
    } catch { return ''; }
  };
  const element = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  fetch('./data/works.json', { cache: 'no-cache' })
    .then(response => { if (!response.ok) throw new Error(); return response.json(); })
    .then(works => {
      if (!Array.isArray(works)) throw new Error();
      const list = document.querySelector('#works_inner .list');
      const fragment = document.createDocumentFragment();
      works.filter(work => work.published === true)
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
        .forEach((work, index) => {
          const item = element('div', 'item');
          const card = element('a', 'work-card');
          const path = safeURL(work.detailPage);
          if (path) {
            card.href = path;
            card.dataset.fancybox = 'portfolio';
            card.dataset.type = 'iframe';
          } else {
            card.href = '#works';
            card.addEventListener('click', event => {
              event.preventDefault();
              status.textContent = '이 작품의 상세페이지는 아직 연결되지 않았습니다.';
            });
          }
          const thumb = element('div', 'thumb-box');
          const src = safeURL(work.thumbnail, true);
          if (src) {
            const image = element('img');
            image.src = src; image.alt = work.title || ''; image.loading = 'lazy';
            thumb.append(image);
          }
          const meta = element('div', 'meta-info');
          const top = element('div', 'top-row');
          top.append(element('span', 'index-num', 'No. ' + String(index + 1).padStart(2, '0')),
            element('span', 'category-stamp', work.category || ''));
          meta.append(top, element('h3', 'project-title', work.title || ''),
            element('p', 'project-desc', work.description || ''));
          card.append(thumb, meta); item.append(card); fragment.append(item);
        });
      list.replaceChildren(fragment);
      status.textContent = list.children.length ? '' : '공개된 작품이 없습니다.';
      works_swiper.update();
    }).catch(() => { status.textContent = '작품을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.'; });

  const form = document.getElementById('guestbook-form');
  const button = form.querySelector('button');
  const message = document.getElementById('guest-status');
  let widget;
  let ready = false;
  fetch('/api/guestbook')
    .then(response => { if (!response.ok) throw new Error(); return response.json(); })
    .then(config => {
      if (!config.enabled) throw new Error();
      if (!config.siteKey) { ready = true; button.disabled = false; message.textContent = ''; return; }
      window.portfolioTurnstileReady = () => {
        widget = window.turnstile.render('#guest-turnstile', {
          sitekey: config.siteKey, action: 'guestbook',
          callback: () => { ready = true; button.disabled = false; message.textContent = ''; },
          'expired-callback': () => { ready = false; button.disabled = true; },
          'error-callback': () => { ready = false; button.disabled = true; message.textContent = '보안 확인을 다시 시도해 주세요.'; }
        });
      };
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=portfolioTurnstileReady&render=explicit';
      script.onerror = () => { message.textContent = '보안 확인을 불러오지 못했습니다. 새로고침해 주세요.'; };
      document.head.append(script);
    }).catch(() => { message.textContent = '방명록 준비 중입니다. 연결 설정 후 이용할 수 있습니다.'; });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!ready || button.disabled || !form.reportValidity()) return;
    button.disabled = true;
    message.textContent = '전송 중입니다.';
    try {
      const fields = new FormData(form);
      const response = await fetch('/api/guestbook', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fields.get('name'), message: fields.get('message'), website: fields.get('website'),
          token: fields.get('cf-turnstile-response') || ''
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '전송하지 못했습니다.');
      form.reset(); message.textContent = '메시지를 남겼습니다. 감사합니다!';
    } catch (error) { message.textContent = error.message || '전송하지 못했습니다. 다시 시도해 주세요.'; }
    finally {
      if (widget !== undefined) { ready = false; window.turnstile.reset(widget); }
      button.disabled = !ready;
    }
  });
  document.getElementById('contact').addEventListener('wheel', event => {
    const section = event.currentTarget;
    if ((event.deltaY > 0 && section.scrollTop + section.clientHeight < section.scrollHeight - 1) ||
        (event.deltaY < 0 && section.scrollTop > 0)) event.stopPropagation();
  }, { passive: true });
})();
