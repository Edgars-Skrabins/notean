# Attachments — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-28

# Part 1 — Business logic and usage

Teams need to keep files next to their work: screenshots and logs on a ticket, diagrams and PDFs on a page, images inside a page's text. This feature adds attachments to **tickets** and **pages**:

- **Tickets** get a file list in the ticket popup.
- **Pages** get inline images inside the Tiptap content and a file list on the page detail.

Files are private. They are never reachable through a public URL: every download goes through the API with the user's token and the same visibility check as the item the file belongs to.

- **Users:** every team member who can see the ticket or page (project visibility rules apply). Admins and the owner see the team's storage usage on Manage team.

- **Usage — ticket popup:**
  1. Below the description, an **Attachments** section lists the ticket's files, newest first. Each row shows a small preview for images (PNG, JPEG, GIF, WebP; the original scaled by CSS) or a file-type icon otherwise, then the file name, size, uploader nickname and upload date.
  2. Files are added with an **Upload** button (multi-select file picker), by dropping files anywhere on the popup, or by pasting files or images from the clipboard while the popup has focus (a paste into the title or description with only text in the clipboard behaves as before).
  3. Each file being uploaded shows as a row with its name and upload progress. On failure the row disappears and a toast names the error (too large, quota exceeded, network).
  4. Clicking an image row opens it in a preview overlay (Esc or the close button closes it, with a Download button). Clicking any other row downloads the file under its original name.
  5. Rows the user may delete show a delete icon button (tooltip "Delete attachment"); deleting asks for confirmation with `ConfirmDialogComponent`.
  6. Empty state: "No attachments yet" next to the Upload button.
  7. Others with the board open see uploads and deletions live: the open popup's list refreshes and Kanban cards show a paperclip icon with the file count when it is above 0. List rows are unchanged.

- **Usage — pages:**
  1. The page detail has an **Attachments** section below the content with the same file list, Upload button, drop and paste behaviour, preview, download and delete as tickets. It works in view, edit and create mode.
  2. In edit and create mode the editor toolbar gets an **Image** button (image file picker). Pasting or dropping an image (PNG, JPEG, GIF, WebP) into the editor inserts it inline at the cursor or drop point; other file types dropped or pasted into the editor go to the file list instead. While an inline image uploads, a placeholder shows at its position; on failure the placeholder is removed and a toast names the error.
  3. Inline images render at their natural size, capped at the content width. They can't be resized or aligned. They don't appear in the file list.
  4. In view mode, inline images load the same way (through the API) and show a neutral placeholder while loading or when the file is gone.
  5. In create mode (`…/new`, nothing saved yet) files and images can be added as **pending uploads**. They become the page's attachments when Create succeeds. Discarding the new page deletes them.
  6. Removing an inline image from the content and saving deletes that image's file.
  7. Copying an inline image from page A and pasting it into page B gives page B its own copy (same stored bytes, no re-upload) once B is saved, so B keeps it even if A deletes it.

- **Usage — Manage team:** admins and the owner see "Storage: X MB of 500 MB used".

- **Rules:**
  - Any file type is allowed, up to **25 MB per file**. Only PNG, JPEG, GIF and WebP are previewed or rendered inline; inline images must be one of those types.
  - Each team has a **500 MB** storage quota: the sum of the sizes of all its attachment rows (pending, trashed and copied ones included; a copy counts again even though the bytes are shared). An upload or a page save that would go over it fails with `STORAGE_QUOTA_EXCEEDED`.
  - Viewing, downloading and uploading require being able to see the item (team member, item's feature on, project visible). A file owned by an item the user can't see is a 404, exactly like the item.
  - Template-owned images (see Related specs) are visible to every member of the team.
  - Deleting an attachment is allowed for its uploader, team admins and the owner. Anyone else gets 403. Inline images are removed by editing the content, which any member who can edit the page may do.
  - Downloads are served with `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`, except the four image types, which are served inline with their own content type. Uploaded HTML, SVG and the like therefore never render in the app's origin.
  - Files belong to the item, not the uploader: they stay when the uploader leaves or is removed from the team, or deletes their account (the row keeps their last nickname, like other content).
  - Deleting a ticket or page (single, bulk, through its folder, board or team) deletes its attachments; the stored bytes are purged once no attachment row uses them anymore.
  - Pending uploads not claimed within **24 hours** are deleted.
  - Attachment changes on a ticket never change its `lock_version`, but refresh its `updated_at` (like assignee changes). Page saves that drop or copy inline images happen inside the normal page save.
  - If a save drops an inline image that another user's unsaved draft still shows, the other user's next save goes through the edit-conflict check as usual; on *Overwrite* the image is gone from their content too.

- **Related specs:**
  - **trash:** trashed tickets and pages keep their attachments (still counted toward the quota) so a restore brings them back; files are only listed and downloadable while the item itself is reachable. Purging an item deletes its attachments like any other delete. The pending-upload cleanup (`Attachment.purge_stale_pending`) runs on the same recurring scheduler the trash spec sets up for its 14-day purge; whichever spec lands second wires the call.
  - **templates:** templates have **no file list**, only inline images in their content. An item created from a template references the template's images by the same `data-attachment-id` (no new rows, no copied bytes); template-owned images are visible to the whole team. A template-owned image is only purged when the template no longer uses it **and** no page references it (tracked by `AttachmentReference`). The templates spec decides the template model; this spec makes `Attachment#attachable` accept it through `Attachment::TEMPLATE_TYPES`, wired by whichever spec lands second.
  - **comments:** comments get no attachments in this spec. The polymorphic `Attachment` model can take `Comment` later.
  - **mentions, notifications-inbox, copy-link, chat:** no interaction.

- **Out of scope:**
  - Attachments on diagrams, comments or chat (not asked for; the model allows adding them later).
  - Server-side thumbnails or image variants (would need `image_processing` and libvips on every machine).
  - Renaming attachments, resizing or aligning inline images.
  - A configurable or per-plan quota, and S3 or other remote storage (a later `storage.yml` change).
  - Searching attachment names or contents in global search.
  - Virus scanning.

# Part 2 — Technical details

## 2.1 Tools and libraries

- Backend: Active Storage with the existing `local` Disk service (`config/storage.yml`), as avatars use. No `image_processing` gem.
- Frontend: Tiptap 3 core with a custom node (no `@tiptap/extension-image`), axios (`onUploadProgress`, `responseType: 'blob'`), Angular CDK overlay for the preview.
- The content-security policy in `frontend/src/index.html` already allows `img-src blob:` and `connect-src http://127.0.0.1:3000`; it needs no change.
- No new dependencies.

## 2.2 Structure

### Data model (edit the single `create_schema` migration and rebuild, per the project's schema approach)

`attachments`
| column | type | notes |
|---|---|---|
| `team_id` | references, not null | quota and pending scope |
| `attachable_type` | string, null | `Ticket`, `Page`, or a template type; null while pending |
| `attachable_id` | bigint, null | null while pending |
| `kind` | string, not null | `file` (file list) or `inline` (image in page content) |
| `byte_size` | bigint, not null | copied from the blob, summed for the quota |
| `created_by_user_id` | references users, not null | uploader (`creator` association) |
| timestamps | | |

Indexes: `[attachable_type, attachable_id, kind]`, `[team_id]`, `[team_id, attachable_id, created_at]` partial where `attachable_id IS NULL` (pending cleanup).

`attachment_references` (pages that show an image they don't own, i.e. template images)
| column | type |
|---|---|
| `attachment_id` | references, not null |
| `page_id` | references, not null |

Unique index on `[attachment_id, page_id]`.

`tickets.attachments_count` integer, not null, default 0.

### Backend models

- `Attachment` (`app/models/attachment.rb`): `belongs_to :team`, `belongs_to :attachable, polymorphic: true, optional: true`, `belongs_to :creator`, `has_one_attached :file`, `has_many :attachment_references, dependent: :delete_all`.
  - Constants: `MAX_BYTES = 25.megabytes`, `TEAM_QUOTA_BYTES = 500.megabytes`, `IMAGE_TYPES = %w[image/png image/jpeg image/gif image/webp]`, `KINDS = %w[file inline]`, `ATTACHABLE_TYPES = %w[Ticket Page]`, `TEMPLATE_TYPES = []` (the templates spec adds its type), `PENDING_TTL = 24.hours`.
  - Validations: file attached, `byte_size <= MAX_BYTES`, `kind` in `KINDS`, inline requires an `IMAGE_TYPES` content type, ticket attachables only take `file`.
  - Scopes: `files` (`kind: "file"`), `inline`, `pending` (`attachable_id: nil`), `newest_first`.
  - `Attachment.team_usage(team)` sums `byte_size`; `Attachment.fits_quota?(team, extra_bytes)`.
  - `copy_for(attachable, user)` builds a new row on the same blob (`file.attach(file.blob)`), same kind and size.
  - `after_destroy_commit :purge_unused_blob`: purges the blob later only if no other `active_storage_attachments` row uses it. The `has_one_attached` uses `dependent: false` so a shared blob is never purged early.
  - `after_create` / `after_destroy` for `Ticket` attachables: `Ticket.update_counters(id, attachments_count: ±1)` plus `Ticket.refresh_updated_at`, both without touching `lock_version`.
  - `Attachment.purge_stale_pending` destroys pending rows older than `PENDING_TTL`.
- `Ticket` and `Page`: `has_many :attachments, as: :attachable, dependent: :destroy`. `Page` also `has_many :attachment_references, dependent: :delete_all`.
- `Team`: `has_many :attachments, dependent: :destroy` (team deletion).
- `PageAttachments` (`app/models/page_attachments.rb`, plain Ruby, used by `PagesController#create` and `#update` whenever content is saved), `PageAttachments.sync(page, user, project_access, pending_file_ids)`:
  1. Collect the ids of `img[data-attachment-id]` in the sanitised content (Nokogiri).
  2. For each id: owned by this page → keep. Pending and created by `user` in this team → claim (`attachable = page`). Owned by a `TEMPLATE_TYPES` item of this team → keep and ensure an `AttachmentReference`. Owned by another ticket or page `user` can see (via `project_access`) → `copy_for(page, user)` and rewrite the id in the content. Anything else → remove the `img`.
  3. Claim `pending_file_ids` (pending, created by `user`, team) as `file` attachments of the page.
  4. Destroy the page's `inline` attachments no longer referenced, and delete `AttachmentReference`s of this page no longer referenced; a template image left with no template use and no references is destroyed (the templates spec calls the same check when a template drops an image).
  5. If copies would exceed the quota, the save fails with 422 `STORAGE_QUOTA_EXCEEDED` and nothing is written (run inside the page save transaction).
- Page HTML sanitising: the `SafeListSanitizer` calls in `PagesController` allow `img` with only `data-attachment-id` and `alt` (no `src`), through one shared helper (`PageContent.sanitize`, `app/models/page_content.rb`) used by create and update. `SearchText` ignores images.

### API

All under `teams/:team_code`, with the usual `set_team` → `authorize_team_member!` → feature gate → `set_<resource>` chain. New controller concern `AttachmentJson` (`attachment_json`: `id`, `filename`, `content_type`, `byte_size`, `kind`, `uploader` (`member_json`), `created_at`).

| Method and path | Controller#action | Notes |
|---|---|---|
| `POST boards/:board_id/tickets/:ticket_id/attachments` | `TicketAttachmentsController#create` | multipart `attachment[file]`; 201 `{ attachment }`; broadcasts `tickets_upserted` with the ticket |
| `DELETE boards/:board_id/tickets/:ticket_id/attachments/:id` | `TicketAttachmentsController#destroy` | 204; uploader, admin or owner, else 403 `FORBIDDEN`; broadcasts `tickets_upserted` |
| `POST pages/:page_id/attachments` | `PageAttachmentsController#create` | multipart `attachment[file]`, `attachment[kind]` (`file`/`inline`); 201 `{ attachment }` |
| `DELETE pages/:page_id/attachments/:id` | `PageAttachmentsController#destroy` | `file` kind only (inline ones go through content); same permission rule |
| `POST attachments` | `AttachmentsController#create` | pending upload for page create mode (`file`, `kind`); requires pages enabled |
| `DELETE attachments/:id` | `AttachmentsController#destroy` | the user's own pending upload only (discarding a new page) |
| `GET attachments/:id/file` | `AttachmentsController#file` | streams the bytes (`send_data` of `file.download`) after the access check below |
| `GET storage_usage` | `TeamsController#storage_usage` | admin/owner; `{ storage: { used_bytes, quota_bytes } }` |

- Access check for `file` (`Attachment#visible_to?` via a controller helper): pending → only its uploader; `Ticket` → `project_access.scope` of the board's tickets and boards enabled; `Page` → `project_access.scope(@team.pages)` and pages enabled; template types → any member. Otherwise 404 `ATTACHMENT_NOT_FOUND`. Trashed items (trash spec) count as not visible.
- Upload errors: 422 `FILE_REQUIRED`, 422 `FILE_TOO_LARGE`, 422 `INLINE_IMAGE_TYPE_INVALID`, 422 `STORAGE_QUOTA_EXCEEDED` (checked before attaching), 422 `ATTACHMENT_UPLOAD_FAILED`.
- `ticket_json` gains `attachments` (`files`, newest first, preloaded with blob and creator avatar); `ticket_summary_json` gains `attachment_count` from the counter column.
- `page_json` (detail) gains `attachments` (file kind, newest first). Page create accepts `attachment_ids` (pending file-list uploads); create and update responses carry the content as rewritten by `PageAttachments.sync`.
- Strong params in `ApplicationController`: `attachment_params` (`:file`, `:kind`) and `attachment_ids: []` added to `create_page_params`.
- New module `ErrorCodes::Attachments` (`app/errors/error_codes/attachments.rb`): `ATTACHMENT_NOT_FOUND`, `FILE_REQUIRED`, `FILE_TOO_LARGE`, `INLINE_IMAGE_TYPE_INVALID`, `STORAGE_QUOTA_EXCEEDED`, `ATTACHMENT_UPLOAD_FAILED`.
- Routes added to `config/routes.rb` next to the existing ticket and page routes.

### Frontend

- `models/attachment.model.ts`: `Attachment { id, filename, contentType, byteSize, kind, uploader: Member, createdAt }`, `AttachmentKind = 'file' | 'inline'`, result union types. `Ticket` gains `attachments?` and `attachmentCount`; `PageDetail` gains `attachments`.
- `config/errorCodes/attachments.ts` mirroring the backend module, exported from `index.ts`; `config/attachmentLimits.ts` with `ATTACHMENT_MAX_BYTES` and `IMAGE_TYPES` (client-side pre-check for size and inline type, server stays authoritative).
- `services/attachment.service.ts` (`providedIn: 'root'`): `uploadToTicket`, `uploadToPage`, `uploadPending` (multipart `FormData`, progress callback), `deleteFromTicket`, `deleteFromPage`, `deletePending`, `objectUrl(teamCode, id)` (fetches `attachments/:id/file` as a blob once, caches the `blob:` URL per id, `release(id)` revokes it), `download(teamCode, attachment)` (blob → temporary `<a download>`), `storageUsage(teamCode)`. All through `apiRequest` and `teamPath`, `map*` functions for snake_case.
- `utils/formatBytes.ts`: `formatBytes(bytes)` → "12.4 MB" style string, with tests.
- `components/attachment-list/` (`AttachmentListComponent`): inputs `attachments`, `uploads` (in-progress rows), `canDelete(attachment)` callback or `currentUserId` plus role; outputs `filesSelected(File[])`, `deleteRequested`, `opened`. Renders rows, empty state, Upload button (`app-button`), delete `app-icon-button` with tooltip. Image previews use `objectUrl`.
- `components/attachment-row/` (`AttachmentRowComponent`) if the list's styles outgrow the budget.
- `components/attachment-preview/` (`AttachmentPreviewComponent`): CDK overlay showing an image `blob:` URL with Download and close; pushes onto `EscapeService`.
- `utils/fileDrop.ts`: helpers to read `File[]` from a `DragEvent` and a `ClipboardEvent` (files only), used by the ticket popup, page detail and editor.
- `RichTextEditorComponent`: a custom `AttachmentImage` Tiptap node (`components/rich-text-editor/attachmentImage.ts`) with attrs `attachmentId` and `alt`, parsed from and rendered to `<img data-attachment-id alt>`, and a node view that sets `src` from `AttachmentService.objectUrl` (placeholder while loading or on failure). New inputs `teamCode` and `uploadImage: (file: File) => Promise<number | null>`; new output `filesDropped(File[])` for non-image files. `handlePaste` / `handleDrop` upload images through `uploadImage` with an upload placeholder; toolbar Image button opens a file picker.
- `PageDetailComponent`: view mode renders the content through `app-rich-text-editor` with `[editable]="false"` (Angular's `innerHTML` sanitiser would drop `data-attachment-id`), adds the Attachments section, supplies `uploadImage` (page upload in view/edit, pending upload in create), tracks pending file-list ids and sends `attachmentIds` on Create, deletes pending uploads on discard, and replaces its content with the response content after a save.
- `FolderedItemService` / page service: create sends `attachment_ids`; page mapping includes `attachments`.
- `TicketDetailComponent`: Attachments section under the description with drop and paste handling on the popup; uploads and deletes update the shared board through `BoardPageStateService` (so `ticketChanges$` and the Kanban count follow). `BoardChannelService`'s `tickets_upserted` handling already refreshes the ticket; the popup re-reads `attachments` from remote changes.
- `KanbanTicketComponent`: paperclip icon plus `attachmentCount` when above 0 (add a `paperclip` icon to `IconComponent` if missing).
- `ManageTeamComponent`: storage line for admins and the owner, from `AttachmentService.storageUsage`.
- i18n: new `PHRASES` keys (ATTACHMENTS, UPLOAD, NO_ATTACHMENTS, DELETE_ATTACHMENT, CONFIRM_DELETE_ATTACHMENT, INSERT_IMAGE, DOWNLOAD, STORAGE_USAGE with `{{used}}` and `{{quota}}`, UPLOADING) and `ERRORS.ATTACHMENTS.*` in every translation file.

## 2.3 Decisions

1. **Which items?** Tickets (file list) and pages (inline images + file list). Diagrams and comments excluded for now; the comments spec leaves comment attachments to a later spec. (2026-10-28)
2. **File types:** any type; only PNG, JPEG, GIF, WebP are previewed and rendered inline. Rejected: an allow-list (users hit walls) and a block-list (incomplete by nature). Safety comes from serving everything else as a download with `nosniff`. (2026-10-28)
3. **Size limit:** 25 MB per file. Rejected 10 MB (too tight for PDFs) and 100 MB (slow without direct uploads). (2026-10-28)
4. **Quota:** 500 MB per team, counting every attachment row including pending, trashed and copied ones. Shown on Manage team to admins and the owner; uploads past it fail with `STORAGE_QUOTA_EXCEEDED`. (2026-10-28)
5. **Storage:** Active Storage on the existing Disk service, like avatars. S3 is a later config change. (2026-10-28)
6. **Serving:** an authorised API endpoint fetched with the Bearer token and shown through `blob:` URLs; page HTML stores only `data-attachment-id`. Rejected: short-lived signed URLs (a copied link works for anyone until it expires) and avatar-style proxy URLs (permanent and public). (2026-10-28)
7. **Thumbnails:** none on the server; the original image is scaled by CSS in lists. Rejected server variants (new libvips system dependency) and icons-only. (2026-10-28)
8. **Delete permission:** uploader, admins and owner. Rejected anyone-who-can-see and uploader-only. (2026-10-28)
9. **Adding files:** upload button, drag and drop, and paste. Images into the editor go inline; other files go to the file list. (2026-10-28)
10. **Inline image removed from content:** its attachment is deleted on save. Rejected moving it to the file list and keeping invisible orphans. (2026-10-28)
11. **Trash:** attachments stay while the item is trashed (and still count toward the quota), and are purged with the item. (2026-10-28)
12. **Templates:** templates have no file list, only inline images; items made from a template reference the same image id without copying rows or bytes. Template images are visible to every team member and are purged only when neither the template nor any page uses them. (2026-10-28)
13. **Create mode:** files and images can be added before Create as pending uploads, claimed on Create; unclaimed ones are deleted after 24 hours by the trash spec's recurring scheduler. Rejected disabling uploads until created. (2026-10-28)
14. **Live updates:** ticket attachment changes broadcast `tickets_upserted`; Kanban cards show a paperclip count. List rows unchanged. (2026-10-28)
15. **Cross-page paste:** a pasted inline image owned by another item the user can see becomes the new page's own row on the same blob; ids the user can't see are removed. Rejected stripping pasted images. (2026-10-28)
16. **Inline image layout:** natural size capped at content width; no resize or alignment. (2026-10-28)
17. **File list:** newest first, no rename. (2026-10-28)
18. **Ticket counters:** attachment changes refresh the ticket's `updated_at` but never its `lock_version`, matching assignee changes. (2026-10-28)
19. **Page view mode** renders through the read-only editor so `data-attachment-id` survives Angular's `innerHTML` sanitiser and images resolve through the same node view. (2026-10-28)
20. **Shared blobs:** a blob is purged only when no attachment row uses it, since copies and template references share bytes. (2026-10-28)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: record the counts of `bin/rails test` in `backend/` and `npm test` in `frontend/`.

### A. Data model
- [ ] A1. Add `attachments`, `attachment_references` and `tickets.attachments_count` to the `create_schema` migration with the indexes in 2.2; rebuild the dev and test databases and check `db/schema.rb` holds only this branch's tables.
- [ ] A2. Add the `Attachment` model with constants, validations, scopes, `team_usage`, `fits_quota?`, `copy_for`, shared-blob purge, ticket counter and `updated_at` callbacks, and `purge_stale_pending`; add `AttachmentReference`. Associations on `Ticket`, `Page` and `Team`. Fixtures in `test/fixtures/attachments.yml` (with Active Storage blob fixtures).
- [ ] A3. Model tests: size and inline type validation, ticket kind rule, quota sum, a copy keeps the blob alive after the original is destroyed, the counter changes without bumping `lock_version`, `purge_stale_pending` keeps fresh and claimed rows.

### B. API
- [ ] B1. Add `ErrorCodes::Attachments`, the `AttachmentJson` concern, strong params and routes.
- [ ] B2. `TicketAttachmentsController#create` / `#destroy` with quota and permission checks and `BoardBroadcast.tickets_upserted`; `ticket_json` `attachments` and `ticket_summary_json` `attachment_count` with preloads. Controller tests: upload, too large, over quota, hidden project 404, boards disabled 403, delete by uploader/admin/owner and 403 for others, broadcast sent, query-count test for the board show and tickets index.
- [ ] B3. `AttachmentsController#create` (pending), `#destroy` (own pending only) and `#file` with the access check and response headers. Tests: each attachable type's visibility, pending visible only to its uploader, `Content-Disposition` attachment for a non-image and inline for PNG, `nosniff` present.
- [ ] B4. `PageContent.sanitize` (img with only `data-attachment-id` and `alt`) used by both page create and update; test that `src` and other attributes are stripped.
- [ ] B5. `PageAttachments.sync` wired into `PagesController#create` (with `attachment_ids`) and `#update` when content changes; `page_json` gains `attachments`. Tests: claim pending inline and file uploads, foreign pending ids removed, removed inline image destroyed, cross-page copy for a visible page and removal for a hidden one, quota failure on copy rolls back the save, content in the response is rewritten.
- [ ] B6. `PageAttachmentsController#create` / `#destroy` (file kind only for destroy). Tests as in B2 minus broadcast.
- [ ] B7. `TeamsController#storage_usage` (admin/owner). Test the sum and the 403 for a `user`.
- [ ] B8. Check every delete path removes attachments: single and bulk ticket delete, board, page, folder and team deletion. Add a test per path that the attachment rows are gone.

### C. Frontend building blocks
- [ ] C1. `attachment.model.ts`, `config/errorCodes/attachments.ts`, `config/attachmentLimits.ts`, all PHRASES and every translation file.
- [ ] C2. `AttachmentService` with upload progress, deletes, cached `objectUrl` and `release`, `download`, `storageUsage`, and its spec (mapping, error codes, URL cache reuse and revoke).
- [ ] C3. `utils/formatBytes.ts` and `utils/fileDrop.ts` with tests.
- [ ] C4. `AttachmentListComponent` (and `AttachmentRowComponent` if needed) and `AttachmentPreviewComponent` with `EscapeService`; spec for empty state, delete visibility and the upload rows.

### D. Tickets
- [ ] D1. Map `attachments` and `attachmentCount` on tickets; `BoardPageStateService` updates the ticket on upload and delete.
- [ ] D2. Ticket popup Attachments section with upload, drop, paste, preview, download, delete confirm and error toasts; remote changes refresh the list. Spec for the paste-with-text case staying a normal paste.
- [ ] D3. Paperclip count on `KanbanTicketComponent`.

### E. Pages
- [ ] E1. `AttachmentImage` Tiptap node with node view, upload placeholder, paste and drop handling and the toolbar Image button in `RichTextEditorComponent`; spec for parse/render keeping `data-attachment-id` and dropping `src`.
- [ ] E2. `PageDetailComponent`: read-only editor in view mode, Attachments section in all modes, pending uploads in create mode sent as `attachmentIds`, pending deleted on discard, content replaced from the save response. Update the page service and its spec.

### F. Manage team
- [ ] F1. Storage usage line on `ManageTeamComponent` for admins and the owner.

### Z. Wrap-up
- [ ] Z1. Full test runs, build (style budgets) and lint, `bin/brakeman`, using the commands in `CLAUDE.md`.
- [ ] Z2. Update the root `CLAUDE.md` (attachments model, endpoints, serving rule, `AttachmentService`, quota) and add a note to the trash and templates specs' integration if those landed first.
- [ ] Z3. Manual check in the running app: upload, paste and drop files on a ticket and watch a second browser's Kanban count update; add inline images to a new page before Create and after; remove one and save; paste an image into another page; download a non-image and confirm it downloads; confirm a member outside the project gets 404 on the file URL; check Manage team storage.
