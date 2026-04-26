# Phase 1 Readiness Checklist

Use this checklist before starting Phase 1 implementation.

## 1) Fix local runtime first

- [ ] Run `make setup-local` from the project root.
- [ ] Confirm `supabase/functions/.env` exists.
- [ ] Add your real `GEMINI_API_KEY` to `supabase/functions/.env`.
- [ ] Run one-time project link:
  - `supabase login`
  - `supabase link --project-ref <PROJECT_REF>`

## 2) Spot-check Phase 0 manually

### Task 0.3 (N+1 query)
- [ ] Open Dashboard in browser.
- [ ] Open DevTools Network tab.
- [ ] Refresh Dashboard and confirm one videos request (not 1 + N post requests).
- [ ] Confirm rendered platforms/posts are still correct.

### Task 0.4 (delete UX)
- [ ] Open Library.
- [ ] Delete one video and confirm success toast appears.
- [ ] Spam-click delete and verify only one request is sent.
- [ ] Force/observe a delete failure path and confirm error toast appears.

## 3) Green-light gate for Phase 1

- [ ] `npm run build` passes locally.
- [ ] Any lint errors are understood as pre-existing or fixed.
- [ ] You can serve an edge function locally with:
  - `supabase functions serve upload-to-youtube --env-file ./supabase/functions/.env`
- [ ] Only after all items above are checked, start Phase 1.
