import { initializeApp }                          from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase, ref, onValue, runTransaction } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { firebaseConfig, WEB3FORMS_KEY }           from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

const loadingEl  = document.getElementById('registry-loading');
const errorEl    = document.getElementById('registry-error');
const gridEl     = document.getElementById('gift-grid');
const introDesc  = document.getElementById('registry-intro-desc');
const thankyouEl = document.getElementById('registry-thankyou');
const thankyouTextEl = thankyouEl.querySelector('.registry-thankyou__text');
const submitBar  = document.getElementById('submit-bar');
const submitBtn  = document.getElementById('submit-btn');
const countEl    = document.getElementById('selection-count');
const pluralEl   = document.getElementById('selection-plural');
const toastEl    = document.getElementById('conflict-toast');
const template   = document.getElementById('gift-template');

const selected    = new Set(); // gift IDs the guest has currently checked
const claiming    = new Set(); // gift IDs this guest is claiming right now
let   latestGifts = {};        // most recent Firebase snapshot
let   toastTimer  = null;
let   submitted   = false;     // true once selections have been saved

// Warn the guest if they try to leave with checked-but-unsubmitted gifts.
// (Browsers only allow a generic confirmation dialog here — they will not let
//  a page silently block navigation.)
window.addEventListener('beforeunload', (e) => {
  if (selected.size > 0 && !submitted) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ── Submit bar ──────────────────────────────────────────────
function updateSubmitBar() {
  const n = selected.size;
  countEl.textContent = String(n);
  pluralEl.textContent = n === 1 ? '' : 's';
  submitBar.hidden = n === 0;
}

// ── Conflict toast ──────────────────────────────────────────
function showToast(giftName) {
  clearTimeout(toastTimer);
  toastEl.textContent = `"${giftName}" was just claimed by another guest.`;
  toastEl.hidden = false;
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 5000);
}

// ── Build one gift card from the <template> ─────────────────
function buildCard(id, gift) {
  const node      = template.content.cloneNode(true);
  const card      = node.querySelector('.gift-card');
  const label     = card.querySelector('.gift-card__label');
  const img       = card.querySelector('.gift-card__img');
  const placeholder  = card.querySelector('.gift-card__image-placeholder');
  const claimedBadge = card.querySelector('.gift-card__claimed-badge');
  const nameEl    = card.querySelector('.gift-card__name');
  const descEl    = card.querySelector('.gift-card__desc');
  const priceEl   = card.querySelector('.gift-card__price');
  const checkbox  = card.querySelector('.gift-card__checkbox');
  const checkLbl  = card.querySelector('.gift-card__checkbox-label');

  card.dataset.id  = id;
  nameEl.textContent  = gift.name        ?? '';
  descEl.textContent  = gift.description ?? '';
  priceEl.textContent = gift.price       ?? '';

  if (gift.image_url) {
    img.src = gift.image_url;
    img.alt = gift.name ?? '';
    placeholder.hidden = true;
  } else {
    img.hidden = true;
  }

  if (gift.claimed) {
    card.classList.add('gift-card--claimed');
    claimedBadge.hidden = false;
    checkbox.disabled   = true;
    checkLbl.textContent = 'Claimed';
  } else {
    checkbox.id          = `gift-${id}`;
    label.htmlFor        = `gift-${id}`;
    checkbox.checked     = selected.has(id);
    checkLbl.textContent = selected.has(id) ? 'Selected' : 'Select this gift';

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selected.add(id);
        checkLbl.textContent = 'Selected';
      } else {
        selected.delete(id);
        checkLbl.textContent = 'Select this gift';
      }
      updateSubmitBar();
    });
  }

  return card;
}

// ── Re-render the grid from a Firebase snapshot ─────────────
function renderGifts(gifts) {
  if (submitted) return; // thank-you screen is showing — don't re-render the grid
  latestGifts = gifts;

  // If a gift was claimed by someone else while the guest was browsing, uncheck it.
  // Skip gifts this guest is claiming themselves right now — that's not a conflict.
  for (const id of [...selected]) {
    if (gifts[id]?.claimed && !claiming.has(id)) {
      selected.delete(id);
      showToast(gifts[id].name ?? id);
    }
  }

  const sorted = Object.entries(gifts)
    .sort(([, a], [, b]) => (a.order ?? 999) - (b.order ?? 999));

  gridEl.innerHTML = '';
  for (const [id, gift] of sorted) {
    gridEl.appendChild(buildCard(id, gift));
  }

  loadingEl.hidden = true;
  gridEl.hidden    = false;
  updateSubmitBar();
}

// ── Real-time listener — keeps the grid live ─────────────────
// unsubscribeFn() is called after a successful submission so the listener
// cannot restore the grid after we have hidden it.
const unsubscribeFn = onValue(ref(db, 'gifts'), (snap) => {
  if (!snap.exists()) {
    loadingEl.hidden = true;
    gridEl.hidden    = false;
    gridEl.innerHTML = '<p style="color:var(--muted);padding:2rem 0;">No gifts have been listed yet — check back soon.</p>';
    return;
  }
  renderGifts(snap.val());
}, (err) => {
  console.error(err);
  loadingEl.hidden = true;
  errorEl.hidden   = false;
});

// ── Submit handler ───────────────────────────────────────────
submitBtn.addEventListener('click', async () => {
  if (selected.size === 0) return;

  submitBtn.disabled    = true;
  submitBtn.textContent = 'Saving…';

  const toClaimIds    = [...selected];
  const claimedNames  = [];
  const conflictNames = [];

  // Mark these as our own claims so the live re-render doesn't mistake them
  // for someone else taking them.
  toClaimIds.forEach(id => claiming.add(id));

  // Claim each selected gift atomically
  await Promise.all(toClaimIds.map(async (id) => {
    const giftRef = ref(db, `gifts/${id}`);
    const name    = latestGifts[id]?.name ?? id;
    try {
      const result = await runTransaction(giftRef, (current) => {
        // Abort if already claimed or missing — another guest got there first
        if (!current || current.claimed) return undefined;
        return { ...current, claimed: true };
      });

      if (result.committed) {
        claimedNames.push(name);
        selected.delete(id);
      } else {
        conflictNames.push(name);
        selected.delete(id);
      }
    } catch {
      conflictNames.push(name);
    }
  }));

  // Our claims have settled — clear the guard before surfacing real conflicts
  claiming.clear();

  // Surface any genuine conflicts (a gift someone else grabbed first)
  for (const name of conflictNames) {
    showToast(name);
  }

  if (claimedNames.length === 0) {
    // Everything conflicted — stay on the page
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Submit Selections';
    updateSubmitBar();
    return;
  }

  // Stop the live listener first — this is the key step that prevents Firebase
  // from firing onValue again and restoring the grid after we hide it.
  unsubscribeFn();

  // Tailor the thank-you wording to how many gifts were actually claimed
  thankyouTextEl.textContent = claimedNames.length === 1
    ? 'You’ve claimed your gift — your selection has been saved. We’re so grateful.'
    : `You’ve claimed your ${claimedNames.length} gifts — your selections have been saved. We’re so grateful.`;

  submitted          = true;
  introDesc.hidden   = true;
  gridEl.hidden      = true;
  submitBar.hidden   = true;
  thankyouEl.hidden  = false;

  // Notify the couple anonymously via Web3Forms (non-critical — fire and forget)
  if (WEB3FORMS_KEY && !WEB3FORMS_KEY.startsWith('REPLACE')) {
    try {
      await fetch('https://api.web3forms.com/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body:    JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject:    'Wedding Registry — Gifts Claimed',
          message:    `The following gifts have just been claimed:\n\n${claimedNames.map(n => `• ${n}`).join('\n')}`,
        }),
      });
    } catch {
      // Notification failure is non-critical; the gifts are already claimed in Firebase
    }
  }
});
