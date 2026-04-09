# Next Chat Re-Entry Guide

## Short Re-Entry Prompt (paste this to start the next session)

> Read PROJECT_STATE.md and then implement Phase 5A — Tagging System as described there. Do not implement any other phase.

---

## Full Phase 5A Prompt

Use this if you want a more detailed phase kickoff:

---

**Phase 5A: Tagging System**

We're continuing LifeOPS. Read `PROJECT_STATE.md` first.

Build a lightweight undergraduate-MVP tagging system:

**Scope:**
- Add/remove tags on **Tasks** (create + edit dialogs)
- Add/remove tags on **Notes** (create + edit dialog — shared `NoteDialog` used for both notes and journal)
- Add/remove tags on **Documents** (upload dialog + a new edit flow)
- Filter by tag on the `/tasks`, `/notes`, and `/documents` pages

**Data layer:**
- `tasks.tags TEXT[]` and `notes.tags TEXT[]` already exist in the DB — **verify this before writing any SQL**
- `documents` table likely does NOT have a `tags` column yet — add it via a new migration `supabase/add_document_tags.sql`
- No separate `tags` table — free-form string arrays at MVP level

**UI requirements:**
- Tag chip input: a simple text input where the user types a tag and presses Enter or comma to add; chips displayed inline with an ✕ to remove; no autocomplete needed at MVP
- On list pages: a tag filter bar (or dropdown) showing all unique tags used; clicking one filters the list client-side
- Tag chips on each card/row in the list views

**Do not:**
- Build a global "Tags" management page
- Add tag colors or categories
- Add autocomplete/suggestions (keep it simple)
- Break any existing feature

**After completing:**
- Update `PROJECT_STATE.md` (mark Phase 5A complete, update next phase)
- Update `CLAUDE.md` phase roadmap

---

## Important Warnings for Next Session

1. **Run `add_vault.sql`** before testing Document Vault if not already done. Vault bucket must exist in Supabase Storage.
2. **`add_streak_protection.sql`** must be run before testing the Freeze feature on `/habits`.
3. **Never run `npx shadcn@latest add`** — all UI components are hand-written.
4. **Do not query `habits.name`** — the column is `habits.title`.
5. **`tags TEXT[]`** columns already exist on `tasks` and `notes` — check before adding a migration for those.
6. The `notes` table stores BOTH notes and journal entries distinguished by `type = 'note'` or `type = 'journal'`.
7. Storage downloads use signed URLs generated browser-side — never server-side for Documents.
