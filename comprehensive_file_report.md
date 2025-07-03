# Comprehensive File Report - GestioneCommerciale-Mobile

Generated on: Sunday, June 8, 2025

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total Files** | 106 |
| **Total Lines of Code** | 48,407 |
| **JavaScript Files** | 74 files (39,988 lines) |
| **CSS Files** | 14 files (5,687 lines) |
| **HTML Files** | 2 files (375 lines) |
| **Documentation (MD)** | 13 files (1,899 lines) |
| **Text Files** | 3 files (458 lines) |

## File Type Distribution

```
JavaScript (*.js)  : ████████████████████████████████ 82.6% (39,988 lines)
CSS (*.css)        : █████ 11.7% (5,687 lines)
Markdown (*.md)    : ██ 3.9% (1,899 lines)
Text (*.txt)       : █ 0.9% (458 lines)
HTML (*.html)      : █ 0.8% (375 lines)
```

## Directory Structure with Line Counts

### Root Directory Files
**Path:** `/home/flavio2025/Desktop/GestioneCommerciale-Mobile`

| File | Lines | Type |
|------|-------|------|
| fix-invoice-products.js | 117 | JavaScript |
| index.html | 235 | HTML |
| test-ftv-parser.html | 140 | HTML |
| ANALISI_COMPLETA_FILE.md | 233 | Documentation |
| FILE_ANALYSIS_REPORT.md | 138 | Documentation |
| FIX_COMPLETO_FINALE.md | 135 | Documentation |
| FIX_IMPLEMENTATI_COMPLETI.md | 211 | Documentation |
| FIX_INDIRIZZI_P.ZA.md | 102 | Documentation |
| FIX_PRECISIONE_INDIRIZZI.md | 168 | Documentation |
| FTV_PARSER_FIX_SUMMARY.md | 52 | Documentation |
| IMPROVEMENTS_SUMMARY.md | 89 | Documentation |
| IMPROVEMENTS_LUOGO_FIX.txt | 63 | Text |
| all_files_list.txt | 384 | Text |

### Configuration Files
**Path:** `/config`

| File | Lines | Description |
|------|-------|-------------|
| api-config.js | 163 | API configuration settings |

### CSS Stylesheets
**Path:** `/css`

| File | Lines | Purpose |
|------|-------|---------|
| base-components.css | 633 | Base component styles |
| clients-module.css | 403 | Client management styles |
| main.css | 468 | Main application styles |
| mobile.css | 257 | Mobile responsive styles |
| modal-components.css | 359 | Modal dialog styles |
| orders-module.css | 290 | Order management styles |
| ordini.css | 746 | Additional order styles |
| percorsi-module.css | 213 | Route management styles |
| products-module.css | 338 | Product management styles |
| tables.css | 387 | Table component styles |
| timeline-components.css | 416 | Timeline component styles |
| ui-components.css | 321 | UI component styles |
| worksheet-module.css | 265 | Worksheet module styles |
| worksheet.css | 591 | Additional worksheet styles |

**CSS Total:** 5,687 lines

### Documentation
**Path:** `/docs`

| File | Lines | Content |
|------|-------|---------|
| FIX-DDT-ADDRESS.md | 65 | DDT address fixes documentation |
| README.md | 219 | Main project documentation |
| structure.md | 379 | Project structure documentation |

### Core JavaScript Modules
**Path:** `/js`

| Module | Lines | Description |
|--------|-------|-------------|
| **API & Core** | | |
| api.js | 377 | API service layer |
| app.js | 369 | Main application entry point |
| navigation.js | 299 | Navigation management |
| utils.js | 333 | Utility functions |
| **Client Management** | | |
| clienti-core.js | 450 | Client management core |
| clienti-form.js | 180 | Client form handling |
| clienti-import-export.js | 243 | Client import/export |
| clienti-table.js | 123 | Client table view |
| clienti-utils.js | 40 | Client utilities |
| **DDT/Invoice Management** | | |
| ddtft-core.js | 760 | DDT/Invoice core logic |
| ddtft-create.js | 293 | Document creation |
| ddtft-filters.js | 194 | Document filtering |
| ddtft-import.js | 6,315 | Document import (largest file!) |
| ddtft-utils.js | 135 | Document utilities |
| ddtft-view.js | 256 | Document viewing |
| extractors.js | 583 | Data extraction utilities |
| **Order Management** | | |
| ordini.js | 635 | Order management main |
| ordini-export-inline.js | 563 | Order export functionality |
| **Route Management** | | |
| percorsi.js | 1,031 | Route management main |
| percorsi-core.js | 311 | Route core logic |
| percorsi-crud.js | 234 | Route CRUD operations |
| percorsi-import.js | 243 | Route import |
| percorsi-table.js | 181 | Route table view |
| percorsi-utils.js | 63 | Route utilities |
| **Product Management** | | |
| prodotti.js | 594 | Product management |
| **Worksheet Management** | | |
| worksheet-core.js | 376 | Worksheet core |
| worksheet-data.js | 440 | Worksheet data handling |
| worksheet-dragdrop.js | 68 | Drag & drop functionality |
| worksheet-filters.js | 121 | Worksheet filtering |
| worksheet-import.js | 408 | Worksheet import |
| worksheet-itinerary.js | 552 | Itinerary management |
| worksheet-ui.js | 545 | Worksheet UI |
| worksheet-view.js | 670 | Worksheet viewing |

### JavaScript Modules Directory
**Path:** `/js/modules`

#### Order Export Module
| File | Lines | Purpose |
|------|-------|---------|
| ordini-export.js | 227 | Main export module |
| ordini-export-core.js | 290 | Core export logic |
| ordini-export-ui.js | 504 | Export UI components |
| ordini-export-utils.js | 201 | Export utilities |
| ordini-export-validation.js | 346 | Export validation |
| ordini-export-venduto.js | 562 | Sold items export |

#### Order Parser Module
| File | Lines | Purpose |
|------|-------|---------|
| ordini-parser.js | 863 | Order parsing logic |
| ordini-parser-fixed.js | 616 | Fixed parser version |
| ordini-ui.js | 693 | Order UI components |

#### DDT/Invoice Module
**Path:** `/js/modules/ddtft`

| File | Lines | Purpose |
|------|-------|---------|
| index.js | 213 | Module entry point |
| address-utils.js | 533 | Address parsing utilities |
| ddt-extractor.js | 1,915 | DDT extraction logic |
| document-parser.js | 550 | Document parsing |
| export-excel.js | 609 | Excel export functionality |
| fattura-extractor.js | 3,026 | Invoice extraction (largest!) |
| fattura-extractor-fixed.js | 159 | Fixed extractor version |
| fattura-extractor-improved.js | 220 | Improved extractor |
| fattura-extractor-new.js | 119 | New extractor version |
| pdf-extractor.js | 115 | PDF extraction |
| ui-dialogs.js | 339 | UI dialog components |
| utils.js | 137 | Module utilities |
| README.md | 54 | Module documentation |

**Note:** A backup of the DDT/Invoice module exists at `/js/modules/ddtft.backup.20250608_145143` with similar files.

#### Timeline Module
**Path:** `/js/timeline`

| File | Lines | Purpose |
|------|-------|---------|
| timeline-config.js | 53 | Timeline configuration |
| timeline-controls.js | 410 | Timeline controls |
| timeline-core.js | 590 | Core timeline logic |
| timeline-events.js | 515 | Event handling |
| timeline-rendering.js | 422 | Rendering logic |
| timeline-utils.js | 102 | Timeline utilities |

## Top 10 Largest Files

1. **ddtft-import.js** - 6,315 lines (DDT/Invoice import)
2. **fattura-extractor.js** - 3,026 lines (Invoice extraction)
3. **fattura-extractor.js (backup)** - 2,890 lines
4. **ddt-extractor.js** - 1,915 lines (DDT extraction)
5. **ddt-extractor.js (backup)** - 1,510 lines
6. **percorsi.js** - 1,031 lines (Route management)
7. **ordini-parser.js** - 863 lines (Order parsing)
8. **ddtft-core.js** - 760 lines (DDT/Invoice core)
9. **ordini.css** - 746 lines (Order styles)
10. **ordini-ui.js** - 693 lines (Order UI)

## Module Statistics

| Module | Files | Total Lines | Avg Lines/File |
|--------|-------|-------------|----------------|
| Client Management | 5 | 1,346 | 269 |
| DDT/Invoice Management | 19 | 20,383 | 1,073 |
| Order Management | 11 | 5,834 | 530 |
| Route Management | 6 | 2,033 | 339 |
| Worksheet Management | 8 | 3,060 | 383 |
| Timeline | 6 | 2,092 | 349 |
| Product Management | 1 | 594 | 594 |
| Core/Utils | 4 | 1,378 | 345 |

## Code Quality Indicators

- **Average lines per JavaScript file:** 540 lines
- **Average lines per CSS file:** 406 lines
- **Largest module:** DDT/Invoice Management (20,383 lines)
- **Most complex file:** ddtft-import.js (6,315 lines)

## Recommendations

1. **Code Refactoring:** The `ddtft-import.js` file with 6,315 lines should be split into smaller, more manageable modules
2. **Module Organization:** Consider breaking down large extractors (fattura-extractor.js, ddt-extractor.js) into smaller components
3. **Documentation:** Some modules lack README files - consider adding documentation for better maintainability
4. **Backup Management:** Review and potentially remove the backup directory if no longer needed