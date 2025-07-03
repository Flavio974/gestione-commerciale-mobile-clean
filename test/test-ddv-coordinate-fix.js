/**
 * Test per verificare che l'estrazione DDV funzioni correttamente con le coordinate X
 * Verifica che estragga VIA SALUZZO, 65 e non VIA MARGARITA, 8
 */

console.log('===============================================');
console.log('TEST DDV COORDINATE FIX');
console.log('===============================================\n');

// Simula il testo estratto dal PDF con coordinate X
const testText = `C.so G. Marconi 10/E - Tel. 0173 66457 - Fax 0173 266898
12050 MAGLIANO ALFIERI (CN)
Web: www.alfierialimentari.com E-mail: info@alfierialimentari.com alfierispecspa@pro-pec.it
R.E.A. Cn 275071 - P.IVA E C.F. 03247720042
Cap. Soc. € 100.000,00 I.V.
Documento di trasporto
(D.P.R. 472 del 14 agosto 1996)
Numero Del Pag. Cod. Cliente
D.D.T.
Cliente Luogo di consegna
Partita IVA Codice Fiscale
RIFERIMENTO VOSTRO ORDINE N°
TERMINI DI CONSEGNA
Trasporto a mezzo Causale del trasporto Inizio del trasporto (data e ora) Firma del conducente
Vettore 1 Data e ora del ritiro Firma del vettore 1
Vettore 2 Data e ora del ritiro Firma del vettore 2
Codice Art. 
Codice art.
c/o cliente Descrizione U.M. Q.tà Sc.Merc. Prezzo Sconto% Importo IVA
Aspetto esteriore dei beni Numero colli Peso Lordo Porto Spese Traporto Totale documento €
Annotazioni Timbro e firma destinatario
Il numero di lotto dei prodotti elencati nel presente documento equivale al numero del documento stesso.
Attenzione!! Controllare la merce allo scarico e, se non conforme o danneggiata, fare riserva in bolla. In caso contrario non risarciremo la merce
danneggiata o mancante.
"Assolve gli obblighi di cui all'art.62, comma 1, del decreto legge 24 Gennaio 2012, n.1, convertito, con modificazioni, dalla legge 24 Marzo 2012, n.27."
ALFIERI SPECIALITA' ALIMENTARI S.P.A.
4521 19/05/25 1 20322
[X:39, "DONAC S.R.L."] [X:309, "DONAC S.R.L."]
[X:39, "VIA MARGARITA, 8 LOC. TETTO GARETTO"] [X:309, "VIA SALUZZO, 65"]
[X:39, "12100 - CUNEO CN"] [X:309, "12038 SAVIGLIANO CN"]
Pagamento: BB 30 GG D.F.F.M.
04064060041 04064060041
7959 del 19/05/25 Operatore: VALENTINA
507 SAFFIRIO FLAVIO
VETTORE VENDITA 19/05/25 14:22
S.A.F.I.M. S.P.A 09843020018
VIA SUPEJA GALLINO 20/28
10060 NONE TO TO 74321
Rif. Ns. Ordine N. 6475 del 19/05/2025
060039 GNOCCHETTI PATATE FRESCHE COTTE A PZ 12 1,7300 20,76 04 00`;

console.log('📋 Test con testo contenente coordinate X\n');

// Test 1: Verifica estrazione coordinate
console.log('Test 1: Estrazione elementi con coordinate X');
console.log('—'.repeat(50));

const coordPattern = /\[X:(\d+),\s*"([^"]+)"\]/g;
const lines = testText.split('\n');

lines.forEach((line, index) => {
    const coords = [];
    let match;
    coordPattern.lastIndex = 0;
    
    while ((match = coordPattern.exec(line)) !== null) {
        coords.push({ 
            x: parseInt(match[1]), 
            text: match[2] 
        });
    }
    
    if (coords.length > 0) {
        console.log(`\nRiga ${index + 1}: ${line}`);
        console.log('Coordinate trovate:');
        coords.forEach(coord => {
            const colonna = coord.x < 300 ? 'SINISTRA' : 'DESTRA';
            console.log(`  [X:${coord.x}] "${coord.text}" → Colonna ${colonna}`);
        });
    }
});

// Test 2: Verifica estrazione indirizzo consegna
console.log('\n\nTest 2: Estrazione indirizzo di consegna');
console.log('—'.repeat(50));

// Trova la riga DDV
const ddvPattern = /(\d{4})\s+(\d{1,2}\/\d{2}\/\d{2})\s+(\d+)\s+(2\d{4})/;
let ddvLineIndex = -1;

for (let i = 0; i < lines.length; i++) {
    if (ddvPattern.test(lines[i])) {
        ddvLineIndex = i;
        console.log(`DDV trovato alla riga ${i + 1}: "${lines[i]}"`);
        break;
    }
}

if (ddvLineIndex >= 0) {
    // Estrai indirizzo dalla riga +2
    if (ddvLineIndex + 2 < lines.length) {
        const addressLine = lines[ddvLineIndex + 2];
        console.log(`\nRiga indirizzo: "${addressLine}"`);
        
        // Estrai coordinate X
        const coords = [];
        let match;
        coordPattern.lastIndex = 0;
        
        while ((match = coordPattern.exec(addressLine)) !== null) {
            coords.push({ 
                x: parseInt(match[1]), 
                text: match[2] 
            });
        }
        
        // Filtra solo colonna destra (X >= 300)
        const rightColumnAddress = coords
            .filter(c => c.x >= 300)
            .map(c => c.text)
            .join(' ')
            .trim();
        
        console.log(`\nIndirizzo colonna sinistra (X<300): "${coords.filter(c => c.x < 300).map(c => c.text).join(' ')}"`);
        console.log(`Indirizzo colonna destra (X>=300): "${rightColumnAddress}"`);
        console.log(`\n✅ Indirizzo di consegna estratto: "${rightColumnAddress}"`);
        
        const isCorrect = rightColumnAddress === 'VIA SALUZZO, 65';
        console.log(`${isCorrect ? '✅ CORRETTO!' : '❌ ERRATO!'} L'indirizzo deve essere "VIA SALUZZO, 65"`);
    }
    
    // Estrai CAP e città dalla riga +3
    if (ddvLineIndex + 3 < lines.length) {
        const cityLine = lines[ddvLineIndex + 3];
        console.log(`\nRiga città: "${cityLine}"`);
        
        // Estrai coordinate X
        const coords = [];
        let match;
        coordPattern.lastIndex = 0;
        
        while ((match = coordPattern.exec(cityLine)) !== null) {
            coords.push({ 
                x: parseInt(match[1]), 
                text: match[2] 
            });
        }
        
        // Filtra solo colonna destra (X >= 300)
        const rightColumnCity = coords
            .filter(c => c.x >= 300)
            .map(c => c.text)
            .join(' ')
            .trim();
        
        console.log(`\nCittà colonna sinistra (X<300): "${coords.filter(c => c.x < 300).map(c => c.text).join(' ')}"`);
        console.log(`Città colonna destra (X>=300): "${rightColumnCity}"`);
        console.log(`\n✅ Città di consegna estratta: "${rightColumnCity}"`);
        
        const isCorrect = rightColumnCity === '12038 SAVIGLIANO CN';
        console.log(`${isCorrect ? '✅ CORRETTO!' : '❌ ERRATO!'} La città deve essere "12038 SAVIGLIANO CN"`);
    }
}

// Test 3: Verifica parsing completo del documento
console.log('\n\nTest 3: Parsing completo del documento');
console.log('—'.repeat(50));

if (window.DDTFTDocumentParser) {
    const result = window.DDTFTDocumentParser.parseDocumentFromText(testText, 'DDV_TEST.pdf');
    
    if (result) {
        console.log('\nRisultati parsing:');
        console.log(`Numero documento: ${result.documentNumber || 'N/A'}`);
        console.log(`Cliente: ${result.clientName || result.cliente || 'N/A'}`);
        console.log(`Codice cliente: ${result.clientCode || result.codiceCliente || 'N/A'}`);
        console.log(`Indirizzo consegna: ${result.deliveryAddress || result.indirizzoConsegna || 'N/A'}`);
        
        const deliveryAddress = result.deliveryAddress || result.indirizzoConsegna || '';
        const hasMargarita = deliveryAddress.includes('MARGARITA');
        const hasSaluzzo = deliveryAddress.includes('SALUZZO');
        const hasLoc = deliveryAddress.includes('LOC') || deliveryAddress.includes('TETTO GARETTO');
        
        console.log('\n📊 Analisi risultato:');
        console.log(`${hasMargarita ? '❌' : '✅'} Non contiene VIA MARGARITA`);
        console.log(`${hasSaluzzo ? '✅' : '❌'} Contiene VIA SALUZZO`);
        console.log(`${hasLoc ? '❌' : '✅'} Non contiene LOC/TETTO GARETTO`);
        
        const isFullyCorrect = !hasMargarita && hasSaluzzo && !hasLoc && 
                              deliveryAddress === 'VIA SALUZZO, 65 12038 SAVIGLIANO CN';
        
        console.log(`\n${isFullyCorrect ? '✅ INDIRIZZO COMPLETAMENTE CORRETTO!' : '❌ INDIRIZZO NON CORRETTO'}`);
        console.log(`Atteso: "VIA SALUZZO, 65 12038 SAVIGLIANO CN"`);
        console.log(`Ricevuto: "${deliveryAddress}"`);
    } else {
        console.log('❌ Parsing fallito');
    }
} else {
    console.log('❌ DDTFTDocumentParser non disponibile');
}

console.log('\n\n===============================================');
console.log('✨ TEST COMPLETATI');
console.log('===============================================\n');