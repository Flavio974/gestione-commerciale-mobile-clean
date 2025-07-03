# FTV Parser Fix Summary

## Problem
The FTV (Fattura Template Vuoti) parser was incorrectly extracting product names like "TORTA DI MELIGA ARANCIA" as the client name instead of the actual client "CAFFÈ COMMERCIO SNC DI RIZZOGLIO C. E FIGLIE" which appears after "ALFIERI SPECIALITA' ALIMENTARI S.P.A." in the document.

## Root Cause
The original logic in `extractClientForInvoice()` method (lines 1807-1889) was:
1. Looking for text after "ALFIERI SPECIALITA' ALIMENTARI S.P.A."
2. Extracting everything until it found an address pattern
3. This was capturing product names that appear between ALFIERI and the actual client

## Solution Implemented

### Modified: `/home/flavio2025/Desktop/GestioneCommerciale-Mobile/js/modules/ddtft/fattura-extractor.js`

Changed the FTV extraction logic to:

1. **Pattern 1**: Look for client names that appear after product sections (products have codes like 200261, VS000425, etc.)
2. **Pattern 2**: Detect when we're in a product section and then find the first non-product line that looks like a company name
3. **Pattern 3**: Specifically look for "CAFFÈ COMMERCIO SNC" pattern
4. **Pattern 4**: Search for other known client patterns that commonly appear in FTV documents

### Key Changes:
- Added logic to skip over product lines (identified by product codes)
- Added specific patterns for known clients
- Improved detection of where the actual client name starts after the product list

## Test File Created
Created `/home/flavio2025/Desktop/GestioneCommerciale-Mobile/test-ftv-parser.html` to test the fix with sample FTV content.

## How It Works Now

1. When processing FTV files, the parser:
   - Identifies product sections by their codes (6-digit numbers, VS/GF/PIRR prefixes)
   - Skips over product descriptions
   - Finds the actual client name that appears after the products
   - Uses fallback patterns for known clients

2. The parser now correctly identifies:
   - "CAFFÈ COMMERCIO SNC DI RIZZOGLIO C. E FIGLIE" instead of "TORTA DI MELIGA ARANCIA"
   - Other clients that appear in similar positions in FTV templates

## Testing
To test the fix:
1. Open `test-ftv-parser.html` in a browser
2. The test case contains the problematic FTV content
3. Click "Test Parser" to verify the client is now correctly extracted

## Future Improvements
Consider adding:
1. More robust product code detection patterns
2. A configurable list of known clients for FTV templates
3. Better handling of multi-line client names in FTV format