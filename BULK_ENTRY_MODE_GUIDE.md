# 🚀 Bulk Entry Mode - Complete Guide

## Overview

The **Bulk Entry Mode** is a fast, Excel-like table interface for adding multiple transactions at once. Say goodbye to slow one-by-one modal entry!

## ✨ Key Features

### 1. **Excel-Like Interface**
- Clean, minimalist table with 5 columns: Type, Amount, Category, Date, Description
- Keyboard-friendly navigation (TAB to move between cells, ENTER for new row)
- Auto-focus and smooth transitions

### 2. **Smart Auto-Row Addition**
- When you start typing in the last row, a new empty row automatically appears
- Always have a fresh row ready for the next entry
- No need to manually click "Add Row" every time

### 3. **Paste from Excel/Sheets**
- Copy multiple rows from Excel or Google Sheets
- Paste directly into the table (Ctrl+V or Cmd+V)
- Automatically parses tab-separated data
- Supports format: `Type | Amount | Category | Date | Description`

Example paste format:
```
Expense	150	Food	24/11/2025	Dinner with mom
Income	2000	Salary	01/11/2025	November Salary
Expense	80	Travel	23/11/2025	Auto Rickshaw
```

### 4. **Real-Time Validation**
- ✅ Green highlighting for saved transactions
- 🟡 Yellow badge shows rows ready to save
- 🔴 Red highlighting for invalid rows with errors
- Hover over Save button to see validation errors
- Amount must be > 0
- Category is required
- Valid date format required

### 5. **Flexible Save Options**

**Per-Row Save:**
- Each row has a ✓ Save button
- Click to save individual transactions
- Great for reviewing each entry before committing

**Bulk Save All:**
- "Save All" button at the top
- Saves all valid unsaved rows in one batch
- Shows count of pending transactions: `Save All (5)`
- Automatically refreshes the page after bulk save

### 6. **Category Autocomplete**
- Type in the Category field to see suggestions
- Pre-populated with common categories:
  - Food, Transport, Shopping, Entertainment
  - Bills, Healthcare, Education
  - Salary, Freelance, Investment, Savings
- Can type any custom category

### 7. **Row Management**
- Delete any row with the 🗑️ trash icon
- Add new rows manually with "+ Add Row" button
- Cannot delete all rows (always keeps at least one)

## 🎯 How to Use

### Accessing Bulk Entry Mode

1. Go to `/dashboard/finance`
2. Click the **"Bulk Entry Mode"** button (table icon) in the top-right corner
3. Toggle back to **"List View"** anytime to see your saved transactions

### Quick Entry Workflow

**Method 1: Manual Entry**
1. Click in the Type dropdown → select Expense/Income/Investment
2. TAB → enter Amount
3. TAB → type Category (autocomplete available)
4. TAB → select Date (today's date pre-filled)
5. TAB → add optional Description
6. Click ✓ Save button or TAB to next row and continue

**Method 2: Paste from Excel**
1. Open your Excel/Sheets with transaction data
2. Copy rows (Ctrl+C)
3. Click anywhere in the bulk entry table
4. Paste (Ctrl+V)
5. Review auto-populated rows
6. Fix any validation errors (red rows)
7. Click "Save All" button

**Method 3: Rapid Fire Entry**
1. Type amount → TAB → category → TAB → description → TAB
2. New row appears automatically
3. Keep typing without clicking anything
4. When done, click "Save All"

## 🎨 Visual Indicators

### Stats Bar (Top of Table)
- **Total:** All rows in the table
- **Saved:** Successfully saved to database (green dot)
- **Ready:** Valid rows waiting to be saved (yellow dot)
- **Invalid:** Rows with errors (red dot, only shows if > 0)

### Row Colors
- **White/Default:** Empty or unsaved valid row
- **Light Green:** Saved successfully ✅
- **Light Red:** Invalid data (hover Save button for details) ❌
- **Hover Gray:** Mouse over effect for better UX

### Save Button States
- **Blue (enabled):** Row is valid, ready to save
- **Gray (disabled):** Row has validation errors
- **Green checkmark:** Row already saved

## 🔧 Technical Details

### Data Validation Rules

```typescript
✓ Type: Must be "income", "expense", or "investment"
✓ Amount: Must be > 0 and a valid number
✓ Category: Required, cannot be empty
✓ Date: Valid date format (YYYY-MM-DD)
✓ Description: Optional
```

### Database Schema

```sql
Table: finances
- id (uuid, primary key)
- user_id (uuid, references auth.users)
- type (text: 'income' | 'expense' | 'investment')
- amount (numeric)
- category (text)
- date (date)
- description (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| TAB | Move to next field |
| Shift+TAB | Move to previous field |
| ENTER | Move to next row (when in last field) |
| Ctrl+V | Paste from clipboard |
| Delete/Backspace | Clear field content |

## 💡 Pro Tips

1. **Batch Entry:** Prepare your transactions in Excel, then paste all at once
2. **Quick Categories:** Use the autocomplete to speed up category entry
3. **Date Shortcuts:** Today's date is pre-filled, just TAB past it for today's transactions
4. **Review Before Save:** Use per-row save for accuracy, bulk save for speed
5. **Validation First:** Fix all red rows before clicking "Save All"
6. **Paste Format:** Excel tab-separated works best (copy directly from Excel cells)

## 🐛 Troubleshooting

### "Row won't save"
- Check validation errors by hovering over the Save button
- Ensure Amount is a valid positive number
- Ensure Category is not empty
- Check Date is in valid format

### "Paste not working"
- Make sure data is tab-separated (from Excel/Sheets)
- Try copying from Excel cells directly (not from text editor)
- Check format: Type | Amount | Category | Date | Description
- At minimum, include Type and Amount

### "New row not appearing"
- New rows auto-appear when you type in the last row
- You can also manually add rows with "+ Add Row" button
- At least one empty row is always maintained

### "Can't delete last row"
- System keeps at least one row for easy entry
- This is intentional to prevent empty table state

## 🚀 Future Enhancements (Planned)

- [ ] Import CSV directly
- [ ] Export current table to Excel
- [ ] Duplicate row feature
- [ ] Undo/Redo functionality
- [ ] Keyboard shortcut for "Save All" (Ctrl+S)
- [ ] Filter/Sort within bulk entry mode
- [ ] Template rows for recurring transactions
- [ ] Monthly/Weekly bulk entry templates

## 📊 Performance

- **Batch Size:** Up to 100 rows per bulk save operation
- **Auto-Save:** Each row saves independently
- **Page Refresh:** After bulk save to show updated stats
- **Client-Side Validation:** Instant feedback without server calls

## 🔒 Security

- All transactions tied to authenticated user (`user_id`)
- Row Level Security (RLS) enforced by Supabase
- No data visible/editable by other users
- Client-side validation + server-side validation (double layer)

## 📝 Example Use Cases

### Daily Expense Logging
```
Morning: Paste breakfast, transport, coffee expenses
Afternoon: Add lunch and shopping
Evening: Add dinner and entertainment
Click "Save All" once at end of day
```

### Monthly Salary Entry
```
1st of month:
- Income | 50000 | Salary | 01/11/2025 | November Salary
- Investment | 10000 | Mutual Fund | 01/11/2025 | SIP
- Expense | 15000 | Rent | 01/11/2025 | Monthly Rent
Save All → Done in 30 seconds!
```

### Weekly Grocery Shopping
```
Copy from spreadsheet:
Expense	2500	Groceries	18/11/2025	Weekly groceries
Expense	800	Vegetables	20/11/2025	Farmers market
Expense	1200	Meat	22/11/2025	Butcher shop
Paste → Save All
```

---

**Happy bulk entry! 🎉 Save time, track better.**
