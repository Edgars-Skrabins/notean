# Avatar image resize — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-26

# Part 1 — Business logic and usage

Avatar images are stored and served exactly as uploaded, up to 2 MB each, even though they are shown as small circles. They are also served through ActiveStorage redirect URLs that expire after a few minutes, so browsers keep downloading them again. A board or member list with ten photo avatars can pull several megabytes. This change resizes avatars in the browser to a 128×128 WebP before upload, lowers the server's limit to match, and serves avatars from stable URLs that browsers cache.

- **Users:** anyone who sets a profile picture on the Profile page, and everyone who sees avatars (lists, boards, tickets, members, header).
- **Usage:**
  - On the Profile page the user picks a PNG, JPEG or WebP file of any size, as before, except the old 2 MB limit no longer applies to the original file.
  - The browser center-crops it to a square, scales it to 128×128 and encodes it as WebP. The preview shows the resized image, and Save uploads it.
  - If the resized image is still over the limit, which is practically impossible, the existing "too large" error shows.
  - If the browser can't read the file as an image, the existing invalid-image error shows.
  - Avatars everywhere look the same as before (they are already shown with `object-fit: cover`).
- **Rules:**
  - The server accepts PNG, JPEG or WebP up to **256 kB** (was 2 MB). Anything else is a 422 `AVATAR_IMAGE_INVALID`, as today.
  - Avatar image URLs are stable per uploaded image and cacheable by the browser for a year. A new upload gets a new URL, so changes still show immediately.
  - Removing the image works as today.
- **Out of scope:**
  - Server-side resizing (no `image_processing` / libvips). The server only caps the size.
  - Existing stored avatars. The dev database is rebuilt, so existing data doesn't matter.
  - Other uploads (there are none today).

# Part 2 — Technical details

## 2.1 Tools and libraries

No new dependencies. Browser Canvas API (`createImageBitmap` or an `Image` element, `canvas.toBlob(..., 'image/webp', quality)`), and ActiveStorage's built-in proxy routes (`rails_storage_proxy_path`), which already send `Cache-Control: public, max-age=31536000`-style headers through `http_cache_forever`.

## 2.2 Structure

### Backend
- `app/models/user.rb`: `AVATAR_IMAGE_MAX_BYTES = 256.kilobytes`, and change the validation message to "must be 256 kB or smaller".
- `app/controllers/application_controller.rb` `avatar_json`: use `rails_storage_proxy_path(user.avatar_image, only_path: true)` instead of `rails_blob_path`.
- Tests: `test/models/user_test.rb` (size limit test and message) and `test/controllers/users_controller_test.rb` (`image_url` is a proxy path; an over-limit upload is rejected). Add a request test that `GET`-ing the returned `image_url` responds 200 with a long-lived public `Cache-Control`.

### Frontend
- `config/avatarColors.ts`: `AVATAR_IMAGE_MAX_BYTES = 256 * 1024`, plus `AVATAR_IMAGE_SIZE = 128`.
- New pure-ish helper `utils/resizeAvatar.ts`: `resizeAvatar(file: File): Promise<File | null>`. It decodes the image, center-crops it to a square, draws it onto a 128×128 canvas, encodes it as `image/webp` (quality 0.85), and returns a `File` named `avatar.webp`. It returns `null` if the image can't be decoded.
- `pages/dashboard/profile/profile.component.ts` `handleFileSelected`: keep the type check on the original file and drop the size check on the original. Run `resizeAvatar`: `null` → the invalid-image error; over `AVATAR_IMAGE_MAX_BYTES` → the existing too-large error. Otherwise `pendingImage` is the resized file, which the preview and Save use as today.
- Translations: update `IMAGE_TOO_LARGE` and `ERRORS.…AVATAR_IMAGE_INVALID` texts from "2 MB" to "256 kB" in every file in `public/assets/translations/`.

## 2.3 Decisions

1. **Resize in the browser before upload.** Chosen 2026-10-26: no new native dependency. Rejected: a server variant with `image_processing` + libvips (it guarantees the size, but adds a system dependency everywhere).
2. **128×128 WebP.** Chosen 2026-10-26: smallest files. Rejected: 256×256.
3. **Server limit lowered to 256 kB.** Chosen 2026-10-26, so storage stays capped even if someone bypasses the browser resize.
4. **Serve through ActiveStorage proxy URLs with long caching.** Chosen 2026-10-26. Rejected: keeping redirect URLs, which expire and defeat browser caching.
5. **Center-crop to a square.** This matches how avatars already display (`object-fit: cover` crops the center), so nothing changes visually. Recorded without a separate question; double-check.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: run `bin/rails test` in `backend/` and `npm test` in `frontend/` and note the counts here.

### A. Backend
- [ ] A1. Lower `User::AVATAR_IMAGE_MAX_BYTES` to 256 kB and update the message. Update `test/models/user_test.rb`.
- [ ] A2. Switch `avatar_json` to `rails_storage_proxy_path`. Update `test/controllers/users_controller_test.rb`, and add the test that the proxy URL serves the image with long-lived public caching.

### B. Frontend
- [ ] B1. Update `AVATAR_IMAGE_MAX_BYTES` and add `AVATAR_IMAGE_SIZE` in `frontend/src/app/config/avatarColors.ts`.
- [ ] B2. Add `frontend/src/app/utils/resizeAvatar.ts`, with a spec that feeds it a generated non-square PNG (from a canvas) and checks the result is a 128×128 `image/webp` `File`, and that a non-image returns `null`.
- [ ] B3. Use it in `ProfileComponent.handleFileSelected` as described in 2.2. Update the profile spec for a large original being accepted and for the decode-failure error.
- [ ] B4. Update the "2 MB" texts in every translation file.

### Z. Wrap-up
- [ ] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md`.
- [ ] Z2. Manual check in the running app: upload a large (several MB) non-square photo on the Profile page. The preview is square, the saved avatar shows in the header and lists, the network tab shows a small WebP upload, and on a reload the avatar comes from cache.
- [ ] Z3. Update `CLAUDE.md` if it mentions avatar URLs or limits (it currently doesn't; check).
