# 📊 Multi-Sheet Excel Upload Guide

## ✅ Perfect for Your Excel Format!

This custom parser is specifically built for your Excel structure with **4 separate sheets**: Income, Expense, Investment, and Scholarship/Earning.

---

## 🎯 Your Excel Format (Supported)

### 📗 Income Sheet

**Columns:**
```
SERIAL NO | DATE       | DESCRIPTION         | AMOUNT
1         | 23/01/2024 | Balance in Account  | 1500
2         | 23/01/2024 | Amount in hand      | 510
3         | 24/01/2024 | Appa kudatha amount | 500
4         | 30/01/2024 | Scholarship         | 2000
```

**What Gets Imported:**
- ✅ All rows with valid amounts (numbers)
- ✅ Dates in DD/MM/YYYY format
- ❌ Rows with `—` or `-` in Amount column (skipped automatically)
- ❌ Empty rows (skipped)

**Auto-Generated Categories:**
- "Appa" / "Amma" / "Parent" → **Family Support**
- "Scholarship" → **Scholarship**
- "Balance" / "Hand" → **Initial Balance**
- "Salary" / "Pay" → **Salary**
- Default → **Other Income**

---

### 📕 Expense Sheet

**Columns:**
```
SERIAL NO | DATE       | SPENDED                         | AMOUNT
1         | 24/01/2024 | Bus Spare (Home to Room)        | 55
2         | 24/01/2024 | Bus spare (Room to Clg to Room) | 50
3         | 25/01/2024 | Lunch at canteen                | 40
4         | 26/01/2024 | Room rent                       | 3000
```

**Auto-Generated Categories:**
- "Bus" / "Transport" → **Transport**
- "Food" / "Lunch" / "Dinner" → **Food**
- "Room" / "Rent" → **Rent**
- "College" / "Clg" / "Class" → **Education**
- "Book" → **Books**
- "Recharge" / "Mobile" → **Mobile**
- Default → **Other Expense**

---

### 📘 Investment Sheet

**Columns:**
```
SERIAL NO | DATE       | DESCRIPTION       | Unnamed | SIP (Amount)
1         | 15/01/2024 | SIP-money control | -       | 500.00
2         | 31/01/2024 | SIP-money control | -       | 500.00
3         | 15/02/2024 | SIP-money control | -       | 500.00
```

**What Gets Imported:**
- ✅ All rows with valid SIP amounts
- ✅ Dates in DD/MM/YYYY format
- ❌ Summary rows (like "29 | — | 8374.46 | — | NaN") are skipped
- ❌ Rows without dates are skipped

**Auto-Generated Categories:**
- "SIP" → **SIP**
- "Mutual" → **Mutual Funds**
- "Stock" → **Stocks**
- Default → **Investment**

---

### 📙 Scholarship/Earning Sheet

**Same format as Income sheet** - automatically treated as Income type.

```
SERIAL NO | DATE       | DESCRIPTION  | AMOUNT
1         | 01/01/2024 | Scholarship  | 10000
2         | 15/01/2024 | Prize money  | 500
```

---

## 🚀 How to Use

### Step 1: Prepare Your Excel File

Your file should have **4 separate sheets** (or at least one):
- Sheet 1: "Income" or "Earning" or "Scholarship"
- Sheet 2: "Expense" or "Spend"
- Sheet 3: "Invest" or "Investment"
- Sheet 4: Any name with income-related data

**Sheet names are case-insensitive!** These all work:
- ✅ "Income", "income", "INCOME"
- ✅ "Expense", "expense", "EXPENSE"
- ✅ "Invest", "Investment", "INVEST"
- ✅ "Scholarship/Earning"

### Step 2: Upload the File

1. Go to Finance page
2. Click **"Upload Multi-Sheet Excel"** button
3. Select your Excel file (.xlsx or .xls)
4. Wait for parsing (usually 2-5 seconds)

### Step 3: Review Parsed Data

You'll see:
- **Total Rows:** All rows found
- **Valid Rows:** Rows ready to import (green)
- **Invalid Rows:** Rows with errors (red)
- **By Type:** Income, Expense, Investment counts

**Preview Table** shows first 5 transactions

### Step 4: Import

Click **"Import X Transactions"** button

✅ Valid rows import to database  
❌ Invalid rows are skipped  
🔄 Page refreshes automatically

---

## 📝 Sample Excel File Structure

```
📁 My Finance.xlsx
  ├── 📄 Income Sheet
  │     SERIAL NO | DATE       | DESCRIPTION         | AMOUNT
  │     1         | 23/01/2024 | Balance in Account  | 1500
  │     2         | 23/01/2024 | Amount in hand      | 510
  │     3         | 24/01/2024 | Appa kudatha amount | 2000
  │
  ├── 📄 Expense Sheet
  │     SERIAL NO | DATE       | SPENDED             | AMOUNT
  │     1         | 24/01/2024 | Bus Spare           | 55
  │     2         | 24/01/2024 | Lunch               | 40
  │     3         | 25/01/2024 | Room rent           | 3000
  │
  ├── 📄 Invest Sheet
  │     SERIAL NO | DATE       | DESCRIPTION         | SIP
  │     1         | 15/01/2024 | SIP-money control   | 500
  │     2         | 31/01/2024 | SIP-money control   | 500
  │
  └── 📄 Scholarship Sheet
        SERIAL NO | DATE       | DESCRIPTION  | AMOUNT
        1         | 01/01/2024 | Scholarship  | 10000
```

---

## 🎨 What Happens During Import

### Parsing Process:

1. **Sheet Detection**
   - Finds sheets with names containing "income", "expense", "invest"
   - Each sheet type uses a different parser

2. **Header Detection**
   - Automatically finds the header row (looks for DATE, DESCRIPTION, AMOUNT)
   - Works even if headers are on row 2 or 3

3. **Data Extraction**
   - Reads all rows below header
   - Skips empty rows
   - Skips rows with `—` or `-` in amount

4. **Date Conversion**
   - Converts DD/MM/YYYY → YYYY-MM-DD
   - Handles Excel date serial numbers
   - Validates date format

5. **Category Auto-Assignment**
   - Analyzes description text
   - Assigns relevant category based on keywords
   - You can edit categories later

6. **Validation**
   - Amount > 0
   - Date is valid
   - Category exists
   - Shows errors for invalid rows

7. **Import to Database**
   - Inserts valid rows in batches of 100
   - Attaches to your user ID
   - Updates Finance page stats

---

## ✅ Validation Rules

| Field | Rule | Example |
|-------|------|---------|
| **Amount** | Must be > 0 | ✅ 500 / ❌ 0 or — |
| **Date** | Must be valid DD/MM/YYYY | ✅ 23/01/2024 / ❌ 32/13/2024 |
| **Description** | Can be any text | ✅ "Appa kudatha amount" |
| **Serial No** | Ignored (not imported) | N/A |

---

## 🔧 Smart Features

### 1. **Flexible Column Names**
Parser recognizes variations:
- "SPENDED" or "DESCRIPTION" → Both work for description
- "SIP (Amount)" or "Amount" → Both work for amount
- "DATE" or "date" or "Date" → Case-insensitive

### 2. **Auto-Skip Invalid Rows**
Automatically skips:
- Rows with `—` in amount
- Rows with `-` in amount
- Empty rows
- Summary rows (no date)
- Header rows

### 3. **Smart Category Detection**
```
Description: "Bus Spare (Home to Room)"
→ Category: "Transport"

Description: "Appa kudatha amount"
→ Category: "Family Support"

Description: "SIP-money control"
→ Category: "SIP"
```

### 4. **Multi-Sheet Processing**
- Processes all sheets in one upload
- Combines data from all sheets
- Shows breakdown by type

---

## 📊 Expected Results

**Example:**
- Income sheet: 157 rows → 120 valid (37 with `—` skipped)
- Expense sheet: 200 rows → 195 valid (5 empty rows skipped)
- Invest sheet: 29 rows → 28 valid (1 summary row skipped)

**Total:** 343 transactions imported from 386 rows

---

## 🐛 Common Issues & Solutions

### Issue 1: "No Data Found"
**Cause:** Sheet names don't match expected patterns  
**Fix:** Rename sheets to "Income", "Expense", "Invest"

### Issue 2: "Invalid Date Format"
**Cause:** Dates not in DD/MM/YYYY format  
**Fix:** Format date column as DD/MM/YYYY in Excel

### Issue 3: "Amount must be greater than 0"
**Cause:** Amount column has `—` or text  
**Fix:** These rows are auto-skipped, import the valid ones

### Issue 4: "No header row found"
**Cause:** Column names are non-standard  
**Fix:** Ensure headers contain "DATE", "AMOUNT", "DESCRIPTION"

---

## 💡 Pro Tips

### Tip 1: Clean Your Data First
Before uploading:
- Remove merged cells
- Unfreeze panes
- Ensure dates are formatted consistently
- Remove extra sheets if not needed

### Tip 2: Test with Small Sample
1. Create a test file with 5 rows per sheet
2. Upload and verify
3. Then upload full file

### Tip 3: Review Before Import
- Check the preview table
- Verify categories make sense
- Fix any red (invalid) rows if needed
- Categories can be edited later in List View

### Tip 4: Backup First
- Keep a copy of your Excel file
- You can always re-upload if needed

---

## 🎯 Quick Test

**Step 1:** Create a test Excel file with 2 sheets:

**Sheet 1: Income**
```
SERIAL NO | DATE       | DESCRIPTION  | AMOUNT
1         | 23/11/2025 | Test income  | 1000
```

**Sheet 2: Expense**
```
SERIAL NO | DATE       | SPENDED      | AMOUNT
1         | 23/11/2025 | Test expense | 100
```

**Step 2:** Upload it

**Step 3:** You should see:
- Total: 2
- Valid: 2
- Income: 1
- Expense: 1

**Step 4:** Click "Import 2 Transactions"

**Step 5:** Check Finance page → See both transactions! ✅

---

## 📞 Need Help?

If your Excel format is slightly different:
1. Upload and check the errors shown
2. The parser is flexible with column names
3. Most variations work automatically
4. Invalid rows are simply skipped (safe to upload)

---

**Your Excel format is fully supported! 🎉 Just upload and import!**
