# Wedding Website — Project Context

A static multi-page wedding website for **Clarice & Giuseppe**, wedding date **21 August 2027** at **Agriturismo La Mandriola**, Lajatico, Tuscany, Italy.

Built entirely with plain HTML, CSS, and vanilla JavaScript — no framework, no build tools, no npm. All free to host and run indefinitely.

---

## Pages

| File | Purpose |
|---|---|
| `index.html` | Home / hero with countdown, welcome message, confetti on click |
| `schedule.html` | Day-of timeline (ceremony, cocktails, reception) |
| `travel.html` | Venue address, embedded Google Map, travel info, nearby attractions |
| `rsvp.html` | RSVP form with duplicate-prevention and email notification |
| `registry.html` | Gift registry with real-time claim/block functionality |

---

## Tech Stack & Dependencies

All free, no trials, no credit card required.

### Hosting — GitHub Pages
- Deploy by pushing to a public GitHub repo with Pages enabled
- Live URL format: `https://username.github.io/repo-name`
- Not yet deployed as of last session — this is the next step

### Database — Firebase Realtime Database
- **Project name:** Giftbase
- **Project ID:** `giftbase-39aa1`
- **Database URL:** `https://giftbase-39aa1-default-rtdb.europe-west1.firebasedatabase.app`
- **Region:** Belgium (europe-west1)
- **Plan:** Spark (free forever)
- Config lives in `js/firebase-config.js`
- Firebase JS SDK loaded via CDN (no npm): `https://www.gstatic.com/firebasejs/10.12.2/firebase-*.js`

**Data structure:**
```
/gifts/{gift-id}         → gift objects (name, description, price, image_url, claimed, order)
/rsvps/{email-key}       → true  (email stored as safe key for duplicate-check only)
```

**Security rules** (in `firebase-rules.json` — paste into Firebase Console → Realtime Database → Rules → Publish):
- `gifts`: public read; write only allowed when flipping `claimed: false → true` (no un-claiming, no deletes)
- `rsvps`: public read (needed for duplicate check); write only if the key doesn't already exist

Rules are currently published and live.

### Email Notifications — Web3Forms
- **API key:** `a7301e6b-62c4-483b-a5b1-aa7e4813293d`
- Free tier: 250 submissions/month
- Used for: RSVP notification emails + gift claim notification emails
- Key stored in `js/firebase-config.js` as `WEB3FORMS_KEY`
- This key is visible in client-side JS (acceptable for a private wedding site)
- **To-do:** Once deployed, lock to your domain in the Web3Forms dashboard (Allowed Domains setting)

---

## Key Files

### `js/firebase-config.js`
Single source of truth for all credentials. Two exports:
- `firebaseConfig` — Firebase connection object
- `WEB3FORMS_KEY` — Web3Forms API key

### `js/registry.js`
- Loads gifts in real-time via `onValue` Firebase listener
- Checkbox-based selection; nothing writes to Firebase until Submit is pressed
- Uses `runTransaction` to atomically claim gifts (race-condition safe)
- Unsubscribes the Firebase listener on successful submission (prevents the grid re-appearing)
- `[hidden]` CSS override in `style.css` is critical — without `[hidden] { display: none !important }`, the `.gift-grid { display: grid }` CSS rule overrides the hidden attribute and the grid never hides
- Cache-busted via `?v=N` query string on the script tag — increment when making changes

### `js/rsvp.js`
- Checks Firebase for duplicate email on blur (early feedback) and again on submit (final check)
- Email stored as a transformed key: dots→commas, @→`_at_`, special chars→underscore
- Firebase write happens first (deduplication); Web3Forms notification is fire-and-forget (failure doesn't block the guest or re-enable the form)
- Dietary requirements use `data.getAll('dietary')` to collect multiple checkbox values
- Cache-busted via `?v=N` query string on the script tag

### `css/style.css`
- Single stylesheet for all pages
- CSS custom properties (variables) defined at `:root` — easy to retheme
- Key line at top: `[hidden] { display: none !important; }` — do not remove

### `gifts-seed.json`
- The canonical gift list to import into Firebase
- Import via Firebase Console → Realtime Database → Data → ⋮ → Import JSON at the **root**
- Prices in euros
- After import, gifts sit at `/gifts/gift-001` … `/gifts/gift-010`
- If you need to reset/update gifts, re-import this file at the root (overwrites everything including any claimed state)

### `firebase-rules.json`
- Source of truth for security rules
- Must be manually pasted into Firebase Console → Realtime Database → Rules and published

---

## What Still Needs Doing

1. **Deploy to GitHub Pages** — create a public repo, push all files, enable Pages. This gives you the shareable guest URL.
2. **Lock Web3Forms to your domain** — in the Web3Forms dashboard, add your GitHub Pages URL under Allowed Domains once deployed.
3. **Replace placeholder contact email** — `couple@example.com` appears in `rsvp.html` (line 39) on the "You've already RSVP'd" screen. Replace with a real address.
4. **Customise gift list** — the current `gifts-seed.json` has 10 placeholder gifts. Edit the file and re-import when you have your real list.
5. **Add photos** — hero image on the home page and gift images. Add images to the `images/` folder and reference them in the HTML / `gifts-seed.json`.

---

## Local Development

A Python HTTP server is configured in `.claude/launch.json`:
```
python -m http.server 3000
```
Start it via the Claude preview panel, or run manually in the project folder.
The site runs at `http://localhost:3000`.

**Browser caching:** JS modules (`registry.js`, `rsvp.js`) are cached aggressively.
After editing either file, increment the `?v=N` version query string in the relevant HTML `<script>` tag, and hard-refresh with `Ctrl+Shift+R`.

---

## Design Decisions & Gotchas

- **No framework** — plain HTML/CSS/JS for zero maintenance overhead. The site needs to work without anyone touching it for 15 months.
- **Firebase Realtime Database, not Firestore** — Firestore's free tier pauses after 7 days of inactivity, which would silently break the registry. Realtime Database does not pause.
- **Web3Forms, not Formspree** — Formspree's free tier is 50 submissions/month; a wedding could hit that in one day.
- **`[hidden] { display: none !important }`** — CSS specificity issue: `.gift-grid { display: grid }` outranks the browser's default `[hidden]` rule. This one line in `style.css` is load-bearing.
- **Gift registry is anonymous** — no guest name is stored in Firebase. Only the couple receives the name (via the Web3Forms notification email). This is intentional for privacy.
- **Confetti** — pure canvas JS on `index.html` only; fires on any click that isn't a button or link. Wedding colour palette: rose, gold, cream, sage green.
