/**
 * Script per catturare l'output corrente del sistema DDT/FT
 * Questo servirà come "golden standard" per verificare che il refactoring
 * non rompa nulla
 */

// Funzione per simulare l'estrazione di un documento
async function captureDocumentExtraction(documentText, fileName, type) {
    // Simula il contesto del browser
    const mockDebugElement = {
        textContent: '',
        logs: []
    };
    
    // Override del metodo per catturare i log
    const originalLog = mockDebugElement.textContent;
    Object.defineProperty(mockDebugElement, 'textContent', {
        get() { return this.logs.join('\n'); },
        set(value) { 
            this.logs.push(value);
            return value;
        }
    });
    
    let result = null;
    
    try {
        if (type === 'DDT') {
            const extractor = new DDTExtractor(documentText, mockDebugElement, fileName);
            result = extractor.extract();
        } else if (type === 'FATTURA') {
            const extractor = new FatturaExtractor(documentText, mockDebugElement, fileName);
            result = extractor.extract();
        }
    } catch (error) {
        console.error('Errore durante estrazione:', error);
        result = { error: error.message };
    }
    
    return {
        fileName: fileName,
        type: type,
        input: documentText.substring(0, 200) + '...', // Prima parte del testo
        output: result,
        logs: mockDebugElement.logs
    };
}

// Test cases con esempi reali
const testCases = [
    {
        name: 'DDT_Standard',
        type: 'DDT',
        fileName: 'DDT_12345_2024.pdf',
        text: `DDT 12345 15/01/2024
CLIENTE: PIEMONTE CARNI
P.IVA: 01522630056
INDIRIZZO: VIA CAVOUR, 61 14100 ASTI AT

ARTICOLI:
070017 PRODOTTO TEST 10 PZ
200000 ALTRO PRODOTTO 5 KG

TOTALE: 150,00`
    },
    {
        name: 'Fattura_Standard',
        type: 'FATTURA',
        fileName: 'FT_4226_2024.pdf',
        text: `FATTURA N. 4226 del 21/05/2024
IL GUSTO FRUTTA E VERDURA
P.IVA: 01591360059
VIA FONTANA, 4 14100 ASTI AT

PRODOTTI:
070056 MERCE TEST 20 PZ 5,00 100,00
200016 ALTRA MERCE 10 KG 8,50 85,00

IMPONIBILE: 185,00
IVA 10%: 18,50
TOTALE: 203,50`
    },
    {
        name: 'DDV_Vuoto',
        type: 'DDT',
        fileName: 'DDV_701029_PIEMONTE.pdf',
        text: `DDV (Vuoto)
Codice interno: 701029
PIEMONTE CARNI
VIA CAVOUR, 61
14100 ASTI AT`
    },
    {
        name: 'FTV_Vuoto',
        type: 'FATTURA',
        fileName: 'FTV_701134_ILGUSTO.pdf',
        text: `FTV (Vuoto)
Codice interno: 701134
ODV Nr. 507A865AS02780
IL GUSTO
VIA FONTANA, 4
14100 ASTI AT`
    }
];

// Funzione principale per catturare tutti gli output
async function captureAllOutputs() {
    console.log('🔄 Inizio cattura output di riferimento...\n');
    
    const results = [];
    
    for (const testCase of testCases) {
        console.log(`📄 Processando ${testCase.name}...`);
        
        const output = await captureDocumentExtraction(
            testCase.text,
            testCase.fileName,
            testCase.type
        );
        
        results.push({
            testName: testCase.name,
            ...output
        });
        
        console.log(`✅ Completato: ${testCase.name}`);
        console.log(`   - Numero documento: ${output.output?.number || 'N/A'}`);
        console.log(`   - Cliente: ${output.output?.client || 'N/A'}`);
        console.log(`   - Totale: ${output.output?.total || 'N/A'}\n`);
    }
    
    return results;
}

// Salva i risultati
async function saveGoldenOutput() {
    try {
        const results = await captureAllOutputs();
        
        // In un ambiente reale, salveremmo su file
        // Per ora, logghiamo i risultati
        console.log('\n📊 RISULTATI GOLDEN OUTPUT:');
        console.log('========================\n');
        console.log(JSON.stringify(results, null, 2));
        
        // Crea un oggetto globale per i test
        window.GOLDEN_OUTPUT = results;
        
        console.log('\n✅ Output di riferimento salvato in window.GOLDEN_OUTPUT');
        console.log('Usa questa variabile per confrontare con output futuri');
        
    } catch (error) {
        console.error('❌ Errore durante il salvataggio:', error);
    }
}

// Funzione per confrontare output
function compareOutputs(golden, current) {
    const differences = [];
    
    // Confronta ogni campo importante
    const fieldsToCheck = [
        'number', 'date', 'client', 'clientCode', 'vatNumber',
        'deliveryAddress', 'orderReference', 'total', 'items'
    ];
    
    for (const field of fieldsToCheck) {
        const goldenValue = golden.output?.[field];
        const currentValue = current.output?.[field];
        
        if (JSON.stringify(goldenValue) !== JSON.stringify(currentValue)) {
            differences.push({
                field: field,
                golden: goldenValue,
                current: currentValue
            });
        }
    }
    
    return differences;
}

// Esporta le funzioni per uso esterno
window.RegressionTest = {
    captureDocumentExtraction,
    captureAllOutputs,
    saveGoldenOutput,
    compareOutputs,
    testCases
};