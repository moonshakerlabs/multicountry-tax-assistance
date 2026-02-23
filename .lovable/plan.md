

# Bug Fix Plan: Admin Panel, Blog, Downgrade, and GDPR Consent

## Issues Identified

### 1. Admin Panel Layout Not Visible
**Root Cause**: The `/admin` route is wrapped in `<ProtectedRoute requiredRole="admin">`, which checks for 2FA verification (`sessionStorage.getItem('2fa_verified') === 'true'`). If 2FA hasn't been verified in the current session, the user gets redirected to `/2fa-verify` instead of seeing the admin panel. The admin layout code itself is correct -- the problem is likely the 2FA gate blocking access silently, or the user is being redirected without realizing it.

**Fix**: Add console logging and verify the ProtectedRoute flow. Additionally, ensure the admin page renders correctly by adding a visible loading/error state so the user can see what's happening.

### 2. Blog Page Not Showing Posts
**Root Cause**: The public Blog page (`/blog`) queries `blog_posts` with `status = 'PUBLISHED'`. The RLS policies on `blog_posts` are all set to `Permissive: No` (restrictive policies). When multiple restrictive policies exist, PostgreSQL requires ALL of them to pass. The "Public can view published posts" policy and the "Admins can view all posts" policy are both restrictive -- meaning for a non-admin user, the admin policy FAILS and blocks access even though the public policy passes.

**Fix**: Change the RLS policies on `blog_posts` from restrictive to permissive (the default). With permissive policies, any ONE passing policy grants access.

### 3. Pro Features Visible After Downgrade
**Root Cause**: In `Pricing.tsx`, after a downgrade the code calls `window.location.reload()`. However, the `useSubscription` hook fetches subscription data based on `user` state. The downgrade updates the `subscription_plan` to the new plan immediately in the database, but the UI might show stale data if the reload doesn't properly clear React Query cache. More critically, the subscription is updated immediately but the `subscription_end_date` is set to the billing cycle end -- this creates a mismatch where the plan says "FREE" but end date is future.

**Fix**: The downgrade logic should NOT change `subscription_plan` immediately. Instead, it should set a `pending_downgrade_plan` or keep the current plan active until the billing cycle ends. However, since we don't have a `pending_downgrade` column, the simpler fix is to ensure `useSubscription` re-fetches after the update and the UI properly reflects the new plan. The real issue is that `window.location.reload()` should work -- let me verify the subscription hook properly re-fetches. The hook depends on `user` which doesn't change on reload. The fix: after downgrade, invalidate the subscription data or navigate instead of reload.

### 4. GDPR Consent Not Shown When Selecting Secure Vault
**Root Cause**: In Profile.tsx (line 420), clicking "Platform Storage" calls `setStoragePreference('saas')` directly from the `useStoragePreference` hook, which just updates the database. It shows `'GDPR consent required'` as text but never triggers the `GDPRConsentModal`. The modal exists but is never rendered in the Profile page.

**Fix**: When a user clicks "Platform Storage" (SaaS), show the `GDPRConsentModal` first. Only set the storage preference to 'saas' after the user accepts the GDPR consent. Also update GDPR consent in the database when accepted.

---

## Implementation Steps

### Step 1: Fix RLS Policies on blog_posts (Database Migration)
Change the restrictive RLS policies on `blog_posts` to permissive so public users can view published posts:
- Drop existing restrictive policies
- Recreate them as permissive (default)
- Do the same for `blog_comments` which has the same issue

### Step 2: Fix GDPR Consent Flow in Profile.tsx
- Import `GDPRConsentModal` component
- Add state `showGDPRConsent` to control modal visibility
- When user clicks "Platform Storage", check if GDPR consent is already given
  - If yes: set storage preference to 'saas' directly
  - If no: show the GDPR consent modal
- On modal accept: call `setGDPRConsent(true)` then `setStoragePreference('saas')`
- On modal decline: do nothing, keep current preference

### Step 3: Fix Subscription Downgrade Visibility in Pricing.tsx
- After successful plan change, instead of `window.location.reload()`, navigate to `/dashboard` or use `window.location.href = '/pricing'` to force a full page reload that clears all React state
- Alternatively, add a `refetch` method to `useSubscription` hook and call it after the update

### Step 4: Add Debugging/Resilience to Admin Panel
- Add a visible error boundary or debug output to the Admin page
- Verify the ProtectedRoute is not silently redirecting
- Ensure admin components handle loading states properly

---

## Technical Details

### Database Migration (Step 1)
```sql
-- Fix blog_posts RLS: change from restrictive to permissive
DROP POLICY IF EXISTS "Public can view published posts" ON public.blog_posts;
CREATE POLICY "Public can view published posts" ON public.blog_posts
  FOR SELECT USING (status = 'PUBLISHED');

DROP POLICY IF EXISTS "Admins can view all posts" ON public.blog_posts;
CREATE POLICY "Admins can view all posts" ON public.blog_posts
  FOR SELECT TO authenticated
  USING (is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all posts" ON public.blog_posts;
CREATE POLICY "Admins can manage all posts" ON public.blog_posts
  FOR ALL TO authenticated
  USING (is_any_admin(auth.uid()));

-- Fix blog_comments RLS similarly
DROP POLICY IF EXISTS "Public can view approved comments on published posts" ON public.blog_comments;
CREATE POLICY "Public can view approved comments on published posts" ON public.blog_comments
  FOR SELECT USING (
    status = 'APPROVED' AND EXISTS (
      SELECT 1 FROM blog_posts bp WHERE bp.id = blog_comments.post_id AND bp.status = 'PUBLISHED'
    )
  );

DROP POLICY IF EXISTS "Admins can view all comments" ON public.blog_comments;
CREATE POLICY "Admins can view all comments" ON public.blog_comments
  FOR SELECT TO authenticated
  USING (is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all comments" ON public.blog_comments;
CREATE POLICY "Admins can manage all comments" ON public.blog_comments
  FOR ALL TO authenticated
  USING (is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own comments" ON public.blog_comments;
CREATE POLICY "Users can view their own comments" ON public.blog_comments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.blog_comments;
CREATE POLICY "Authenticated users can insert comments" ON public.blog_comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Post authors can view on-hold comments" ON public.blog_comments;
CREATE POLICY "Post authors can view on-hold comments" ON public.blog_comments
  FOR SELECT USING (
    status = 'ON_HOLD' AND EXISTS (
      SELECT 1 FROM blog_posts bp WHERE bp.id = blog_comments.post_id AND bp.author_id = auth.uid()
    )
  );
```

### Profile.tsx Changes (Step 2)
- Add `import GDPRConsentModal` and state for `showGDPRConsent`
- Replace direct `setStoragePreference('saas')` onClick with a handler that checks `gdprConsentGiven`
- Render `GDPRConsentModal` when `showGDPRConsent` is true

### Pricing.tsx Changes (Step 3)
- Replace `window.location.reload()` with `window.location.href = '/pricing'` to force full navigation reset
- This ensures all hooks re-initialize with fresh data

### useSubscription.ts Changes (Step 3 supplement)
- Add a `refetch` function to the hook for manual re-fetching

### Files to Modify
1. **Database migration** -- RLS policy fixes for `blog_posts` and `blog_comments`
2. **src/pages/Profile.tsx** -- GDPR consent modal integration
3. **src/pages/Pricing.tsx** -- Fix post-downgrade refresh
4. **src/hooks/useSubscription.ts** -- Add refetch capability

