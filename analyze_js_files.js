#!/usr/bin/env node
/**
 * Script di analisi file JavaScript del progetto
 * Genera report dettagliato con conteggio righe e categorizzazione
 */

const fs = require('fs');
const path = require('path');

// Configurazione analisi
const CONFIG = {
    projectPath: __dirname,
    excludePaths: ['node_modules', 'backups', '.git'],
    fileExtension: '.js',
    outputFile: 'js_analysis_report.json'
};

// Categorie dei file per importanza
const FILE_CATEGORIES = {
    core: {
        patterns: ['app.js', 'server.js', 'index.js', 'main.js'],
        priority: 1,
        description: 'File core dell\'applicazione'
    },
    modules: {
        patterns: ['ddtft', 'smart-assistant', 'ai/', 'modules/', 'core/'],
        priority: 2,
        description: 'Moduli principali'
    },
    ui: {
        patterns: ['ui.js', 'view.js', 'table.js', 'form.js', 'navigation.js'],
        priority: 3,
        description: 'Interfaccia utente'
    },
    utils: {
        patterns: ['utils', 'helper', 'formatter', 'validator'],
        priority: 4,
        description: 'Utility e helper'
    },
    config: {
        patterns: ['config/', 'settings', 'patterns'],
        priority: 5,
        description: 'File di configurazione'
    },
    test: {
        patterns: ['test/', 'spec', 'debug'],
        priority: 6,
        description: 'Test e debug'
    }
};

class JSAnalyzer {
    constructor() {
        this.files = [];
        this.stats = {
            totalFiles: 0,
            totalLines: 0,
            avgLinesPerFile: 0,
            categories: {}
        };
    }

    /**
     * Scansiona ricorsivamente i file JS
     */
    scanDirectory(dirPath, relativePath = '') {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const relativeItemPath = path.join(relativePath, item);
            
            // Salta cartelle escluse
            if (CONFIG.excludePaths.some(excluded => relativeItemPath.includes(excluded))) {
                continue;
            }
            
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                this.scanDirectory(fullPath, relativeItemPath);
            } else if (item.endsWith(CONFIG.fileExtension)) {
                this.analyzeFile(fullPath, relativeItemPath);
            }
        }
    }

    /**
     * Analizza singolo file JS
     */
    analyzeFile(filePath, relativePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\\n');
            const lineCount = lines.length;
            
            // Conta righe di codice effettive (escluse vuote e commenti)
            const codeLines = lines.filter(line => {
                const trimmed = line.trim();
                return trimmed.length > 0 && 
                       !trimmed.startsWith('//') && 
                       !trimmed.startsWith('*') &&
                       !trimmed.startsWith('/*');
            }).length;

            // Determina categoria
            const category = this.categorizeFile(relativePath);
            
            // Analizza complessità (numero di funzioni)
            const functionCount = (content.match(/function\\s+\\w+|\\w+\\s*[:=]\\s*function|=>|class\\s+\\w+/g) || []).length;
            
            const fileInfo = {
                path: relativePath,
                fullPath: filePath,
                lines: lineCount,
                codeLines: codeLines,
                functions: functionCount,
                category: category.name,
                priority: category.priority,
                size: fs.statSync(filePath).size,
                complexity: this.calculateComplexity(lineCount, functionCount),
                needsOptimization: lineCount > 1000 || functionCount > 50
            };
            
            this.files.push(fileInfo);
            
        } catch (error) {
            console.error(`Errore analizzando ${relativePath}:`, error.message);
        }
    }

    /**
     * Categorizza file in base al path e nome
     */
    categorizeFile(filePath) {
        for (const [categoryName, category] of Object.entries(FILE_CATEGORIES)) {
            if (category.patterns.some(pattern => 
                filePath.toLowerCase().includes(pattern.toLowerCase())
            )) {
                return { name: categoryName, priority: category.priority };
            }
        }
        return { name: 'other', priority: 7 };
    }

    /**
     * Calcola complessità del file
     */
    calculateComplexity(lines, functions) {
        if (lines < 100) return 'low';
        if (lines < 500) return 'medium';
        if (lines < 1000) return 'high';
        return 'very_high';
    }

    /**
     * Genera statistiche
     */
    generateStats() {
        this.stats.totalFiles = this.files.length;
        this.stats.totalLines = this.files.reduce((sum, file) => sum + file.lines, 0);
        this.stats.totalCodeLines = this.files.reduce((sum, file) => sum + file.codeLines, 0);
        this.stats.avgLinesPerFile = Math.round(this.stats.totalLines / this.stats.totalFiles);
        
        // Statistiche per categoria
        this.stats.categories = {};
        for (const [categoryName, category] of Object.entries(FILE_CATEGORIES)) {
            const categoryFiles = this.files.filter(f => f.category === categoryName);
            this.stats.categories[categoryName] = {
                description: category.description,
                fileCount: categoryFiles.length,
                totalLines: categoryFiles.reduce((sum, f) => sum + f.lines, 0),
                avgLines: categoryFiles.length > 0 ? 
                    Math.round(categoryFiles.reduce((sum, f) => sum + f.lines, 0) / categoryFiles.length) : 0
            };
        }
        
        // File più grandi
        this.stats.largestFiles = this.files
            .sort((a, b) => b.lines - a.lines)
            .slice(0, 10);
            
        // File che necessitano ottimizzazione
        this.stats.optimizationNeeded = this.files.filter(f => f.needsOptimization);
        
        // Possibili duplicazioni (file con nomi simili)
        this.stats.possibleDuplicates = this.findPossibleDuplicates();
    }

    /**
     * Trova possibili duplicazioni
     */
    findPossibleDuplicates() {
        const duplicates = [];
        const fileNames = {};
        
        for (const file of this.files) {
            const baseName = path.basename(file.path, '.js').toLowerCase();
            if (!fileNames[baseName]) {
                fileNames[baseName] = [];
            }
            fileNames[baseName].push(file);
        }
        
        for (const [name, files] of Object.entries(fileNames)) {
            if (files.length > 1) {
                duplicates.push({
                    baseName: name,
                    files: files.map(f => ({ path: f.path, lines: f.lines }))
                });
            }
        }
        
        return duplicates;
    }

    /**
     * Genera report formattato
     */
    generateReport() {
        const report = {
            metadata: {
                generatedAt: new Date().toISOString(),
                projectPath: CONFIG.projectPath,
                analyzer: 'JSAnalyzer v1.0'
            },
            summary: {
                totalFiles: this.stats.totalFiles,
                totalLines: this.stats.totalLines,
                totalCodeLines: this.stats.totalCodeLines,
                avgLinesPerFile: this.stats.avgLinesPerFile
            },
            categories: this.stats.categories,
            largestFiles: this.stats.largestFiles,
            optimizationNeeded: this.stats.optimizationNeeded,
            possibleDuplicates: this.stats.possibleDuplicates,
            allFiles: this.files.sort((a, b) => {
                if (a.priority !== b.priority) return a.priority - b.priority;
                return b.lines - a.lines;
            })
        };
        
        return report;
    }

    /**
     * Esegue analisi completa
     */
    analyze() {
        console.log('🔍 Avvio analisi file JavaScript...');
        console.log('📁 Path progetto:', CONFIG.projectPath);
        
        this.scanDirectory(CONFIG.projectPath);
        this.generateStats();
        
        const report = this.generateReport();
        
        // Salva report
        fs.writeFileSync(
            path.join(CONFIG.projectPath, CONFIG.outputFile),
            JSON.stringify(report, null, 2)
        );
        
        console.log('✅ Analisi completata!');
        console.log(`📊 File analizzati: ${report.summary.totalFiles}`);
        console.log(`📈 Righe totali: ${report.summary.totalLines.toLocaleString()}`);
        console.log(`💾 Report salvato in: ${CONFIG.outputFile}`);
        
        return report;
    }
}

// Esegui analisi se script chiamato direttamente
if (require.main === module) {
    const analyzer = new JSAnalyzer();
    const report = analyzer.analyze();
    
    // Stampa riassunto
    console.log('\\n=== RIASSUNTO ANALISI ===');
    console.log(`Totale file JS: ${report.summary.totalFiles}`);
    console.log(`Totale righe: ${report.summary.totalLines.toLocaleString()}`);
    console.log(`Media righe per file: ${report.summary.avgLinesPerFile}`);
    
    console.log('\\n=== TOP 10 FILE PIÙ GRANDI ===');
    report.largestFiles.forEach((file, i) => {
        console.log(`${i+1}. ${file.path} → ${file.lines} righe`);
    });
    
    if (report.optimizationNeeded.length > 0) {
        console.log(`\\n⚠️  ${report.optimizationNeeded.length} file necessitano ottimizzazione`);
    }
    
    if (report.possibleDuplicates.length > 0) {
        console.log(`\\n🔍 ${report.possibleDuplicates.length} possibili gruppi di file duplicati`);
    }
}

module.exports = JSAnalyzer;