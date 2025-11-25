# ⚠️ First-Time Setup: Initialize Balance System

## Problem
You're seeing a 500 error on the Finance page. This is because the `balances` table hasn't been created in your Supabase database yet.

## Solution (2 Steps - 2 Minutes)

### Step 1: Get the SQL Script
The SQL migration is ready at:
```
scripts/create-balances-table.sql
```

### Step 2: Run in Supabase

#### Option A: Supabase Dashboard (Recommended)
1. Go to https://app.supabase.com
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy all content from `scripts/create-balances-table.sql`
6. Paste into the SQL Editor
7. Click **Run** button (top right)
8. You should see: `Success. No rows returned`

#### Option B: Supabase CLI
```bash
# If you have Supabase CLI installed:
supabase db push
```

---

## What Gets Created
- ✅ `balances` table (stores user balance data)
- ✅ Security policies (RLS - users only see their own data)
- ✅ Indexes (for fast queries)
- ✅ Triggers (auto-update timestamps)

---

## After Setup

### Refresh Your Browser
1. Go back to http://localhost:3000/dashboard/finance
2. Hard refresh: Press **F5** or **Ctrl+Shift+R**
3. The error should be gone!

### You'll Now See
✅ "Balance Overview" section with 3 cards:
- Required Balance (Expected)
- Available Balance (Real)
- Missing / Extra (Difference)

✅ "Edit Balances" button to update your real balance values

---

## Verify It Works

### Check Database
In Supabase SQL Editor, run:
```sql
SELECT * FROM public.balances LIMIT 1;
```

Should return an empty table (no error) ✅

### Test the Feature
1. Navigate to Finance dashboard
2. Click "Edit Balances" button
3. Enter GPay balance: 15000
4. Enter Cash in hand: 5000
5. Click Save
6. Should show: "✅ Balances updated successfully!"
7. Values should persist on page refresh

---

## Troubleshooting

### Still Getting Error After Running SQL?
1. **Clear browser cache**: Ctrl+Shift+Delete
2. **Restart dev server**: Stop and run `npm run dev` again
3. **Hard refresh page**: F5 or Ctrl+Shift+R

### Error in SQL Editor When Running?
- Copy the **entire** SQL file content (including comments)
- Make sure you're in your correct Supabase project
- Click **Run** button (not just highlighting and executing)
- If error persists, check SQL syntax in error message

### "Unauthorized" Error?
- Make sure you're logged into the app
- Check your Supabase auth is working

---

## Next Steps

Once table is created:
1. ✅ Refresh page to see Balance Overview
2. ✅ Click "Edit Balances" and enter your real balances
3. ✅ Watch the system calculate mismatches automatically
4. ✅ Enjoy full balance tracking! 🎉

---

**Time to Complete**: ~2 minutes  
**Difficulty**: ⭐ Easy  
**Required**: One SQL execution in Supabase

Get started now! 👉 Open `scripts/create-balances-table.sql`
