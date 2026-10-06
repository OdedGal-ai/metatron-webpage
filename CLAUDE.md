# Metatron — coming-soon landing page

## What this is
A single-page "launching soon" site for **Metatron**. It shows a headline, a short pitch, and a contact form (name, email, optional note) so prospects can ask to test early insights on their own data or talk with the founding team.

The design was made in Claude Design and exported as a bundled page that ran on Claude Design's own runtime. It has been ported **1:1 to plain HTML, CSS and JS**: no framework, no build step, no dependencies. Keep the visual design as it is unless told otherwise.

## Files
```
index.html                 markup (content and form)
styles.css                 all styling; design tokens live in :root
main.js                    form validation and submit (vanilla JS)
assets/bg-desktop.webp     2560×1429 hero: Earth with glowing orbital rings, set to the right
assets/bg-mobile.webp      1280×714 version of the same image for screens under 820px
assets/fonts/*.woff2       self-hosted Manrope (variable 300–600), Raleway 600, IBM Plex Mono 400 (latin and latin-ext)
reference/claude-design-source.html   the original Claude Design template and logic, for reference only (do not ship)
apps-script/Code.gs        form backend, bound to the Google Sheet (not shipped — pasted into the Sheet)
```

## Run locally
`python3 -m http.server 8000`, then open http://localhost:8000. A server is needed because fonts load through `url()`.

## Design spec (source of truth: styles.css)
- **Palette:** background `#05070a`, text `#f2f4f7`, accent ice-blue `#b8d4f2`, button `#e6eef8`, error `#ff9b8f`.
- **Type:** H1 is Raleway 600, uppercase, `clamp(44px, 6.4vw, 84px)`. Body is Manrope. Field labels are IBM Plex Mono at 12px, uppercase, with 0.12em tracking.
- **Desktop (820px and up):** the image covers the page at `70% center`. A left-to-right dark gradient keeps the copy readable. Content is vertically centred on the left, with a maximum width of 460px.
- **Mobile (under 820px):** the image is `210% auto` at `88% 0%`, so the globe shows at the top. A top-to-bottom gradient fades to solid background by 440px. Content is pinned to the bottom.
- Text sits over the photo, so it uses heavy text-shadows for legibility. Inputs are translucent with `backdrop-filter: blur(6px)`.

## Form behaviour (matches the original)
- Name and email are required. Email is checked with `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`.
- Errors appear only after a field is blurred or the form is submitted. Invalid inputs get `aria-invalid="true"` and a red border.
- The form POSTs JSON `{ name, email, note, company }` to the URL in `data-endpoint` on `<form id="contact">`.
- **`data-endpoint` is live** — it points at the Apps Script web app bound to the "Metatron — Landing Page Submissions" Sheet. Emptying it puts the form back into demo mode, where it shows the success message without sending anything.
- `company` is a honeypot: an off-screen input real users never fill. The backend silently discards any submission that carries a value in it.
- The `Content-Type` is `text/plain;charset=utf-8`, not `application/json`. This is deliberate — it keeps the POST a CORS "simple request", because an Apps Script web app cannot answer the preflight that `application/json` would trigger. Do not "fix" this.
- Apps Script returns HTTP 200 even when it rejects a row, so the client checks `ok` in the response body, not just `response.ok`.
- **Apps Script's response body is served from a second host it 302s to, and that hop intermittently 404s — measured at roughly 1 in 3.** When it does, `doPost` has already run and written the row; only the confirmation is lost. `main.js` therefore treats "redirected but unreadable" as success. **Never retry the POST on failure** — the row already exists and a retry duplicates the lead. This was a real bug: the page showed "Something went wrong" while the row sat in the Sheet.
- On success, the form is replaced by "MESSAGE RECEIVED — Thanks, {first name}. We'll be in touch at {email} shortly."
- If the request fails, the page shows "Something went wrong. Please try again." The button label reads "Sending…" while a request is in flight.
- The original had a `buttonStyle` option (`solid` or `outline`). To switch, swap the `btn--solid` and `btn--outline` classes.

## Open tasks / next steps
1. ~~Wire up a real form backend.~~ **Done.** Submissions land in the "Metatron — Landing Page Submissions" Google Sheet via the Apps Script in `apps-script/Code.gs`, which also emails the team. Honeypot spam protection is in place.
   - **Notification addresses are never stored in this repo.** They live in Apps Script > Project Settings > Script Properties under the key `NOTIFY_EMAILS` (comma-separated), so that no personal email is exposed by a public GitHub repo or by a static host serving the repo contents. Do not hardcode addresses into `Code.gs`.
2. **Deploy** to a static host (Vercel, Netlify, Cloudflare Pages or GitHub Pages) and connect the domain.
3. **SEO and sharing:** favicon, Open Graph and Twitter card tags (generate a 1200×630 share image from bg-desktop), canonical URL.
4. **Analytics** if wanted (Plausible or similar, privacy-friendly). Add a privacy note near the form if contact details are stored.
5. **Performance:** add `<link rel="preload">` for the hero image or use `image-set()`. Check LCP on mobile.
6. **Accessibility pass:** contrast over the image at every breakpoint, focus-visible styles on the button, and test with a screen reader.

## Ground rules
- Keep it dependency-free unless there's a clear reason to change that.
- Don't change copy, colours or layout without asking. The design was signed off in Claude Design.
- Check both breakpoints (≥820px and <820px) after any visual change.
