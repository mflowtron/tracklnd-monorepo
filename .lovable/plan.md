

# Dashboard CRUD Operations

Add full create, edit, and delete functionality to all four dashboard management pages using Dialog-based forms.

## Overview

Each dashboard tab currently displays read-only lists. This plan adds modal dialogs for creating and editing records, delete confirmations, and inline actions like toggling banner status and changing user roles.

## Shared Pattern

All CRUD operations will follow the same pattern:
- Dialog-based forms using the existing `Dialog` component from shadcn/ui
- `react-hook-form` + `zod` for validation (already installed)
- Toast notifications on success/failure using `sonner`
- Data refetch after mutations by extracting the fetch logic into a `loadData()` function called on mount and after every mutation
- Delete confirmations using `AlertDialog`

---

## 1. Meets CRUD (`MeetsTab.tsx`)

**Create/Edit Meet Dialog** (new component: `src/components/dashboard/MeetFormDialog.tsx`):
- Fields: name, slug (auto-generated from name), description (textarea), venue, location, start_date, end_date, status (select: draft/upcoming/live/archived), hero_image_url, broadcast_partner, broadcast_url, cta_label, cta_url
- Slug auto-generation: converts name to lowercase, replaces spaces with hyphens
- On create: `supabase.from('meets').insert()`
- On edit: `supabase.from('meets').update().eq('id', meetId)`

**Delete Meet**:
- AlertDialog confirmation: "This will permanently delete this meet and all associated events and entries."
- `supabase.from('meets').delete().eq('id', meetId)`

**Changes to MeetsTab.tsx**:
- Wire "Create Meet" button to open the form dialog in create mode
- Add "Edit" and "Delete" action buttons to each meet row
- Extract data loading into a `loadMeets()` function, call after mutations
- Add state for `editingMeet` and `showDeleteId`

---

## 2. Content/Works CRUD (`ContentTab.tsx`)

**Create/Edit Work Dialog** (new component: `src/components/dashboard/WorkFormDialog.tsx`):
- Fields: title, slug (auto-generated), work_type (select: short/work/feature), status (select: draft/published/archived), summary (textarea), body (textarea, larger), cover_image_url, tags (comma-separated text input parsed to string array), published_at (auto-set when status changes to "published")
- author_id auto-set to current user's profile ID
- On create: `supabase.from('works').insert()`
- On edit: `supabase.from('works').update().eq('id', workId)`

**Delete Work**:
- AlertDialog confirmation
- `supabase.from('works').delete().eq('id', workId)`

**Changes to ContentTab.tsx**:
- Wire "Create Work" button to open the form dialog
- Add "Edit" and "Delete" buttons to each work row
- Extract data loading into `loadWorks()`, refetch after mutations

---

## 3. Banners CRUD (`BannersTab.tsx`)

**Create/Edit Banner Dialog** (new component: `src/components/dashboard/BannerFormDialog.tsx`):
- Fields: title, subtitle, image_url, cta_label, cta_url, placement (select: homepage/meet), meet_id (select dropdown of meets, shown only when placement is "meet"), is_active (switch)
- On create: `supabase.from('banners').insert()`
- On edit: `supabase.from('banners').update().eq('id', bannerId)`

**Delete Banner**:
- AlertDialog confirmation
- `supabase.from('banners').delete().eq('id', bannerId)`

**Inline toggle**: Clicking the active badge toggles `is_active` directly via update

**Changes to BannersTab.tsx**:
- Wire "Create Banner" button to open form dialog
- Add "Edit", "Delete", and active toggle to each banner row
- Extract data loading into `loadBanners()`

---

## 4. Users / Role Management (`UsersTab.tsx`)

**Role management** (no full user CRUD -- users are created via signup):
- Add a dropdown/select to each user row allowing admins to change role between "admin" and "viewer"
- On role change: `supabase.from('user_roles').update({ role: newRole }).eq('user_id', userId)`
- Confirmation dialog when promoting to admin or demoting from admin
- Toast notification on success

**Changes to UsersTab.tsx**:
- Add role change dropdown with confirmation AlertDialog
- Refetch data after role changes

---

## New Files

| File | Purpose |
|---|---|
| `src/components/dashboard/MeetFormDialog.tsx` | Create/edit meet form dialog |
| `src/components/dashboard/WorkFormDialog.tsx` | Create/edit work form dialog |
| `src/components/dashboard/BannerFormDialog.tsx` | Create/edit banner form dialog |
| `src/components/dashboard/DeleteConfirmDialog.tsx` | Reusable delete confirmation dialog |

## Modified Files

| File | Changes |
|---|---|
| `src/pages/dashboard/MeetsTab.tsx` | Add create/edit/delete actions, extract loadMeets() |
| `src/pages/dashboard/ContentTab.tsx` | Add create/edit/delete actions, extract loadWorks() |
| `src/pages/dashboard/BannersTab.tsx` | Add create/edit/delete/toggle actions, extract loadBanners() |
| `src/pages/dashboard/UsersTab.tsx` | Add role change dropdown with confirmation |

## Technical Details

- All form dialogs accept an optional `initialData` prop -- when present, the dialog is in "edit" mode; when absent, "create" mode
- Slug fields auto-generate from the name/title but remain editable
- All mutations use the Supabase JS client directly (RLS policies already enforce admin-only writes)
- No database schema changes needed -- all tables and RLS policies are already in place
- Error handling: catch Supabase errors and display them via toast
- Loading states: disable form submit button and show spinner during mutation

