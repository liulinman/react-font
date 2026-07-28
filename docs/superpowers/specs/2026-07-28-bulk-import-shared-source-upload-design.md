# Batch Import Shared Source Upload Design

## Goal

Let a user assign one shared source to every word in a batch import. The source
can be a web page or a PDF/image uploaded to the English World server. Uploaded
files must survive application deployments and must only be readable by the
user who uploaded them while logged in.

## User Experience

The batch-import form gains a compact "统一来源" section beneath the import
options:

- `无来源`: keep the current behavior.
- `网页链接`: accept an `http://` or `https://` URL.
- `上传文件`: accept one PDF, PNG, JPEG, or WebP file up to 20 MB.

The selected source is applied to every preview item before conflict detection
and import. The preview modal shows the shared source so the user can verify it
without editing every word.

After import, word-list source links open in a new tab. Context Lab references
continue to use the existing internal navigation behavior; ordinary web and
uploaded-file references use the source-link behavior.

## Backend Design

Add authenticated source-file endpoints under the existing upload controller:

- `POST /upload/source-file`: validate and save one file.
- `GET /upload/source-file/:ownerId/:storageName`: verify the current user owns
  the path, then stream the file inline with the correct content type.

Files are stored below `SOURCE_UPLOAD_DIR`, defaulting to
`/app/uploads/sources`. The storage name is generated from a UUID and a
validated extension; the original filename is never used as a filesystem path.
The upload response contains the protected same-origin URL, original filename,
MIME type, and size.

The production Compose stack mounts a named `source-upload-data` volume into
the backend at `/app/uploads`. Rebuilding or replacing the backend container
therefore does not remove uploaded learning sources.

The existing OSS image upload endpoint remains unchanged for compatibility,
but receives the existing login guard as part of securing the upload
controller.

## Authorization And Validation

- Both upload and download require the existing cookie-based `AuthGuard`.
- The download route compares `ownerId` in the URL with the authenticated user
  ID before reading the file.
- Only PDF, PNG, JPEG, and WebP MIME types/extensions are accepted.
- Maximum upload size is 20 MB.
- Generated filenames prevent traversal and collisions.
- Missing, invalid, or foreign-user files return a normal HTTP error without
  exposing filesystem paths.

## Frontend Data Flow

The frontend stores the selected common source in local form state. The source
URL is copied into each preview item as `englishReference`, so all existing
preview, duplicate detection, overwrite confirmation, and import APIs keep the
same contracts.

Uploaded files use the new endpoint and retain the returned protected URL.
Relative `/api/upload/source-file/...` URLs are treated as navigable source
links alongside external `http(s)` URLs.

Changing or clearing the source updates the current preview items so a stale
source cannot be imported accidentally.

## Testing

Backend tests cover:

- accepted PDF/image upload and generated response URL;
- rejected file type and size;
- owner-only download;
- missing-file behavior.

Frontend tests cover:

- source mode switching and validation;
- upload success/error states;
- applying one source URL to every preview/import payload;
- rendering protected uploaded source URLs as links.

Production verification covers:

- CI deployment success;
- persistent volume presence;
- authenticated upload/download;
- unauthorized download rejection;
- file remains readable after recreating only the backend container.
