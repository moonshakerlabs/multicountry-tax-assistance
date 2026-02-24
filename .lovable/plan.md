

## Update Hero Section Text

Two small text changes to the homepage hero section in `src/pages/Home.tsx`:

### Changes

**File: `src/pages/Home.tsx` (lines 153-157)**

1. Add "Tax Beyond Borders" as a bold heading above the existing tagline "A platform for cross-border financial clarity"
2. Update the subtitle from "Align income across jurisdictions." to "Align income across jurisdictions and different tax calendar years."

The updated hero block will look like:

```text
Tax Beyond Borders              <-- new bold heading
A platform for cross-border financial clarity
Organise tax records.
Align income across jurisdictions and different tax calendar years.
```

### Technical Detail

- Add a new `<h2>` or styled `<div>` with bold font weight above line 153 for "Tax Beyond Borders"
- Modify line 157 to include "and different tax calendar years"
- Add minimal CSS if needed (e.g., `font-weight: bold; font-size: 2rem`) using an appropriate class in `Home.css`

No other files or logic affected.

