

## Plan: Fix Four Bugs — Header Consistency, Document Year Edit, AI Interruption, Custom Categories in Vault

This plan addresses four distinct issues reported in the application.

---

### Bug 1: Header Navigation Inconsistency (AI Tools link missing on some pages)

**Root Cause:** Each page (Dashboard, Document Vault, Community, Profile, Support, AI Tools) has its own inline header with hardcoded navigation links. The Dashboard header includes the AI Tools link (gated by `useFeatureAccess`), but the Document Vault header (lines 475-489) and Community header completely omit the AI Tools link. There is no shared header component.

**Fix:**
- Add the AI Tools link to the **Document Vault** header (`src/pages/DocumentVault.tsx` lines 475-489), gated by the same `useFeatureAccess` hook used in Dashboard
- Add the AI Tools link to the **Community** header (`src/components/community/CommunityHeader.tsx` lines 92-114)
- Add the **Support** link to the Document Vault header (also missing)
- Import `Brain` and `HeadphonesIcon` icons and `useFeatureAccess` in DocumentVault
- Import `Brain` and `useFeatureAccess` in CommunityHeader (pass `hasFeature` as prop or use the hook directly)
- Ensure all authenticated page headers have consistent links: Dashboard, Profile, TaxOverFlow, AI Tools (if feature enabled), Support, Sign out

---

### Bug 2: Document Year Edit Does Not Move File to Correct Folder

**Root Cause:** In `DocumentActions.tsx` (`handleSaveMetadata`, lines 172-206), when a user edits the tax year, only the database metadata is updated. The actual file in Supabase storage or Google Drive is NOT moved to the new year folder. For SaaS storage, files use a flat `user_id/document_id` path so there's no folder issue. But for Google Drive files (`gdrive://`), the file remains in the old country/year folder.

**Fix:**
- In `DocumentActions.tsx`, after updating the metadata, check if the document is a Google Drive file
- If it's a Google Drive file and the country or year changed, call the `google-drive-upload` edge function (or a new dedicated edge function action) to move the file to the correct `{TAXBEBO}/{Country}/{Year}/` folder, creating the folder if it doesn't exist
- For SaaS storage, since the path is `user_id/document_id` (flat), no file move is needed — only the DB metadata update matters
- Add state tracking for `originalCountry` and `originalTaxYear` to detect changes
- Show a loading indicator during the move operation

---

### Bug 3: AI Computation Stops When Switching Tabs/Windows

**Root Cause:** The AI Tools page uses `fetch()` with SSE streaming (`streamSSEResponse`). When the user navigates away from the tab, the browser may throttle or suspend the JavaScript event loop, causing the stream reader to stall. Additionally, React state updates via `setResult()` during streaming may not persist if the component re-renders on tab focus. There is no `visibilitychange` listener, but the real issue is that the browser suspends the `ReadableStream` reader.

**Fix:**
- Use `useRef` instead of `useState` for accumulating `fullText` during streaming, so progress isn't lost
- Add an `AbortController` that is only aborted when the component unmounts (not on visibility change), ensuring the fetch continues
- Store intermediate results in `sessionStorage` during streaming so that if the component re-renders on tab focus, the accumulated result is preserved
- Add a `visibilitychange` listener that does NOT cancel the operation — instead, on returning to the tab, it restores any buffered result from the ref
- Ensure `setProcessing(true)` state is maintained across tab switches by tracking it in a ref as well
- The key principle: the `fetch` call itself continues in the background; we just need to ensure React state stays in sync

---

### Bug 4: Custom Category/Subcategory Adding Not Visible in Document Vault

**Root Cause:** The custom category creation UI exists in the **UploadModal** component but is not present in the Document Vault's main view or the **DocumentActions** (edit) component. Users can only add custom categories during upload, not when browsing or editing documents in the vault.

**Fix:**
- In `DocumentActions.tsx` (the edit panel), add the "Add custom main category" and "Add custom sub category" input fields, mirroring the logic from `UploadModal.tsx`
- Import `useSubscription` to gate the feature (Freemium and above)
- Fetch and display existing custom categories alongside system categories in the edit dropdowns
- Add the locked UI state for FREE users who have existing custom categories but cannot add new ones
- Import necessary icons (`Plus`, `Lock`) and the `custom_categories` table query logic

---

### Technical Details

**Files to modify:**

1. `src/pages/DocumentVault.tsx` — Add `useFeatureAccess` hook, `Brain`, `HeadphonesIcon` imports; add AI Tools and Support links to header
2. `src/components/community/CommunityHeader.tsx` — Accept `showAITools` prop; add AI Tools link conditionally
3. `src/pages/Community.tsx` — Pass `showAITools` prop from `useFeatureAccess`
4. `src/components/documents/DocumentActions.tsx` — Add custom category UI, add Google Drive file move logic on year/country change, import `useSubscription`
5. `src/pages/AITools.tsx` — Refactor streaming to use `useRef` for accumulation, add `AbortController` cleanup only on unmount, persist streaming state across tab switches

**No database changes required.** All fixes are frontend-only, leveraging existing tables and edge functions.

