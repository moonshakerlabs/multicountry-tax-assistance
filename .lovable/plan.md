

# Plan: AI Tools Reports, Admin Blog, and Offer Configuration Fixes

## Overview

This plan addresses four main issues:
1. AI Tools reports not downloadable and buttons interfering with each other
2. Admin Panel Blog section not visible (in the `/admin` route)
3. AI results formatting improvements with markdown table support
4. Rename "Trial Config" to "Offers" with better enable/disable controls

---

## Issue 1: AI Tools Reports - Download and Preview

### Problem
- The "Download as PDF" and "Download as Excel (CSV)" buttons both call `handleGenerateReport` which hits the edge function to generate a report server-side. The edge function generates a `.txt` file (not a real PDF) and a `.csv` file, then stores them in the vault and returns a signed URL.
- The signed URL download link only appears after generation, but there's no preview capability.
- The markdown-to-HTML converter (`markdownToHtml`) doesn't handle markdown tables properly (missing `|` pipe table parsing).

### Solution

**A. Fix `markdownToHtml` to render tables properly**
- Update the `markdownToHtml` function in `AITools.tsx` to detect and convert markdown pipe tables (`| col1 | col2 |`) into proper HTML `<table>` elements.

**B. Replace "Download as PDF/CSV" with "View PDF Report" and "View CSV Report" dropdown buttons**
- Each button shows a small dropdown with two options: "Show Preview" and "Download".
- **Preview**: Opens a new browser tab with the formatted report content (PDF-like view using `window.open` with styled HTML for PDF; CSV shown as a formatted table).
- **Download**: Triggers the existing edge function to generate the file, save to vault, and provide a download link. Additionally, use `Blob` + `URL.createObjectURL` for immediate client-side download of PDF/CSV without waiting for the server.

**C. Client-side PDF generation using jsPDF**
- Install `jspdf` and `jspdf-autotable` libraries for proper tabular PDF generation.
- Parse the AI result content to extract tables and text sections.
- Generate a properly formatted PDF with headers, tables, and text sections.

**D. Client-side CSV generation**
- Parse the markdown result to extract tabular data.
- Generate a proper CSV file using the browser's Blob API.
- Trigger immediate download.

**E. Add "Save to Vault" option**
- After preview or download, offer a "Save to Vault" button that calls the existing `generate_report` edge function action to persist the file in the user's vault (Supabase storage or Google Drive based on their storage preference).

### Files to Modify
- `src/pages/AITools.tsx` - Update report buttons, add preview/download logic, fix markdownToHtml
- `src/pages/AITools.css` - Add styles for dropdown menus and preview modal
- `package.json` - Add `jspdf` and `jspdf-autotable` dependencies

---

## Issue 2: Admin Panel Blog Not Visible

### Problem
The user mentions the Blog section is not rendering in the Admin panel. Looking at the code:
- The `/admin` route has an `AdminBlogTab` component that renders when `activeSection === 'blog'`.
- The Dashboard also has an admin mode with tabs, but Blog is NOT one of the tabs there (it has Moderation, Employees, Customers, Support, Permissions, Activity, Payments, Trial Config).
- The user may be looking at the Dashboard admin panel (which doesn't have a Blog tab) instead of the `/admin` route.
- The `/admin` route is protected by `ProtectedRoute` with `requiredRole="admin"` which requires 2FA verification.

### Solution
- Add a "Blog" tab to the Dashboard admin panel (`Dashboard.tsx`) since users seem to be using that instead of `/admin`.
- Import and render `AdminBlogTab` in the Dashboard's admin tabs.
- This ensures Blog management is accessible from both the Dashboard admin mode and the `/admin` page.

### Files to Modify
- `src/pages/Dashboard.tsx` - Add Blog tab to admin panel tabs, import AdminBlogTab

---

## Issue 3: AI Results Formatting

### Problem
The `markdownToHtml` function is very basic and doesn't handle:
- Markdown tables (`| header | header |`)
- Nested formatting
- Proper paragraph handling

### Solution
- Replace the custom `markdownToHtml` with `react-markdown` (already installed as a dependency) for the result rendering.
- This provides proper markdown table support, code blocks, headers, lists, and more out of the box.

### Files to Modify
- `src/pages/AITools.tsx` - Replace `dangerouslySetInnerHTML` with `ReactMarkdown` component

---

## Issue 4: Rename "Trial Config" to "Offers" with Enable/Disable Controls

### Problem
The "Trial Config" tab in the Dashboard admin panel shows a flat list of configuration keys. The user wants:
- Rename "Trial Config" to "Offers"
- Group settings with enable/disable toggles
- Better UI for managing offers

### Solution
- Rename the tab label from "Trial Config" to "Offers"
- Reorganize the config form into sections:
  - **Default Trial Settings**: trial days, trial plan (with enable/disable)
  - **Early Access Offer**: enable/disable toggle, deadline, freemium days, pro days, headline, description
  - **Downgrade Settings**: cutoff days, vault grace period
- When an offer section is disabled, its fields are grayed out/collapsed
- Add visual grouping with cards and headers

### Files to Modify
- `src/pages/Dashboard.tsx` - Rename tab, reorganize the `SubscriptionConfigPanel` into grouped sections with toggles

---

## Technical Details

### New Dependencies
- `jspdf` - Client-side PDF generation
- `jspdf-autotable` - Table support for jsPDF

### AITools.tsx Changes
1. Replace `markdownToHtml` + `dangerouslySetInnerHTML` with `react-markdown` component
2. Replace report action buttons with dropdown menus containing "Show Preview" and "Download" options
3. Add client-side PDF generation using jsPDF with auto-table for tabular data
4. Add client-side CSV generation using Blob API
5. Add "Save to Vault" button that calls the existing edge function
6. Fix button event propagation (ensure PDF and CSV buttons don't trigger each other)

### Dashboard.tsx Changes
1. Import `AdminBlogTab` and `BookOpen` icon
2. Add a new `TabsTrigger` for "Blog" in the admin tabs list
3. Add corresponding `TabsContent` rendering `AdminBlogTab`
4. Rename "Trial Config" tab to "Offers"
5. Restructure `SubscriptionConfigPanel` with collapsible sections and toggle switches

### Markdown Table Parsing (handled by react-markdown)
The existing `react-markdown` dependency will handle:
- Pipe tables with proper `<table>` rendering
- Code blocks with syntax highlighting potential
- Proper list nesting
- Header hierarchy

