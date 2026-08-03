# Testing Guide (EN)

## 1) First fix for `next is not recognized`

Run in project root:

```bash
npm install
```

Then run again:

```bash
npm run dev
```

If backend is needed, in a second terminal:

```bash
npx convex dev
```

## 2) Smoke test

- Login/logout works.
- Dashboard loads.
- Member CRUD works.
- Trip CRUD works.
- RSVP links work.

## 3) Email + OAuth test

- Gmail connect in settings succeeds.
- OAuth callback persists connected email.
- Draft can be created/edited/deleted.
- Leader can send, non-leader cannot.
- `<user.name>` and `<user.sign.link>` resolve correctly.

## 4) LIVE meeting test

- Session can start/end.
- Two users see real-time edits.
- Presence list updates.
- Replay works.

## 5) Quick diagnostics

- If you still see `next is not recognized`, dependencies are missing or install was interrupted.
- Verify `node_modules` exists after `npm install`.
