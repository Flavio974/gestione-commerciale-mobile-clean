#!/usr/bin/env python3
"""
Parser DDT/Fatture Enhanced - Estrazione dati reali, non solo layout
"""

import re
import logging
import json
import traceback
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import pdfplumber
from datetime import datetime
from decimal import Decimal

# Configurazione logging con più dettaglio
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(funcName)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DDTParser:
    """Parser specifico per DDT Alfieri e altri formati"""
    
    def __init__(self, debug=True):
        self.debug = debug
        self.patterns = {
            # Pattern multipli per numero documento
            'numero': [
                r'Numero\s*[:.]?\s*(\d{4,6})',
                r'DDT\s*n[°.]?\s*[:.]?\s*(\d{4,6})',
                r'N[°.]?\s*(\d{4,6})\s+Del',
                # Pattern specifico Alfieri dove tutto è su una riga
                r'^(\d{4})\s+\d{1,2}/\d{2}/\d{2}\s+\d+\s+\d{5}',  # 5023 3/06/25 1 20322
            ],
            'data': [
                r'Del\s*[:.]?\s*(\d{1,2}/\d{2}/\d{2,4})',
                r'Data\s*[:.]?\s*(\d{1,2}/\d{2}/\d{2,4})',
                r'\d{4}\s+(\d{1,2}/\d{2}/\d{2})\s+\d+\s+\d{5}',  # Pattern Alfieri
            ],
            'cliente': [
                r'Cliente\s*[:.]?\s*([^\n]+?)(?:\s+Luogo|$)',
                r'Destinatario\s*[:.]?\s*([^\n]+)',
                r'\d{4}\s+\d{1,2}/\d{2}/\d{2}\s+\d+\s+\d{5}\s+(.+)$',  # Pattern Alfieri
            ],
            'codice_cliente': [
                r'Cod\.\s*Cliente\s*[:.]?\s*(\d{4,6})',
                r'Codice\s+Cliente\s*[:.]?\s*(\d{4,6})',
                r'\d{4}\s+\d{1,2}/\d{2}/\d{2}\s+\d+\s+(\d{5})',  # Pattern Alfieri
            ],
            'piva': [
                r'P\.?\s*IVA\s*[:.]?\s*(\d{11})',
                r'Partita\s+IVA\s*[:.]?\s*(\d{11})',
            ],
            'totale': [
                r'Totale\s+documento\s*€?\s*[:.]?\s*([\d.,]+)',
                r'Totale\s+fattura\s*€?\s*[:.]?\s*([\d.,]+)',
                r'TOTALE\s+GENERALE\s*€?\s*[:.]?\s*([\d.,]+)',
            ]
        }
    
    def debug_print(self, msg: str, level="INFO"):
        """Stampa debug se abilitato"""
        if self.debug:
            print(f"[{level}] {msg}")
            
    def parse_pdf(self, pdf_path: str) -> Dict[str, Any]:
        """
        Estrae dati reali dal PDF, non solo il layout
        """
        self.debug_print(f"=== INIZIO PARSING: {pdf_path} ===")
        
        result = {
            'success': False,
            'filename': Path(pdf_path).name,
            'data': {},
            'errors': [],
            'debug_info': {}
        }
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                # Analizza prima pagina
                page = pdf.pages[0]
                
                # IMPORTANTE: Estrai il TESTO COMPLETO, non solo il layout
                full_text = page.extract_text()
                if not full_text:
                    raise ValueError("Nessun testo estratto dal PDF")
                
                self.debug_print(f"Testo estratto: {len(full_text)} caratteri")
                
                # Debug: mostra prime righe del testo reale
                lines = full_text.split('\n')
                self.debug_print("=== PRIME 20 RIGHE DEL TESTO REALE ===")
                for i, line in enumerate(lines[:20]):
                    self.debug_print(f"Riga {i+1}: {line}")
                
                # Identifica tipo documento
                doc_type = self._identify_document_type(full_text)
                result['data']['tipo'] = doc_type
                
                # STRATEGIA 1: Cerca pattern DDT Alfieri (tutto su una riga)
                alfieri_data = self._extract_alfieri_format(lines)
                if alfieri_data:
                    result['data'].update(alfieri_data)
                    self.debug_print("✅ Formato Alfieri riconosciuto e parsato")
                else:
                    # STRATEGIA 2: Estrazione standard campo per campo
                    result['data'].update(self._extract_standard_format(full_text, lines))
                
                # Estrai articoli dalle tabelle
                tables = page.extract_tables()
                if tables:
                    self.debug_print(f"Trovate {len(tables)} tabelle")
                    articoli = self._extract_articles_from_tables(tables)
                    if articoli:
                        result['data']['articoli'] = articoli
                        result['data']['totale_calcolato'] = sum(a.get('importo', 0) for a in articoli)
                
                # Estrai totale documento
                totale = self._extract_amount(full_text, self.patterns['totale'])
                if totale:
                    result['data']['totale'] = totale
                
                result['success'] = True
                self.debug_print("✅ Parsing completato con successo")
                
        except Exception as e:
            error_msg = f"Errore parsing PDF: {str(e)}"
            result['errors'].append(error_msg)
            result['debug_info']['traceback'] = traceback.format_exc()
            self.debug_print(error_msg, "ERROR")
            logger.error(error_msg)
            
        return result
    
    def _identify_document_type(self, text: str) -> str:
        """Identifica se è DDT o Fattura"""
        text_lower = text.lower()
        if any(marker in text_lower for marker in ['d.d.t.', 'documento di trasporto', 'ddt n']):
            return 'DDT'
        elif any(marker in text_lower for marker in ['fattura', 'invoice', 'ft n']):
            return 'FATTURA'
        return 'SCONOSCIUTO'
    
    def _extract_alfieri_format(self, lines: List[str]) -> Optional[Dict[str, Any]]:
        """
        Estrae dati dal formato Alfieri dove tutto è su una riga
        Es: "5023 3/06/25 1 20322 DONAC S.R.L."
        """
        # Pattern: numero(4) data(gg/mm/aa) pag(1-2) codcliente(5) nome cliente
        pattern = re.compile(r'^(\d{4})\s+(\d{1,2}/\d{2}/\d{2})\s+(\d+)\s+(\d{5})\s+(.+?)$')
        
        for i, line in enumerate(lines):
            match = pattern.match(line.strip())
            if match:
                self.debug_print(f"🎯 PATTERN ALFIERI TROVATO alla riga {i+1}: {line}")
                
                data = {
                    'numero': match.group(1),
                    'data': self._normalize_date(match.group(2)),
                    'pagina': match.group(3),
                    'codice_cliente': match.group(4),
                    'cliente': match.group(5).strip()
                }
                
                # Cerca indirizzo nelle righe successive
                if i + 1 < len(lines):
                    for j in range(i + 1, min(i + 10, len(lines))):
                        next_line = lines[j].strip()
                        # Cerca pattern indirizzo
                        if re.match(r'^(VIA|V\.LE|VIALE|CORSO|P\.ZA|PIAZZA)', next_line, re.IGNORECASE):
                            data['indirizzo_cliente'] = next_line
                            # Cerca CAP e città
                            if j + 1 < len(lines):
                                cap_line = lines[j + 1].strip()
                                if re.match(r'^\d{5}', cap_line):
                                    data['indirizzo_cliente'] += ' ' + cap_line
                            break
                
                # Cerca P.IVA cliente
                for j in range(i, min(i + 15, len(lines))):
                    piva_match = re.search(r'P\.?\s*IVA\s*[:.]?\s*(\d{11})', lines[j])
                    if piva_match and piva_match.group(1) != '03247720042':  # Escludi P.IVA Alfieri
                        data['piva_cliente'] = piva_match.group(1)
                        break
                
                return data
        
        return None
    
    def _extract_standard_format(self, full_text: str, lines: List[str]) -> Dict[str, Any]:
        """Estrazione standard campo per campo"""
        data = {}
        
        # Estrai numero
        for pattern in self.patterns['numero']:
            match = re.search(pattern, full_text, re.MULTILINE | re.IGNORECASE)
            if match:
                data['numero'] = match.group(1)
                self.debug_print(f"Numero trovato: {data['numero']}")
                break
        
        # Estrai data
        for pattern in self.patterns['data']:
            match = re.search(pattern, full_text, re.MULTILINE | re.IGNORECASE)
            if match:
                data['data'] = self._normalize_date(match.group(1))
                self.debug_print(f"Data trovata: {data['data']}")
                break
        
        # Estrai cliente
        for pattern in self.patterns['cliente']:
            match = re.search(pattern, full_text, re.MULTILINE | re.IGNORECASE)
            if match:
                data['cliente'] = match.group(1).strip()
                self.debug_print(f"Cliente trovato: {data['cliente']}")
                break
        
        # Estrai codice cliente
        for pattern in self.patterns['codice_cliente']:
            match = re.search(pattern, full_text, re.MULTILINE | re.IGNORECASE)
            if match:
                data['codice_cliente'] = match.group(1)
                self.debug_print(f"Codice cliente trovato: {data['codice_cliente']}")
                break
        
        # Estrai P.IVA (escludendo quella di Alfieri)
        for pattern in self.patterns['piva']:
            matches = re.finditer(pattern, full_text, re.MULTILINE | re.IGNORECASE)
            for match in matches:
                piva = match.group(1)
                if piva != '03247720042':  # Escludi P.IVA Alfieri
                    data['piva_cliente'] = piva
                    self.debug_print(f"P.IVA cliente trovata: {piva}")
                    break
            if 'piva_cliente' in data:
                break
        
        # Cerca indirizzo cliente
        cliente_idx = full_text.lower().find('cliente')
        if cliente_idx >= 0:
            # Estrai le prossime righe dopo "Cliente"
            text_after = full_text[cliente_idx:cliente_idx + 500]
            lines_after = text_after.split('\n')
            
            for i, line in enumerate(lines_after[1:6]):  # Analizza righe 2-6
                line = line.strip()
                if re.match(r'^(VIA|V\.LE|VIALE|CORSO|P\.ZA|PIAZZA)', line, re.IGNORECASE):
                    data['indirizzo_cliente'] = line
                    # Aggiungi CAP se nella riga successiva
                    if i + 2 < len(lines_after):
                        next_line = lines_after[i + 2].strip()
                        if re.match(r'^\d{5}', next_line):
                            data['indirizzo_cliente'] += ' ' + next_line
                    break
        
        return data
    
    def _extract_articles_from_tables(self, tables: List[List[List[Any]]]) -> List[Dict[str, Any]]:
        """Estrae articoli dalle tabelle"""
        articoli = []
        
        for table in tables:
            if not table or len(table) < 2:
                continue
                
            # Identifica intestazioni
            header = [str(cell).lower() if cell else '' for cell in table[0]]
            
            # Cerca colonne chiave
            col_indices = {}
            for i, h in enumerate(header):
                if 'cod' in h:
                    col_indices['codice'] = i
                elif 'descr' in h:
                    col_indices['descrizione'] = i
                elif 'q.t' in h or 'qta' in h or 'quant' in h:
                    col_indices['quantita'] = i
                elif 'prezzo' in h:
                    col_indices['prezzo'] = i
                elif 'importo' in h:
                    col_indices['importo'] = i
                elif 'iva' in h:
                    col_indices['iva'] = i
            
            # Se troviamo almeno codice e descrizione, processa la tabella
            if 'descrizione' in col_indices:
                self.debug_print(f"Tabella articoli trovata con {len(table)-1} righe")
                
                for row in table[1:]:
                    if not row or not any(row):
                        continue
                        
                    articolo = {}
                    
                    # Estrai dati dalle colonne identificate
                    for field, idx in col_indices.items():
                        if idx < len(row) and row[idx]:
                            value = str(row[idx]).strip()
                            if field in ['quantita', 'prezzo', 'importo', 'iva']:
                                articolo[field] = self._parse_number(value)
                            else:
                                articolo[field] = value
                    
                    # Aggiungi solo se ha almeno descrizione
                    if articolo.get('descrizione'):
                        articoli.append(articolo)
                        self.debug_print(f"Articolo: {articolo.get('codice', 'N/A')} - {articolo['descrizione']}")
        
        return articoli
    
    def _normalize_date(self, date_str: str) -> str:
        """Normalizza data in formato gg/mm/aaaa"""
        date_str = date_str.strip()
        
        # Gestisci anno a 2 cifre
        parts = date_str.split('/')
        if len(parts) == 3:
            day = parts[0].zfill(2)
            month = parts[1].zfill(2)
            year = parts[2]
            
            if len(year) == 2:
                # Assumi 20xx per anni < 50, 19xx altrimenti
                year_int = int(year)
                if year_int < 50:
                    year = '20' + year
                else:
                    year = '19' + year
            
            return f"{day}/{month}/{year}"
        
        return date_str
    
    def _parse_number(self, value: str) -> float:
        """Converte stringa in numero gestendo formati italiani"""
        if not value:
            return 0.0
            
        try:
            # Rimuovi spazi e simboli valuta
            value = value.strip().replace('€', '').replace('$', '')
            
            # Gestisci separatori italiani (. per migliaia, , per decimali)
            if ',' in value and '.' in value:
                # Se virgola dopo punto: formato italiano
                if value.rindex(',') > value.rindex('.'):
                    value = value.replace('.', '').replace(',', '.')
                else:
                    # Altrimenti formato americano
                    value = value.replace(',', '')
            elif ',' in value:
                # Solo virgola: assumiamo decimale italiano
                value = value.replace(',', '.')
            
            return float(value)
        except:
            return 0.0
    
    def _extract_amount(self, text: str, patterns: List[str]) -> Optional[float]:
        """Estrae un importo usando lista di pattern"""
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                return self._parse_number(match.group(1))
        return None


def process_batch(pdf_files: List[str], output_dir: str = "output") -> Dict[str, Any]:
    """
    Processa multipli file PDF
    """
    Path(output_dir).mkdir(exist_ok=True)
    
    parser = DDTParser(debug=True)
    results = []
    summary = {
        'totale_file': len(pdf_files),
        'successi': 0,
        'errori': 0,
        'dettagli_errori': []
    }
    
    print(f"\n{'='*60}")
    print(f"ELABORAZIONE BATCH: {len(pdf_files)} file")
    print(f"{'='*60}\n")
    
    for i, pdf_file in enumerate(pdf_files, 1):
        print(f"\n[{i}/{len(pdf_files)}] Elaborazione: {pdf_file}")
        print("-" * 40)
        
        try:
            result = parser.parse_pdf(pdf_file)
            results.append(result)
            
            if result['success']:
                summary['successi'] += 1
                
                # Salva risultato singolo
                output_file = Path(output_dir) / f"{Path(pdf_file).stem}_parsed.json"
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(result, f, ensure_ascii=False, indent=2)
                
                # Stampa riepilogo
                data = result['data']
                print(f"✅ SUCCESSO:")
                print(f"   Tipo: {data.get('tipo', 'N/A')}")
                print(f"   Numero: {data.get('numero', 'N/A')}")
                print(f"   Data: {data.get('data', 'N/A')}")
                print(f"   Cliente: {data.get('cliente', 'N/A')}")
                print(f"   Totale: €{data.get('totale', 0):.2f}")
                
            else:
                summary['errori'] += 1
                summary['dettagli_errori'].append({
                    'file': pdf_file,
                    'errori': result['errors']
                })
                print(f"❌ ERRORE: {result['errors']}")
                
        except Exception as e:
            summary['errori'] += 1
            summary['dettagli_errori'].append({
                'file': pdf_file,
                'errori': [str(e)]
            })
            print(f"❌ ERRORE CRITICO: {e}")
    
    # Salva riepilogo
    summary_file = Path(output_dir) / "summary.json"
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'='*60}")
    print(f"RIEPILOGO FINALE:")
    print(f"{'='*60}")
    print(f"Totale file: {summary['totale_file']}")
    print(f"Successi: {summary['successi']} ({summary['successi']/summary['totale_file']*100:.1f}%)")
    print(f"Errori: {summary['errori']} ({summary['errori']/summary['totale_file']*100:.1f}%)")
    print(f"\nRisultati salvati in: {output_dir}/")
    
    return summary


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Uso: python ddt_parser_enhanced.py <file.pdf> [file2.pdf ...]")
        print("\nEsempio:")
        print("  python ddt_parser_enhanced.py DDV_703723_2025_1_5023_3062025.PDF")
        print("  python ddt_parser_enhanced.py *.pdf")
        sys.exit(1)
    
    # Processa file
    pdf_files = sys.argv[1:]
    
    if len(pdf_files) == 1:
        # Singolo file - mostra output dettagliato
        parser = DDTParser(debug=True)
        result = parser.parse_pdf(pdf_files[0])
        
        print("\n" + "="*60)
        print("RISULTATO FINALE:")
        print("="*60)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        # Multi file - usa batch processor
        process_batch(pdf_files)