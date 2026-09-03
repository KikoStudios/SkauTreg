# Testing Guide

This page centralizes testing expectations previously spread across feature-specific markdown files.

## Smoke Tests

- Authentication login/logout works.
- Dashboard loads with troop context.
- Member CRUD works.
- Trip CRUD works.
- RSVP links open and save responses.

## Email and SMTP Tests

- Gmail SMTP can be connected in settings with a valid Google app password.
- Invalid SMTP credentials are rejected before the encrypted connection is saved.
- Draft creation/edit/delete works.
- Leader can send; non-leader cannot send.
- Smart tags resolve per recipient.

## LIVE Meetings Tests

- Session can be started and ended.
- Multiple users can collaborate in real-time.
- Presence list updates and stale users disappear.
- Replay view opens and timeline controls work.

## Deployment Verification

- Production Convex deploy completes.
- Production data import/transfer succeeds.
- Core user flows pass after deployment.

## Regression Guidance

- Run targeted tests after each feature merge.
- Keep feature-specific edge-case notes in `docs/changelog/` instead of root markdown.
