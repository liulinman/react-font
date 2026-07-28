# Source File Deletion Design

## Goal

Allow a learner to remove an uploaded batch-import source from the server
without allowing deletion of a file that is already referenced by imported
vocabulary.

## Behavior

- The file row's trash button asks for confirmation and then deletes the
  authenticated user's file from persistent storage.
- Switching away from an uncommitted uploaded source uses the same deletion
  flow so the upload is not silently orphaned.
- A source already referenced by one or more vocabulary entries cannot be
  deleted. The API returns a conflict response and the UI keeps the file
  selected.
- After a successful import inserts or updates vocabulary, the source control
  resets without deleting the uploaded file because the new vocabulary now
  depends on its URL.
- Missing files and files owned by another user are exposed as not found.

## API

`DELETE /upload/source-file/:storageName`

The authenticated user ID determines the owner directory. The server validates
the storage name, checks for vocabulary references to the protected URL, then
removes both the source file and its metadata sidecar.

## Verification

- Storage service tests cover file and metadata deletion, invalid names, and
  missing files.
- Controller tests cover owner-scoped deletion and referenced-file conflicts.
- Frontend tests cover confirmed deletion, failed deletion, and source-state
  clearing.
- Existing full backend and frontend suites remain green before push.
