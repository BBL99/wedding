import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase, ref, get, set } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { firebaseConfig, WEB3FORMS_KEY } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

const formEl          = document.getElementById('rsvp-form');
const alreadyEl       = document.getElementById('rsvp-already');
const successEl       = document.getElementById('rsvp-success');
const statusEl        = document.getElementById('form-status');
const submitBtn       = document.getElementById('rsvp-submit');
const attendanceFields = document.getElementById('attendance-fields');
const emailInput      = document.getElementById('email');

// Converts an email address into a safe Firebase key
function emailToKey(email) {
  return email.toLowerCase().trim()
    .replace(/\./g, ',')
    .replace(/@/g, '_at_')
    .replace(/[^a-z0-9_,\-]/g, '_');
}

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className   = `form-status form-status--${type}`;
  statusEl.hidden      = false;
}

async function isAlreadySubmitted(email) {
  try {
    const snap = await get(ref(db, `rsvps/${emailToKey(email)}`));
    return snap.exists();
  } catch {
    return false;
  }
}

// Hide/show the guest count + dietary fields when declining
document.querySelectorAll('input[name="attending"]').forEach(radio => {
  radio.addEventListener('change', () => {
    attendanceFields.style.display = radio.value === 'no' ? 'none' : '';
  });
});

// Reveal a hint when "Other" dietary requirement is ticked
const dietaryOther    = document.getElementById('dietary-other');
const dietaryOtherHint = document.getElementById('dietary-other-hint');
dietaryOther?.addEventListener('change', () => {
  dietaryOtherHint.hidden = !dietaryOther.checked;
});

// Check for duplicate on email blur so the user gets early feedback
emailInput.addEventListener('blur', async () => {
  const email = emailInput.value.trim();
  if (!email || !email.includes('@')) return;
  if (await isAlreadySubmitted(email)) {
    alreadyEl.hidden = false;
    formEl.hidden    = true;
  }
});

formEl.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.hidden = true;

  const data      = new FormData(formEl);
  const name      = (data.get('name')     ?? '').toString().trim();
  const email     = (data.get('email')    ?? '').toString().trim();
  const attending = (data.get('attending') ?? '').toString();

  if (!name || !email || !attending) {
    showStatus('Please fill in all required fields.', 'error');
    return;
  }

  submitBtn.disabled    = true;
  submitBtn.textContent = 'Sending…';

  // Final duplicate check before writing
  if (await isAlreadySubmitted(email)) {
    formEl.hidden    = true;
    alreadyEl.hidden = false;
    return;
  }

  try {
    // 1. Record email in Firebase to prevent future duplicates
    await set(ref(db, `rsvps/${emailToKey(email)}`), true);

    // 2. Notify the couple via Web3Forms — fire and forget. A delivery
    //    failure must NOT trap the guest, because their RSVP is already
    //    recorded in Firebase above. So we don't await it or block the
    //    success screen on its result.
    const payload = {
      access_key: WEB3FORMS_KEY,
      subject:    `Wedding RSVP — ${name}`,
      name,
      email,
      attending,
      guests:   (data.get('guests')   ?? '1').toString(),
      dietary:  data.getAll('dietary').join(', ') || 'None',
      message:  (data.get('message')  ?? '').toString().trim(),
    };

    fetch('https://api.web3forms.com/submit', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body:    JSON.stringify(payload),
    }).catch(err => console.error('RSVP notification failed to send', err));

    formEl.hidden    = true;
    successEl.hidden = false;

  } catch (err) {
    // Only a Firebase write failure reaches here — the guest is NOT yet
    // recorded, so re-enabling the form lets them safely retry.
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Send RSVP';
    showStatus('Something went wrong — please try again or contact us directly.', 'error');
    console.error(err);
  }
});
