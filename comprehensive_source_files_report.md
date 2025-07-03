# Comprehensive Source Files Line Count Report

Generated on: Sun Jun 8 21:00:52 CEST 2025

## Executive Summary

- **Total Files**: 109 source files
- **Total Lines of Code**: 58,907 lines
- **JavaScript**: 93 files (52,845 lines)
- **CSS**: 14 files (5,687 lines)
- **HTML**: 2 files (375 lines)

## Module Breakdown

### Core Application Modules
- **DDT/FT Module**: 31,155 lines (largest module - handles document import/export)
- **Ordini Module**: 5,500 lines (order management)
- **Worksheet Module**: 3,180 lines (worksheet functionality)
- **API & App Core**: 2,884 lines (main application framework)
- **Timeline Module**: 2,092 lines (timeline visualization)
- **Percorsi Module**: 2,063 lines (route management)
- **Clienti Module**: 1,036 lines (client management)

## Detailed File Listing

### JavaScript Files (.js) - 93 files, 52,845 lines

#### Configuration Files
```
   163  ./config/api-config.js
   168  ./js/config/ddtft-mappings.js
   205  ./js/config/ddtft-patterns.js
```

#### Core Application Files
```
   377  ./js/api.js
   369  ./js/app.js
   299  ./js/navigation.js
   333  ./js/utils.js
   117  ./fix-invoice-products.js
```

#### Clienti Module
```
   450  ./js/clienti-core.js
   180  ./js/clienti-form.js
   243  ./js/clienti-import-export.js
   123  ./js/clienti-table.js
    40  ./js/clienti-utils.js
```

#### DDT/FT Module
```
   760  ./js/ddtft-core.js
   293  ./js/ddtft-create.js
   194  ./js/ddtft-filters.js
   319  ./js/ddtft-import-new.js
  6435  ./js/ddtft-import.js (main import handler)
   135  ./js/ddtft-utils.js
   256  ./js/ddtft-view.js
   583  ./js/extractors.js
```

#### DDT/FT Parsers
```
   380  ./js/parsers/base-extractor.js
  1256  ./js/parsers/ddt-extractor-module.js
  1942  ./js/parsers/fattura-extractor-module.js
   371  ./js/utils/ddtft-parsing-utils.js
```

#### DDT/FT Module Components
```
   533  ./js/modules/ddtft/address-utils.js
  1926  ./js/modules/ddtft/ddt-extractor.js
   550  ./js/modules/ddtft/document-parser.js
   609  ./js/modules/ddtft/export-excel.js
  3099  ./js/modules/ddtft/fattura-extractor.js
   213  ./js/modules/ddtft/index.js
   115  ./js/modules/ddtft/pdf-extractor.js
   339  ./js/modules/ddtft/ui-dialogs.js
   137  ./js/modules/ddtft/utils.js
```

#### Ordini Module
```
   635  ./js/ordini.js
   563  ./js/ordini-export-inline.js
   290  ./js/modules/ordini-export-core.js
   504  ./js/modules/ordini-export-ui.js
   201  ./js/modules/ordini-export-utils.js
   346  ./js/modules/ordini-export-validation.js
   562  ./js/modules/ordini-export-venduto.js
   227  ./js/modules/ordini-export.js
   616  ./js/modules/ordini-parser-fixed.js
   863  ./js/modules/ordini-parser.js
   693  ./js/modules/ordini-ui.js
```

#### Percorsi Module
```
   311  ./js/percorsi-core.js
   234  ./js/percorsi-crud.js
   243  ./js/percorsi-import.js
   181  ./js/percorsi-table.js
    63  ./js/percorsi-utils.js
  1031  ./js/percorsi.js
```

#### Worksheet Module
```
   376  ./js/worksheet-core.js
   440  ./js/worksheet-data.js
    68  ./js/worksheet-dragdrop.js
   121  ./js/worksheet-filters.js
   408  ./js/worksheet-import.js
   552  ./js/worksheet-itinerary.js
   545  ./js/worksheet-ui.js
   670  ./js/worksheet-view.js
```

#### Timeline Module
```
    53  ./js/timeline/timeline-config.js
   410  ./js/timeline/timeline-controls.js
   590  ./js/timeline/timeline-core.js
   515  ./js/timeline/timeline-events.js
   422  ./js/timeline/timeline-rendering.js
   102  ./js/timeline/timeline-utils.js
```

#### Other Modules
```
   594  ./js/prodotti.js
```

#### Test Files
```
    41  ./test/debug-why-not-matching.js
   229  ./test/fixtures/capture-current-behavior.js
   291  ./test/integration/ddtft-import.test.js
    92  ./test/simulate-exact-flow.js
   150  ./test/test-ddv-address-fix.js
   108  ./test/test-debug-ddv-parsing.js
   150  ./test/test-extraction-fixes.js
   150  ./test/test-ftv-extraction-fix.js
   198  ./test/test-ftv-extraction-inline.js
   270  ./test/test-refactoring.js
    18  ./test/verify-loc-pattern.js
```

### CSS Files (.css) - 14 files, 5,687 lines

```
   633  ./css/base-components.css
   403  ./css/clients-module.css
   468  ./css/main.css
   257  ./css/mobile.css
   359  ./css/modal-components.css
   290  ./css/orders-module.css
   746  ./css/ordini.css
   213  ./css/percorsi-module.css
   338  ./css/products-module.css
   387  ./css/tables.css
   416  ./css/timeline-components.css
   321  ./css/ui-components.css
   265  ./css/worksheet-module.css
   591  ./css/worksheet.css
```

### HTML Files (.html) - 2 files, 375 lines

```
   235  ./index.html
   140  ./test-ftv-parser.html
```

## Key Observations

1. **Largest Module**: The DDT/FT (Document Import/Export) module is by far the largest, comprising over 31,000 lines of code (59% of all JavaScript code).

2. **Code Organization**: The application is well-modularized with clear separation between:
   - Core functionality (API, navigation, utilities)
   - Feature modules (clienti, ordini, percorsi, worksheet, timeline)
   - Parsers and extractors for document processing
   - UI components and styling

3. **Test Coverage**: There are 11 test files totaling 1,697 lines, primarily focused on the DDT/FT functionality.

4. **Backup Files**: The project includes backup copies of the DDT/FT module (ddtft.backup.20250608_145143), indicating recent refactoring work.

5. **CSS Architecture**: The CSS is well-organized into module-specific files (clients-module.css, orders-module.css, etc.) with base components and responsive mobile styles.

## File Organization Structure

```
├── Root (3 files)
│   ├── index.html
│   ├── test-ftv-parser.html
│   └── fix-invoice-products.js
│
├── config/ (1 file)
│   └── api-config.js
│
├── css/ (14 files - all styling)
│
├── js/ (Main JavaScript directory)
│   ├── Core files (8 files)
│   ├── config/ (2 files)
│   ├── modules/ (22 files)
│   ├── parsers/ (3 files)
│   ├── timeline/ (6 files)
│   └── utils/ (1 file)
│
└── test/ (11 files)
    ├── fixtures/ (1 file)
    ├── integration/ (1 file)
    └── unit tests (9 files)
```

This comprehensive report provides a complete overview of all source files in the GestioneCommerciale-Mobile application, their line counts, and organizational structure.