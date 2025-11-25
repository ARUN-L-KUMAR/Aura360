import csv
import json
import re
from datetime import datetime
from collections import defaultdict

# Category mapping based on keywords
CATEGORY_KEYWORDS = {
    'food': ['food', 'chicken', 'beef', 'bakery', 'tea', 'juice', 'milk', 'egg', 'vegetable', 
             'fruit', 'rice', 'briyani', 'paratto', 'maggie', 'snacks', 'chips', 'biscuit',
             'bannana', 'watermelon', 'curd', 'panipuri', 'panni poori', 'icecream', 'ice cream',
             'lunch', 'dinner', 'tiffin', 'breakfast', 'burger', 'pizza', 'bread', 'puffs',
             'masala', 'chocolate', 'candy', 'sweet', 'order', 'delivery', 'cafe', 'restaurant'],
    
    'transport': ['bus', 'spare', 'train', 'ticket', 'auto', 'petrol', 'toll', 'parking',
                  'rapido', 'metro', 'railway', 'fare', 'bike', 'uber', 'ola'],
    
    'education': ['fees', 'exam', 'record', 'xerox', 'notebook', 'pen', 'pencil', 'book',
                  'course', 'revaluation', 'photocopy', 'printout', 'paper', 'note', 'tuition',
                  'college', 'clg', 'certificate', 'nptel', 'coursera'],
    
    'rent': ['rent', 'room rent', 'advance', 'deposit', 'electricity', 'motor charge'],
    
    'recharge': ['recharge', 'topup', 'top-up', 'mobile', 'data'],
    
    'shopping': ['dress', 'shirt', 'pant', 'shoe', 'slipper', 'crocs', 'shorts', 'jersey',
                 'jacket', 'inner', 'clothes', 'sacks', 'vesti', 'towel', 'bag'],
    
    'healthcare': ['medical', 'medicine', 'hospital', 'doctor', 'tablet', 'cream', 'itch',
                   'vicks', 'betnovate', 'scan', 'lens', 'facewash', 'soap', 'shampoo'],
    
    'personal_care': ['haircut', 'cream', 'facewash', 'soap', 'shampoo', 'detergent',
                      'skincare', 'scent', 'perfume', 'valaka', 'thailam', 'comb',
                      'cosmetics', 'grooming'],
    
    'entertainment': ['movie', 'theatre', 'park', 'gift', 'outing', 'swimming', 'turf',
                      'dream11', 'my11', 'rummy', 'ff', 'bgmi', 'game', 'netflix',
                      'hotstar', 'spotify', 'jio saavan', 'subscription'],
    
    'bills': ['electricity', 'water', 'current bill', 'motor charge', 'atm charge', 'sms charge'],
    
    'electronics': ['phone', 'laptop', 'keyboard', 'mouse', 'earphone', 'earbuds', 'temper',
                    'charger', 'cable', 'repair', 'stand', 'skin', 'cover', 'case', 'gadget'],
    
    'accessories': ['chain', 'watch', 'sunglass', 'cap', 'bracelet', 'keychain', 'earrings',
                    'accessories'],
    
    'home': ['supermarket', 'grocery', 'store', 'detergent', 'rope', 'fevicol', 'feviki',
             'bulb', 'wire', 'fan', 'mosquito', 'karpuram', 'cement', 'cylinder'],
    
    'religious': ['temple', 'kovil', 'donate', 'donation', 'hundi', 'pooja', 'function',
                  'ther', 'flower', 'poo'],
    
    'gifts': ['gift', 'frame', 'wrapping', 'birthday', 'bday', 'present'],
    
    'investment': ['share', 'stock', 'emi', 'loan', 'grow', 'investment'],
    
    'miscellaneous': ['unknown', 'forget', 'scammed', 'other', 'misc']
}

def clean_date(date_str):
    """Convert various date formats to YYYY-MM-DD"""
    if not date_str or date_str.strip() == '':
        return None
    
    date_str = str(date_str).strip()
    
    # Handle various formats
    patterns = [
        (r'(\d{1,2})/(\d{1,2})/(\d{4})', '%d/%m/%Y'),
        (r'(\d{1,2})-(\d{1,2})-(\d{4})', '%d-%m-%Y'),
        (r'(\d{4})/(\d{1,2})/(\d{1,2})', '%Y/%m/%d'),
    ]
    
    for pattern, date_format in patterns:
        match = re.search(pattern, date_str)
        if match:
            try:
                if date_format == '%d/%m/%Y' or date_format == '%d-%m-%Y':
                    day, month, year = match.groups()
                    # Handle year typos (like 2058, 2055, 2027)
                    year = int(year)
                    if year > 2030:
                        year = 2024 if year >= 2050 else year
                    
                    # Fix obvious year mistakes based on context
                    if year == 2021 or year == 2023:
                        year = 2024
                    
                    parsed_date = datetime(year, int(month), int(day))
                else:
                    parsed_date = datetime.strptime(date_str, date_format)
                
                return parsed_date.strftime('%Y-%m-%d')
            except:
                pass
    
    return None

def clean_amount(amount_str):
    """Extract numeric value from amount string"""
    if not amount_str or amount_str == '-':
        return 0
    
    # Remove currency symbols and whitespace
    amount_str = str(amount_str).strip().replace('₹', '').replace('Rs', '').replace(',', '')
    
    # Handle negative amounts
    is_negative = amount_str.startswith('-')
    amount_str = amount_str.replace('-', '')
    
    # Extract first number found
    match = re.search(r'\d+\.?\d*', amount_str)
    if match:
        value = float(match.group())
        return -value if is_negative else value
    
    return 0

def categorize_transaction(description):
    """Auto-detect category from description"""
    if not description:
        return 'miscellaneous'
    
    desc_lower = description.lower()
    
    # Check each category
    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in desc_lower:
                return category
    
    return 'miscellaneous'

def determine_type(amount, description):
    """Determine if transaction is income or expense"""
    desc_lower = description.lower() if description else ''
    
    # Income indicators
    income_keywords = ['kudatha', 'given', 'gpay', 'account', 'amount', 'scholarship',
                       'patti', 'appa', 'amma', 'anna', 'credit', 'return', 'refund',
                       'advance return', 'earning', 'salary', 'catering']
    
    # Check if description indicates income
    if any(keyword in desc_lower for keyword in income_keywords):
        if amount > 0:
            return 'income'
    
    # Negative amounts are expenses
    if amount < 0:
        return 'expense'
    
    # Most transactions are expenses
    return 'expense'

def process_csv():
    """Process the CSV file and extract clean transactions"""
    transactions = []
    
    with open('c:\\Users\\arunk\\Downloads\\lifesync-app\\public\\New MONEY CONTROL - Sheet1.csv', 'r', encoding='utf-8') as f:
        content = f.read()
        lines = content.split('\n')
    
    # Process income transactions (left columns)
    for line in lines[1:]:  # Skip header
        parts = line.split(',')
        if len(parts) < 5:
            continue
        
        serial, date, description, _, amount = parts[0:5]
        
        # Skip empty rows and totals
        if not date or 'TOTAL' in date.upper() or 'Overall' in date:
            continue
        
        cleaned_date = clean_date(date)
        cleaned_amount = clean_amount(amount)
        
        if cleaned_date and cleaned_amount != 0 and description.strip():
            category = categorize_transaction(description)
            trans_type = determine_type(cleaned_amount, description)
            
            transactions.append({
                'date': cleaned_date,
                'type': trans_type,
                'category': category,
                'amount': abs(cleaned_amount),
                'description': description.strip(),
                'needs_review': False
            })
    
    # Process expense transactions (right columns)
    for line in lines[1:]:
        parts = line.split(',')
        if len(parts) < 11:
            continue
        
        serial, date, description, _, amount = parts[6:11]
        
        # Skip empty rows and totals
        if not date or 'TOTAL' in str(date).upper() or not description:
            continue
        
        cleaned_date = clean_date(date)
        cleaned_amount = clean_amount(amount)
        
        if cleaned_date and cleaned_amount != 0 and description.strip():
            category = categorize_transaction(description)
            
            transactions.append({
                'date': cleaned_date,
                'type': 'expense',
                'category': category,
                'amount': abs(cleaned_amount),
                'description': description.strip(),
                'needs_review': False
            })
    
    # Sort by date
    transactions.sort(key=lambda x: x['date'])
    
    return transactions

def generate_supabase_format(transactions, user_id="a512c17b-c37c-4bf7-8ea7-a6852d14bd29"):
    """Convert transactions to Supabase insert format"""
    return [{
        'user_id': user_id,
        'date': t['date'],
        'type': t['type'],
        'category': t['category'],
        'amount': t['amount'],
        'description': t['description']
    } for t in transactions]

def analyze_transactions(transactions):
    """Generate financial insights"""
    analysis = {
        'total_income': 0,
        'total_expenses': 0,
        'net_balance': 0,
        'monthly_summary': defaultdict(lambda: {'income': 0, 'expenses': 0}),
        'category_totals': defaultdict(float),
        'transaction_count': len(transactions),
        'date_range': {'start': None, 'end': None}
    }
    
    for t in transactions:
        # Date range
        if not analysis['date_range']['start'] or t['date'] < analysis['date_range']['start']:
            analysis['date_range']['start'] = t['date']
        if not analysis['date_range']['end'] or t['date'] > analysis['date_range']['end']:
            analysis['date_range']['end'] = t['date']
        
        # Income/Expense totals
        if t['type'] == 'income':
            analysis['total_income'] += t['amount']
            month_key = t['date'][:7]  # YYYY-MM
            analysis['monthly_summary'][month_key]['income'] += t['amount']
        else:
            analysis['total_expenses'] += t['amount']
            month_key = t['date'][:7]
            analysis['monthly_summary'][month_key]['expenses'] += t['amount']
            analysis['category_totals'][t['category']] += t['amount']
    
    analysis['net_balance'] = analysis['total_income'] - analysis['total_expenses']
    
    # Sort categories by spending
    analysis['top_categories'] = sorted(
        analysis['category_totals'].items(),
        key=lambda x: x[1],
        reverse=True
    )[:10]
    
    # Convert monthly_summary to list
    monthly = []
    for month, data in sorted(analysis['monthly_summary'].items()):
        monthly.append({
            'month': month,
            'income': data['income'],
            'expenses': data['expenses'],
            'net': data['income'] - data['expenses']
        })
    
    analysis['monthly_summary'] = monthly
    
    return analysis

def generate_insights(analysis):
    """Generate human-readable insights"""
    insights = []
    
    avg_monthly_expense = analysis['total_expenses'] / max(len(analysis['monthly_summary']), 1)
    avg_monthly_income = analysis['total_income'] / max(len(analysis['monthly_summary']), 1)
    
    insights.append(f"📊 **Period**: {analysis['date_range']['start']} to {analysis['date_range']['end']}")
    insights.append(f"📝 **Total Transactions**: {analysis['transaction_count']}")
    insights.append(f"💰 **Total Income**: ₹{analysis['total_income']:,.2f}")
    insights.append(f"💸 **Total Expenses**: ₹{analysis['total_expenses']:,.2f}")
    insights.append(f"💵 **Net Balance**: ₹{analysis['net_balance']:,.2f}")
    insights.append(f"📈 **Average Monthly Income**: ₹{avg_monthly_income:,.2f}")
    insights.append(f"📉 **Average Monthly Expense**: ₹{avg_monthly_expense:,.2f}")
    
    if analysis['net_balance'] < 0:
        insights.append("⚠️ **WARNING**: You're spending more than you earn!")
    
    # Top spending categories
    insights.append("\n🏷️ **Top Spending Categories**:")
    for i, (category, amount) in enumerate(analysis['top_categories'][:5], 1):
        percentage = (amount / analysis['total_expenses']) * 100
        insights.append(f"  {i}. {category.title()}: ₹{amount:,.2f} ({percentage:.1f}%)")
    
    # Financial recommendations
    insights.append("\n💡 **Recommendations**:")
    if analysis['category_totals'].get('food', 0) > avg_monthly_expense * 0.4:
        insights.append("  • Consider meal planning to reduce food expenses")
    if analysis['category_totals'].get('transport', 0) > avg_monthly_expense * 0.2:
        insights.append("  • High transport costs - explore monthly passes or carpooling")
    if analysis['category_totals'].get('entertainment', 0) > avg_monthly_expense * 0.15:
        insights.append("  • Entertainment spending is high - set a monthly budget")
    if analysis['net_balance'] > 0:
        insights.append("  • Great job maintaining positive balance! Consider investing surplus")
    
    return "\n".join(insights)

if __name__ == "__main__":
    print("🔄 Processing your finance data...\n")
    
    # Process transactions
    transactions = process_csv()
    print(f"✅ Processed {len(transactions)} transactions\n")
    
    # Generate outputs
    supabase_data = generate_supabase_format(transactions)
    analysis = analyze_transactions(transactions)
    insights = generate_insights(analysis)
    
    # Save clean JSON
    with open('c:\\Users\\arunk\\Downloads\\lifesync-app\\public\\clean_transactions.json', 'w', encoding='utf-8') as f:
        json.dump(transactions, f, indent=2, ensure_ascii=False)
    
    # Save Supabase format
    with open('c:\\Users\\arunk\\Downloads\\lifesync-app\\public\\supabase_insert.json', 'w', encoding='utf-8') as f:
        json.dump(supabase_data, f, indent=2, ensure_ascii=False)
    
    # Save analysis
    with open('c:\\Users\\arunk\\Downloads\\lifesync-app\\public\\financial_analysis.json', 'w', encoding='utf-8') as f:
        json.dump({
            'summary': {
                'total_income': analysis['total_income'],
                'total_expenses': analysis['total_expenses'],
                'net_balance': analysis['net_balance'],
                'date_range': analysis['date_range'],
                'transaction_count': analysis['transaction_count']
            },
            'monthly_breakdown': analysis['monthly_summary'],
            'top_categories': [{'category': cat, 'amount': amt} for cat, amt in analysis['top_categories']],
            'insights': insights
        }, f, indent=2, ensure_ascii=False)
    
    print("📁 Files generated:")
    print("  • clean_transactions.json - Clean JSON array")
    print("  • supabase_insert.json - Supabase-ready format")
    print("  • financial_analysis.json - Analysis & insights")
    print("\n" + "="*60)
    print(insights)
