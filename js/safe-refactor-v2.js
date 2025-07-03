/**
 * Safe Refactoring Wrapper for DDT/FT Import System - V2
 * 
 * Fixed version that correctly uses singleton utilities
 * 
 * This file implements safe wrappers with fallback mechanisms
 * to fix the three main issues without breaking existing functionality:
 * 1. Duplicate client names
 * 2. Missing delivery addresses
 * 3. Incorrect product extraction
 * 
 * PRINCIPLE: Never break what works, always provide fallback
 */

class SafeDDTFTWrapper {
    constructor() {
        this.debug = true;
        this.testMode = false;
        this.results = {
            improvements: 0,
            fallbacks: 0,
            errors: 0
        };
    }

    log(message, type = 'info') {
        if (this.debug) {
            const prefix = {
                'info': '📋',
                'success': '✅',
                'warning': '⚠️',
                'error': '❌',
                'fallback': '🔄'
            }[type] || '📋';
            console.log(`${prefix} SafeWrapper: ${message}`);
        }
    }

    /**
     * WRAPPER 1: Safe Client Name Extraction
     * Fixes duplicate names like "DONAC S.R.L. DONAC S.R.L."
     */
    safeExtractClientName(text, extractor) {
        this.log('Extracting client name with safe wrapper');
        
        try {
            // Step 1: Try the original method
            const originalResult = extractor.extractClientName.call(extractor);
            this.log(`Original result: "${originalResult}"`);
            
            if (!originalResult || !originalResult.trim()) {
                this.log('Original method returned empty', 'warning');
                this.results.fallbacks++;
                return originalResult;
            }
            
            // Step 2: Check for duplicates and fix
            const fixedResult = this.removeDuplicateWords(originalResult);
            
            if (fixedResult !== originalResult) {
                this.log(`Fixed duplicate: "${originalResult}" → "${fixedResult}"`, 'success');
                this.results.improvements++;
                return fixedResult;
            }
            
            // Step 3: Try standardization if available
            if (window.standardizeClientName) {
                const standardized = window.standardizeClientName(fixedResult);
                if (standardized !== fixedResult) {
                    this.log(`Standardized: "${fixedResult}" → "${standardized}"`, 'success');
                    this.results.improvements++;
                    return standardized;
                }
            }
            
            return fixedResult;
            
        } catch (error) {
            this.log(`Error in safe client extraction: ${error.message}`, 'error');
            this.results.errors++;
            
            // Fallback to original method
            this.log('Falling back to original method', 'fallback');
            this.results.fallbacks++;
            return extractor.extractClientName.call(extractor);
        }
    }

    /**
     * Remove duplicate words from client name
     */
    removeDuplicateWords(name) {
        if (!name) return name;
        
        // First check for complete phrase duplication like "DONAC S.R.L. DONAC S.R.L."
        const halfLength = Math.floor(name.length / 2);
        if (name.length > 10) {
            // Check if the string is exactly duplicated
            const firstHalf = name.substring(0, halfLength);
            const secondHalf = name.substring(halfLength);
            if (firstHalf.trim() === secondHalf.trim()) {
                this.log(`Found exact duplication: "${firstHalf.trim()}" repeated`);
                return firstHalf.trim();
            }
            
            // Check for pattern with space in between like "DONAC S.R.L. DONAC S.R.L."
            const parts = name.split(/\s+/);
            const midpoint = Math.floor(parts.length / 2);
            if (parts.length >= 4 && parts.length % 2 === 0) {
                const firstPart = parts.slice(0, midpoint).join(' ');
                const secondPart = parts.slice(midpoint).join(' ');
                if (firstPart === secondPart) {
                    this.log(`Found phrase duplication: "${firstPart}" repeated`);
                    return firstPart;
                }
            }
        }
        
        // Then check for consecutive duplicate words
        const words = name.split(/\s+/);
        const result = [];
        let lastWord = '';
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            
            // Check if this word is a duplicate of the last
            if (word === lastWord) {
                // Allow some suffixes to be duplicated if they're in different formats
                const allowedDuplicates = /^(S\.R\.L\.|S\.P\.A\.|SRL|SPA|SNC|S\.N\.C\.)$/i;
                if (!word.match(allowedDuplicates) || 
                    (lastWord.match(allowedDuplicates) && word.match(allowedDuplicates) && lastWord === word)) {
                    this.log(`Skipping duplicate word: "${word}"`);
                    continue;
                }
            }
            
            result.push(word);
            lastWord = word;
        }
        
        return result.join(' ').trim();
    }

    /**
     * WRAPPER 2: Safe Delivery Address Extraction
     * Handles two-column layouts and missing addresses
     */
    safeExtractDeliveryAddress(text, extractor) {
        this.log('Extracting delivery address with safe wrapper');
        
        try {
            // Step 1: Try original method
            const originalResult = extractor.extractDeliveryAddress.call(extractor);
            
            // Step 2: If empty or invalid, try advanced methods
            if (!originalResult || originalResult.length < 10) {
                this.log('Original method returned insufficient data', 'warning');
                
                // Try two-column layout extraction
                if (window.DDTFTAddressUtils) {
                    // DDTFTAddressUtils is a singleton object, not a constructor
                    const addressUtils = window.DDTFTAddressUtils;
                    
                    // Method 1: Two column layout
                    const twoColResult = addressUtils.extractFromTwoColumnLayout(text);
                    if (twoColResult) {
                        this.log(`Found address with two-column method: "${twoColResult}"`, 'success');
                        this.results.improvements++;
                        return twoColResult;
                    }
                    
                    // Method 2: Enhanced patterns
                    const patternResult = this.extractWithEnhancedPatterns(text);
                    if (patternResult) {
                        this.log(`Found address with enhanced patterns: "${patternResult}"`, 'success');
                        this.results.improvements++;
                        return patternResult;
                    }
                }
                
                // Method 3: Look for specific cases like the DONAC example
                const donacResult = this.extractDonacStyleAddress(text);
                if (donacResult) {
                    this.log(`Found address with DONAC-style extraction: "${donacResult}"`, 'success');
                    this.results.improvements++;
                    return donacResult;
                }
            }
            
            // Step 3: Validate the result
            if (originalResult && this.isValidDeliveryAddress(originalResult)) {
                return originalResult;
            }
            
            this.log('No valid delivery address found', 'warning');
            this.results.fallbacks++;
            return originalResult || '';
            
        } catch (error) {
            this.log(`Error in safe delivery extraction: ${error.message}`, 'error');
            this.results.errors++;
            
            // Fallback
            this.log('Falling back to original method', 'fallback');
            this.results.fallbacks++;
            return extractor.extractDeliveryAddress.call(extractor);
        }
    }

    /**
     * Extract addresses using enhanced patterns
     */
    extractWithEnhancedPatterns(text) {
        const patterns = [
            // Standard patterns
            /DESTINAZIONE[:\s]+([^\n]+)/i,
            /CONSEGNA[:\s]+([^\n]+)/i,
            /LUOGO\s+DI\s+CONSEGNA[:\s]+([^\n]+)/i,
            // New patterns for different street types
            /CONSEGNA[:\s]*(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|P\.ZZA|STRADA|LOC\.|LOCALITA|VICOLO|LARGO)[^\n]+/i,
            // Pattern for delivery section after client
            /Cliente:.*?\n.*?(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|P\.ZZA|STRADA|LOC\.|LOCALITA)[^\n]+/is
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const address = match[1] || match[0];
                // Clean up the address
                const cleaned = address
                    .replace(/^(DESTINAZIONE|CONSEGNA|LUOGO\s+DI\s+CONSEGNA)[:\s]+/i, '')
                    .trim();
                
                if (cleaned && cleaned.length > 10) {
                    return cleaned;
                }
            }
        }
        
        return null;
    }

    /**
     * Extract DONAC-style addresses (two addresses on same line)
     */
    extractDonacStyleAddress(text) {
        const lines = text.split('\n');
        
        for (const line of lines) {
            // Pattern: "VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65"
            const match = line.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA).+?\s+(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\s+(.+)$/i);
            
            if (match) {
                // Extract the second address (delivery)
                const deliveryAddress = match[2] + ' ' + match[3];
                return deliveryAddress.trim();
            }
        }
        
        return null;
    }

    /**
     * Validate delivery address
     */
    isValidDeliveryAddress(address) {
        if (!address || address.length < 10) return false;
        
        // Must contain street indicator
        if (!/(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|P\.ZZA|STRADA|LOC\.|LOCALITA)/i.test(address)) {
            return false;
        }
        
        // Should not be Alfieri's address
        const alfieriKeywords = ['MARCONI', 'MAGLIANO', 'ALFIERI', '12050'];
        const upperAddress = address.toUpperCase();
        
        for (const keyword of alfieriKeywords) {
            if (upperAddress.includes(keyword)) {
                this.log(`Rejected Alfieri address: "${address}"`, 'warning');
                return false;
            }
        }
        
        return true;
    }

    /**
     * WRAPPER 3: Safe Product Extraction
     * Handles flexible product formats
     */
    safeExtractItems(text, extractor) {
        this.log('Extracting products with safe wrapper');
        
        try {
            // Step 1: Get original results
            const originalItems = extractor.extractItems.call(extractor);
            this.log(`Original extraction found ${originalItems.length} items`);
            
            // Step 2: Try enhanced extraction if we have the utility
            if (window.DDTFTProductUtils) {
                // DDTFTProductUtils is a singleton object, not a constructor
                const productUtils = window.DDTFTProductUtils;
                const enhancedItems = this.extractWithProductUtils(text, productUtils);
                
                // Compare results
                if (enhancedItems.length > originalItems.length) {
                    this.log(`Enhanced extraction found ${enhancedItems.length} items (${enhancedItems.length - originalItems.length} more)`, 'success');
                    this.results.improvements++;
                    return enhancedItems;
                } else if (enhancedItems.length === originalItems.length) {
                    // Check if enhanced has better data
                    const hasMoreComplete = enhancedItems.some((item, idx) => {
                        const orig = originalItems[idx];
                        return (item.description && !orig.description) || 
                               (item.total && !orig.total);
                    });
                    
                    if (hasMoreComplete) {
                        this.log('Enhanced extraction has more complete data', 'success');
                        this.results.improvements++;
                        return enhancedItems;
                    }
                }
            }
            
            // Step 3: Try fallback patterns if original found nothing
            if (originalItems.length === 0) {
                const fallbackItems = this.extractWithFallbackPatterns(text);
                if (fallbackItems.length > 0) {
                    this.log(`Fallback patterns found ${fallbackItems.length} items`, 'success');
                    this.results.improvements++;
                    return fallbackItems;
                }
            }
            
            // Return original if it's the best we have
            return originalItems;
            
        } catch (error) {
            this.log(`Error in safe product extraction: ${error.message}`, 'error');
            this.results.errors++;
            
            // Fallback
            this.log('Falling back to original method', 'fallback');
            this.results.fallbacks++;
            return extractor.extractItems.call(extractor);
        }
    }

    /**
     * Extract products using enhanced utilities
     */
    extractWithProductUtils(text, productUtils) {
        const items = [];
        const lines = text.split('\n');
        
        for (const line of lines) {
            // Use the parseProductLine method from utilities
            const product = productUtils.parseProductLine(line);
            if (product) {
                items.push(product);
            }
        }
        
        return items;
    }

    /**
     * Extract products with fallback patterns
     */
    extractWithFallbackPatterns(text) {
        const items = [];
        const lines = text.split('\n');
        
        // More flexible patterns
        const patterns = [
            // Standard pattern
            /^(\d{6}|[A-Z]{2}\d{6})\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)/,
            // Pattern with less fields
            /^(\d{6}|[A-Z]{2}\d{6})\s+(.+?)\s+(\d+(?:[.,]\d+)?)/,
            // Pattern for multiline descriptions
            /^(\d{6}|[A-Z]{2}\d{6})\s+(.+)$/
        ];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            for (const pattern of patterns) {
                const match = line.match(pattern);
                if (match) {
                    const item = {
                        code: match[1],
                        description: match[2] ? match[2].trim() : '',
                        quantity: match[3] ? match[3].replace(',', '.') : '0',
                        price: match[4] ? match[4].replace(',', '.') : '0',
                        total: match[5] ? match[5].replace(',', '.') : '0'
                    };
                    
                    // Check if description continues on next line
                    if (i + 1 < lines.length && !lines[i + 1].match(/^\d{6}/)) {
                        const nextLine = lines[i + 1].trim();
                        if (nextLine && !nextLine.match(/^(TOTALE|IVA|SUBTOTAL)/i)) {
                            item.description += ' ' + nextLine;
                            i++; // Skip next line
                        }
                    }
                    
                    items.push(item);
                    break;
                }
            }
        }
        
        return items;
    }

    /**
     * Get statistics about improvements
     */
    getStatistics() {
        return {
            ...this.results,
            total: this.results.improvements + this.results.fallbacks + this.results.errors,
            improvementRate: this.results.improvements / (this.results.improvements + this.results.fallbacks) * 100
        };
    }

    /**
     * Reset statistics
     */
    resetStatistics() {
        this.results = {
            improvements: 0,
            fallbacks: 0,
            errors: 0
        };
    }
}

// Export for use
window.SafeDDTFTWrapper = SafeDDTFTWrapper;