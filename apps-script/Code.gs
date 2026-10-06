/**
 * Metatron landing page — form backend.
 *
 * This file is NOT shipped with the site. It is the source of the Apps Script
 * that is bound to the Google Sheet collecting submissions. Keep it in the repo
 * so the backend is version-controlled; paste it into the Sheet to deploy.
 *
 * Install:
 *   1. Open the Google Sheet that should hold submissions.
 *   2. Extensions > Apps Script. Delete the stub, paste this file, save.
 *   3. Deploy > New deployment > type "Web app".
 *        Execute as:      Me
 *        Who has access:  Anyone                  <-- required; "Anyone with Google
 *                                                     account" blocks the landing page
 *   4. Authorise when prompted, then copy the /exec URL.
 *   5. Put that URL in data-endpoint on <form id="contact"> in index.html.
 *
 * After editing this script you must Deploy > Manage deployments > edit > Deploy
 * again. Saving alone does not update the live /exec URL.
 */

var SHEET_NAME = 'Submissions';

/**
 * Who gets an email per submission.
 *
 * The addresses deliberately live in Script Properties, NOT in this file, so that
 * nobody's email is exposed when this repo is pushed to GitHub or served by a
 * static host. Do not paste real addresses here.
 *
 * To set them: Apps Script editor > ⚙ Project Settings > Script Properties >
 * Add script property, with
 *     Property: NOTIFY_EMAILS
 *     Value:    a@example.com,b@example.com      (comma-separated, no spaces)
 *
 * Unset or empty = notifications off; submissions are still written to the Sheet.
 *
 * Note: Gmail caps MailApp at 100 recipients/day and each submission costs one
 * per address, so four addresses allows roughly 25 submissions a day.
 */
function notifyEmails() {
  var raw = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAILS') || '';
  return raw.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
}

/** Browser POST from the landing page. Body is JSON sent as text/plain. */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respond({ ok: false, error: 'empty request body' });
    }
    var data = JSON.parse(e.postData.contents);

    // Honeypot: a bot filled the hidden field. Accept and discard, so it does not retry.
    if (String(data.company || '').trim()) return respond({ ok: true });

    var name = String(data.name || '').trim();
    var email = String(data.email || '').trim();
    var note = String(data.note || '').trim();

    if (!name || !email) return respond({ ok: false, error: 'name and email are required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return respond({ ok: false, error: 'invalid email' });
    }

    // Cap lengths so a bad actor cannot write a novel into the sheet.
    sheet().appendRow([new Date(), name.slice(0, 200), email.slice(0, 200), note.slice(0, 5000)]);
    notify(name, email, note);
    return respond({ ok: true });
  } catch (err) {
    return respond({ ok: false, error: String(err) });
  }
}

/** Visiting the /exec URL in a browser — handy to confirm the deployment is live. */
function doGet() {
  return respond({ ok: true, service: 'metatron-form', rows: sheet().getLastRow() - 1 });
}

/** The submissions sheet, created with a header row on first use. */
function sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Timestamp', 'Name', 'Email', 'Note']);
    sh.getRange('A1:D1').setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 160);
    sh.setColumnWidth(2, 180);
    sh.setColumnWidth(3, 240);
    sh.setColumnWidth(4, 480);
  }
  return sh;
}

/** Optional email alert. Never fail the submission because the alert failed. */
function notify(name, email, note) {
  var recipients = notifyEmails();
  if (!recipients.length) return;
  try {
    MailApp.sendEmail({
      to: recipients.join(','),
      replyTo: email, // hitting Reply answers the prospect directly
      subject: 'Metatron — new note from ' + name,
      body: [
        'Name:  ' + name,
        'Email: ' + email,
        '',
        'Note:',
        note || '(none)',
        '',
        '—',
        'Sheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
      ].join('\n'),
    });
  } catch (err) {
    console.error('notify failed: ' + err);
  }
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
