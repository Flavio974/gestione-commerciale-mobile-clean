# DDT-FT Import Module Structure Analysis

## File Overview
- **File**: `/home/flavio2025/Desktop/GestioneCommerciale-Mobile/js/ddtft-import.js`
- **Total Lines**: 6,315
- **Purpose**: Handles import and parsing of DDT (Delivery Notes) and Fatture (Invoices) from PDF files
- **Based on**: Original working code (as noted in comments)

## Main Components

### 1. Global Object: DDTFTImport (Lines 10-1385)
The main module object that provides all public methods.

#### Key Methods:
- **extractTextFromPdf** (14-121): Extracts text from PDF using pdf.js
- **parseDocumentFromText** (125-296): Main parser that determines doc type and delegates to appropriate extractor
- **extractDocumentNumber** (301-327): Extracts document number based on type
- **extractDate** (332-358): Extracts date from various formats
- **extractClientName** (363-588): Complex client name extraction with multi-line handling
- **standardizeClientName** (593-643): Maps full names to short standard names
- **extractVatNumber** (648-651): Extracts VAT number
- **isAlfieriAddress** (656-675): Checks if address belongs to Alfieri
- **validateDeliveryAddress** (680-710): Validates delivery addresses
- **debugAddressExtraction** (715-734): Debug helper for address extraction
- **extractDeliveryAddress** (739-785): Main delivery address extraction logic
- **extractFromDeliverySection** (788-896): Extracts from delivery section
- **extractDeliveryFromInternalCode** (899-926): Maps internal codes to delivery addresses
- **extractDeliveryFromODV** (929-958): Maps ODV codes to delivery addresses
- **extractDeliveryFromFTV** (963-983): Specific extraction for FTV templates
- **extractDeliveryAddressDDT** (988-1046): DDT-specific delivery address extraction
- **extractDeliveryBackupPatterns** (1049-1193): Fallback patterns for delivery addresses
- **extractOrderReference** (1198-1217): Extracts order references
- **extractItems** (1222-1253): Extracts product items
- **generateId** (1258-1260): Generates unique document IDs
- **exportDocumentsToExcel** (1266-1273): Delegates to export module
- **UI Dialog methods** (1275-1298): Delegated to DDTFTUIDialogs module
- **importDDTFTFile** (1303-1344): Imports existing DDT-FT.xlsx files
- **syncWithExistingDDTFT** (1349-1376): Syncs localStorage with existing file
- **showLoadingModal** (1378-1380): UI helper
- **showSyncResults** (1382-1384): UI helper

### 2. Class: DDTExtractor (Lines 1387-3335)
Specialized extractor for DDT documents.

#### Constructor (1392-1405)
- Initializes with text, debug element, and filename
- Sets up article codes array
- Creates internal cache

#### Key Methods:
- **log** (1407-1411): Logging helper
- **cleanNumber** (1413-1427): Number cleaning utility
- **extract** (1429-1508): Main extraction method
- **extractDocumentNumber** (1510-1539): DDT number extraction
- **extractDate** (1541-1573): Date extraction with caching
- **extractClientCode** (1575-1612): Client code extraction
- **extractClient** (1614-1897): Complex client extraction logic
- **extractVatNumber** (1899-1945): VAT number extraction
- **extractFiscalCode** (1947-1954): Fiscal code extraction
- **extractOrderReference** (1956-1984): Order reference extraction
- **isVettoreAddress** (1987-2033): Helper to check carrier addresses
- **extractClientAndAddressFromDDV** (2035-2277): DDV-specific extraction
- **extractDeliveryAddressFromTwoColumns** (2279-2375): Two-column layout extraction
- **extractDeliveryAddress** (2377-2498): Main delivery address extraction
- **extractDeliveryAddressOLD** (2500-2696): Legacy delivery address extraction
- **extractDeliveryDate** (2698-2754): Delivery date extraction
- **extractArticles** (2756-2965): Product extraction logic
- **extractDocumentTotal** (2967-3054): Total amount extraction
- **calculateTotals** (3056-3115): Calculate totals from items
- **extractInvoiceProducts** (3117-3249): Invoice product extraction
- **extractInvoiceTotals** (3251-3333): Invoice totals extraction

### 3. Class: FatturaExtractor (Lines 1387-6313)
Specialized extractor for Fattura (Invoice) documents.

#### Constructor (3341-3347)
- Similar to DDTExtractor initialization

#### Key Methods:
- **log** (3349-3353): Logging helper
- **extract** (3355-3433): Main extraction method
- **extractDocumentNumberNew** (3435-3529): Document number extraction
- **extractDocumentDateNew** (3531-3567): Date extraction
- **extractClientForInvoice** (3569-3652): Client extraction for invoices
- **extractVatNumber** (3654-3702): VAT number extraction
- **extractFiscalCode** (3704-3715): Fiscal code extraction
- **extractOrderReference** (3717-3748): Order reference extraction
- **extractInvoiceProductsTableSimple** (3750-3950): Simple table product extraction
- **extractInvoiceProductsTableAdvanced** (3952-4322): Advanced table product extraction
- **extractDeliveryAddress** (4325-4339): Delivery address extraction
- **extractDeliveryAddressOLD** (4341-4537): Legacy delivery address extraction
- **extractInvoiceTotals** (4539-4678): Invoice totals extraction
- **calculateTotals** (4680-4714): Calculate totals from products
- **cleanProductDescription** (4716-4743): Clean product descriptions
- **cleanNumber** (4745-4761): Number cleaning utility
- **extractTraditionalInvoice** (6272-6313): Fallback traditional extraction

### 4. External Dependencies

#### Required Libraries:
- **pdf.js** (window.pdfjsLib): PDF text extraction
- **XLSX**: Excel file reading/writing
- **DDTFTUIDialogs**: UI dialog module (delegated)
- **DDTFTExportExcel**: Excel export module (delegated)

#### DOM Dependencies:
- document.getElementById('documentDebugContent'): Debug output element

#### Storage:
- localStorage: For storing synced DDT-FT data

### 5. Constants and Configurations

#### Article Codes (DDTExtractor):
```javascript
['070017', '070056', '070057', '200000', '200016', '200523', 
 '200527', '200553', '200575', '200576', 'DL000301', 'PS000034', 
 'PS000077', 'PS000386', 'VS000012', 'VS000169', 'VS000198', 
 'VS000425', 'VS000881', 'VS000891', 'PIRR002', 'PIRR003', 'PIRR004']
```

#### Name Mapping (standardizeClientName):
- Maps full company names to standardized short names
- Examples: 'IL GUSTO FRUTTA E VERDURA DI SQUILLACIOTI FRANCESCA' → 'Il Gusto'

#### Internal Code Mapping (extractDeliveryFromInternalCode):
- Maps internal codes to delivery addresses
- Example: '701029' → 'VIA CAVOUR, 61 14100 ASTI AT'

#### ODV Mapping (extractDeliveryFromODV):
- Maps ODV codes to delivery addresses
- Example: '507A085AS00704' → 'VIA CAVOUR, 61 14100 ASTI AT'

### 6. Regular Expression Patterns

#### Document Number Patterns:
- DDT: `/DDT\s+(\d+)\s+\d{2}\/\d{2}\/\d{2}/i`
- Fattura: `/FATTURA\s*N[°.]?\s*(\d+)/i`

#### Date Patterns:
- `/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/`
- `/DATA[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i`

#### VAT Number Pattern:
- `/P(?:ARTITA)?\.?\s*IVA[:\s]*(\d{11})/i`

#### Product Patterns:
- `/\b(\d{6}|[A-Z]{2}\d{6}|PIRR\d{3})\s+(.*?)\s+(\d+(?:[,\.]\d+)?)\s+(PZ|KG|LT|MT|CF|CT|GR|ML)/gi`

#### Address Patterns:
- Multiple complex patterns for various address formats
- Special handling for two-column layouts
- Validation patterns for street types and postal codes

### 7. Critical Parts for Refactoring

#### High Priority:
1. **Client Name Extraction** (extractClientName, extractClient): Complex multi-line logic with many edge cases
2. **Delivery Address Extraction**: Multiple methods with overlapping functionality
3. **Two-Column Layout Handling**: Complex parsing logic spread across methods
4. **Caching Strategy**: Inconsistent caching implementation in DDTExtractor

#### Medium Priority:
1. **Regular Expression Patterns**: Should be centralized as constants
2. **Number Cleaning**: Duplicated in both extractors
3. **Logging**: Could be standardized with a proper logging system
4. **Error Handling**: Inconsistent try-catch usage

#### Low Priority:
1. **Method Organization**: Some methods are very long and could be split
2. **Code Comments**: Mix of Italian and English comments
3. **Magic Numbers**: Hard-coded values should be constants

### 8. Module Export
- Global export: `window.DDTFTImport = DDTFTImport;` (Line 6316)

### 9. Data Flow
1. PDF file → extractTextFromPdf → raw text
2. Raw text → parseDocumentFromText → determine type (DDT/Fattura)
3. Type-specific extraction:
   - DDT → DDTExtractor → structured data
   - Fattura → FatturaExtractor → structured data
4. Structured data → UI display or Excel export

### 10. Key Observations
- The module handles both empty templates (DDV/FTV) and filled documents
- Special handling for Alfieri company addresses
- Complex logic for multi-line and two-column layouts
- Extensive pattern matching for various document formats
- Built-in debugging capabilities with console and DOM output
- Modular design with delegated UI and export functionality