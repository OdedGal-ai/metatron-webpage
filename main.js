// Contact form behaviour — ported 1:1 from the Claude Design component.
// Endpoint: set data-endpoint on <form id="contact">. Empty = demo mode (shows success without sending).
(function () {
  const form = document.getElementById('contact');
  const success = document.getElementById('success');
  const successMsg = document.getElementById('success-msg');
  const submitErr = document.getElementById('submit-error');
  const btn = form.querySelector('button[type="submit"]');
  const fields = { name: form.elements.name, email: form.elements.email };
  const touched = { name: false, email: false };
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function errors() {
    const e = {};
    const name = fields.name.value.trim();
    const email = fields.email.value.trim();
    if (!name) e.name = 'Please enter your name.';
    if (!email) e.email = 'Please enter your email address.';
    else if (!EMAIL_RE.test(email)) e.email = 'Please enter a valid email, e.g. name@company.com';
    return e;
  }

  function render() {
    const e = errors();
    for (const key of ['name', 'email']) {
      const msg = touched[key] ? e[key] || '' : '';
      const el = document.getElementById(key + '-error');
      el.textContent = msg;
      el.hidden = !msg;
      fields[key].setAttribute('aria-invalid', String(!!msg));
    }
  }

  for (const key of ['name', 'email']) {
    fields[key].addEventListener('blur', () => { touched[key] = true; render(); });
    fields[key].addEventListener('input', render);
  }

  function showSuccess(name, email) {
    successMsg.textContent = `Thanks, ${name.split(/\s+/)[0]}. We’ll be in touch at ${email} shortly.`;
    form.hidden = true;
    success.hidden = false;
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    touched.name = touched.email = true;
    render();
    const e = errors();
    if (Object.keys(e).length) { fields[e.name ? 'name' : 'email'].focus(); return; }

    const payload = {
      name: fields.name.value.trim(),
      email: fields.email.value.trim(),
      note: form.elements.note.value.trim(),
      company: form.elements.company.value.trim(), // honeypot — real users leave this empty
    };
    const endpoint = (form.dataset.endpoint || '').trim();
    if (!endpoint) { showSuccess(payload.name, payload.email); return; }

    btn.disabled = true; btn.textContent = 'Sending…';
    submitErr.hidden = true;
    try {
      // text/plain keeps this a CORS "simple request". An Apps Script web app cannot
      // answer the OPTIONS preflight that application/json would trigger, so the body
      // is JSON while the header is not — the script parses it as a raw string.
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      // Apps Script serves the response body from a second host it 302s to, and that
      // hop intermittently 404s (~1 in 3) even though doPost already ran and wrote the
      // row. A redirect therefore proves the script executed, so an unreadable body
      // after one counts as success. Do NOT retry here — the row already exists and a
      // second POST would duplicate the lead.
      if (!r.ok) {
        if (r.redirected) { showSuccess(payload.name, payload.email); return; }
        throw new Error(r.status);
      }
      // Apps Script answers 200 even when it rejects the row, so trust the body.
      const body = await r.json().catch(() => null);
      if (body && !body.ok) throw new Error(body.error || 'rejected');
      showSuccess(payload.name, payload.email);
    } catch (_) {
      submitErr.textContent = 'Something went wrong. Please try again.';
      submitErr.hidden = false;
    } finally {
      btn.disabled = false; btn.textContent = 'Send note';
    }
  });
})();
