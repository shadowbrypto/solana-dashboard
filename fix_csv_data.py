#!/usr/bin/env python3
import os
import glob
import csv
import re

def convert_scientific_to_decimal(value):
    """Convert scientific notation to regular decimal format"""
    try:
        # Check if it's in scientific notation
        if 'e+' in str(value).lower():
            num = float(value)
            return f"{num:.2f}"
        return value
    except:
        return value

def fix_csv_file(filepath):
    """Fix CSV file by converting scientific notation and replacing <nil> with 0"""
    print(f"Processing {filepath}...")
    
    # Read the CSV file
    with open(filepath, 'r') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames
        rows = list(reader)
    
    changes_made = False
    numeric_columns = ['total_volume_usd', 'daily_users', 'numberOfNewUsers', 'daily_trades', 'total_fees_usd']
    
    # Process each row
    for row in rows:
        for col in numeric_columns:
            if col in row:
                value = row[col]
                
                # Replace <nil> with 0
                if value == '<nil>':
                    row[col] = '0'
                    changes_made = True
                # Convert scientific notation
                elif value and 'e+' in value.lower():
                    row[col] = convert_scientific_to_decimal(value)
                    changes_made = True
    
    if changes_made:
        # Write the fixed CSV
        with open(filepath, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            writer.writerows(rows)
        print(f"  ✓ Fixed and saved {filepath}")
    else:
        print(f"  - No changes needed for {filepath}")
    
    return changes_made

def main():
    csv_dir = "/Users/sairaghavaa/Documents/GitHub/sol-analytics/server/public/data"
    csv_files = glob.glob(os.path.join(csv_dir, "*.csv"))
    
    print(f"Found {len(csv_files)} CSV files to process\n")
    
    fixed_count = 0
    for csv_file in sorted(csv_files):
        try:
            if fix_csv_file(csv_file):
                fixed_count += 1
        except Exception as e:
            print(f"  ✗ Error processing {csv_file}: {e}")
    
    print(f"\nSummary: Fixed {fixed_count} out of {len(csv_files)} CSV files")

if __name__ == "__main__":
    main()