#!/usr/bin/env python3
"""
Parser robusto per DDT e Fatture PDF
Supporta formati multipli e gestione errori avanzata
"""

import re
import logging
import json
import traceback
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Union
import pdfplumber
import pandas as pd
from dataclasses import dataclass, asdict
from decimal import Decimal, InvalidOperation

# Configurazione logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class Fornitore:
    nome: str = ""
    piva: str = ""
    indirizzo: str = ""
    cap: str = ""
    citta: str = ""
    provincia: str = ""


@dataclass
class Cliente:
    nome: str = ""
    codice: str = ""
    indirizzo: str = ""
    cap: str = ""
    citta: str = ""
    provincia: str = ""
    piva: str = ""
    codice_fiscale: str = ""


@dataclass
class Agente:
    codice: str = ""
    nome: str = ""


@dataclass
class Articolo:
    codice: str = ""
    descrizione: str = ""
    unita_misura: str = ""
    quantita: float = 0.0
    prezzo_unitario: float = 0.0
    sconto: float = 0.0
    importo: float = 0.0
    iva: float = 0.0


@dataclass
class Documento:
    tipo: str = ""
    numero: str = ""
    data: str = ""
    fornitore: Fornitore = None
    cliente: Cliente = None
    agente: Agente = None
    vettore: str = ""
    articoli: List[Articolo] = None
    totale: float = 0.0
    totale_imponibile: float = 0.0
    totale_iva: float = 0.0
    numero_colli: int = 0
    peso_lordo: float = 0.0
    file_origine: str = ""
    
    def __post_init__(self):
        if self.fornitore is None:
            self.fornitore = Fornitore()
        if self.cliente is None:
            self.cliente = Cliente()
        if self.agente is None:
            self.agente = Agente()
        if self.articoli is None:
            self.articoli = []


class DocumentPatterns:
    """Pattern regex per estrarre dati dai documenti"""
    
    # Pattern per identificare il tipo di documento
    TIPO_DOCUMENTO = {
        'DDT': [
            r'documento\s+di\s+trasporto',
            r'd\.d\.t\.',
            r'ddt\s+n',
            r'bolla\s+di\s+accompagnamento'
        ],
        'FATTURA': [
            r'fattura\s+n',
            r'fattura\s+accompagnatoria',
            r'invoice',
            r'ft\s+n'
        ]
    }
    
    # Pattern per numero documento
    NUMERO_DOCUMENTO = [
        r'numero\s*[:.]?\s*(\d+)',
        r'n[°.]?\s*[:.]?\s*(\d+)',
        r'ddt\s*n[°.]?\s*[:.]?\s*(\d+)',
        r'documento\s*[:.]?\s*(\d+)',
        r'fattura\s*n[°.]?\s*[:.]?\s*(\d+)'
    ]
    
    # Pattern per data
    DATA = [
        r'del\s*[:.]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        r'data\s*[:.]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        r'emessa\s+il\s*[:.]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
    ]
    
    # Pattern per partita IVA
    PARTITA_IVA = [
        r'p\.?\s*iva\s*[:.]?\s*(\d{11})',
        r'partita\s+iva\s*[:.]?\s*(\d{11})',
        r'vat\s*[:.]?\s*(\d{11})',
        r'p\.iva\s+e\s+c\.f\.\s*[:.]?\s*(\d{11})'
    ]
    
    # Pattern per codice fiscale
    CODICE_FISCALE = [
        r'c\.?\s*f\.?\s*[:.]?\s*([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])',
        r'codice\s+fiscale\s*[:.]?\s*([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])'
    ]
    
    # Pattern per totali
    TOTALE = [
        r'totale\s+documento\s*€?\s*[:.]?\s*([\d.,]+)',
        r'totale\s+fattura\s*€?\s*[:.]?\s*([\d.,]+)',
        r'totale\s*€?\s*[:.]?\s*([\d.,]+)',
        r'importo\s+totale\s*€?\s*[:.]?\s*([\d.,]+)'
    ]
    
    # Pattern per agente
    AGENTE = [
        r'agente\s*[:.]?\s*(\d+)\s+(.+?)(?:\n|$)',
        r'rappresentante\s*[:.]?\s*(\d+)\s+(.+?)(?:\n|$)'
    ]
    
    # Pattern per vettore
    VETTORE = [
        r'vettore\s*[:.]?\s*(.+?)(?:\n|$)',
        r'trasportatore\s*[:.]?\s*(.+?)(?:\n|$)',
        r'spedizioniere\s*[:.]?\s*(.+?)(?:\n|$)'
    ]


class DDTFattureParser:
    """Parser principale per DDT e Fatture"""
    
    def __init__(self):
        self.patterns = DocumentPatterns()
        self.current_file = None
        
    def parse_single_file(self, file_path: Union[str, Path]) -> Documento:
        """
        Parsifica un singolo file PDF
        
        Args:
            file_path: Percorso del file PDF
            
        Returns:
            Documento: Oggetto documento con i dati estratti
        """
        file_path = Path(file_path)
        self.current_file = file_path.name
        
        logger.info(f"Inizio parsing file: {file_path}")
        
        documento = Documento(file_origine=str(file_path))
        
        try:
            with pdfplumber.open(file_path) as pdf:
                # Estrai tutto il testo
                full_text = ""
                tables_data = []
                
                for page_num, page in enumerate(pdf.pages):
                    try:
                        # Estrai testo
                        page_text = page.extract_text() or ""
                        full_text += page_text + "\n"
                        
                        # Estrai tabelle
                        tables = page.extract_tables()
                        if tables:
                            tables_data.extend(tables)
                            
                    except Exception as e:
                        logger.error(f"Errore estrazione pagina {page_num + 1}: {e}")
                
                # Normalizza il testo
                full_text = self._normalize_text(full_text)
                
                # Identifica tipo documento
                documento.tipo = self._identify_document_type(full_text)
                logger.info(f"Tipo documento identificato: {documento.tipo}")
                
                # Estrai dati base
                documento.numero = self._extract_field(full_text, self.patterns.NUMERO_DOCUMENTO, "numero")
                documento.data = self._extract_date(full_text)
                
                # Estrai dati fornitore
                documento.fornitore = self._extract_fornitore(full_text)
                
                # Estrai dati cliente
                documento.cliente = self._extract_cliente(full_text)
                
                # Estrai agente e vettore
                documento.agente = self._extract_agente(full_text)
                documento.vettore = self._extract_field(full_text, self.patterns.VETTORE, "vettore")
                
                # Estrai articoli
                documento.articoli = self._extract_articoli(full_text, tables_data)
                
                # Estrai totali
                documento.totale = self._extract_decimal(full_text, self.patterns.TOTALE, "totale")
                
                # Calcola totali se non presenti
                if not documento.totale and documento.articoli:
                    documento.totale = sum(art.importo for art in documento.articoli)
                
                logger.info(f"Parsing completato con successo: {file_path}")
                
        except Exception as e:
            logger.error(f"Errore critico nel parsing di {file_path}: {e}")
            logger.error(traceback.format_exc())
            raise
            
        return documento
    
    def _normalize_text(self, text: str) -> str:
        """Normalizza il testo per facilitare il parsing"""
        # Converti a lowercase per matching case-insensitive
        text_lower = text.lower()
        
        # Mantieni anche versione originale per estrarre valori
        self._original_text = text
        
        # Rimuovi caratteri non stampabili
        text_lower = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\xff]', ' ', text_lower)
        
        # Normalizza spazi
        text_lower = re.sub(r'\s+', ' ', text_lower)
        
        return text_lower
    
    def _identify_document_type(self, text: str) -> str:
        """Identifica il tipo di documento"""
        text_lower = text.lower()
        
        for doc_type, patterns in self.patterns.TIPO_DOCUMENTO.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    return doc_type
                    
        # Default a DDT se non identificato
        return "DDT"
    
    def _extract_field(self, text: str, patterns: List[str], field_name: str) -> str:
        """Estrae un campo usando una lista di pattern"""
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                value = match.group(1).strip()
                logger.debug(f"Campo '{field_name}' trovato: {value}")
                return value
                
        logger.warning(f"Campo '{field_name}' non trovato")
        return ""
    
    def _extract_date(self, text: str) -> str:
        """Estrae e normalizza la data"""
        date_str = self._extract_field(text, self.patterns.DATA, "data")
        
        if date_str:
            # Prova a normalizzare la data
            date_str = date_str.replace('-', '/')
            
            # Gestisci anno a 2 cifre
            parts = date_str.split('/')
            if len(parts) == 3 and len(parts[2]) == 2:
                current_year = datetime.now().year
                century = (current_year // 100) * 100
                year_2digit = int(parts[2])
                
                # Assumi che date con anno < 50 siano 2000+
                if year_2digit < 50:
                    parts[2] = str(century + year_2digit)
                else:
                    parts[2] = str(century - 100 + year_2digit)
                    
                date_str = '/'.join(parts)
                
            # Valida la data
            try:
                datetime.strptime(date_str, '%d/%m/%Y')
                return date_str
            except ValueError:
                logger.warning(f"Data non valida: {date_str}")
                
        return ""
    
    def _extract_decimal(self, text: str, patterns: List[str], field_name: str) -> float:
        """Estrae un valore decimale"""
        value_str = self._extract_field(text, patterns, field_name)
        
        if value_str:
            # Normalizza il numero (virgola -> punto)
            value_str = value_str.replace(',', '.')
            # Rimuovi separatori migliaia
            value_str = re.sub(r'\.(?=\d{3})', '', value_str)
            
            try:
                return float(value_str)
            except ValueError:
                logger.warning(f"Valore decimale non valido per {field_name}: {value_str}")
                
        return 0.0
    
    def _extract_fornitore(self, text: str) -> Fornitore:
        """Estrae i dati del fornitore"""
        fornitore = Fornitore()
        
        # Per Alfieri, cerca pattern specifici
        if "alfieri" in text:
            fornitore.nome = "ALFIERI SPECIALITA' ALIMENTARI S.P.A."
            fornitore.piva = "03247720042"
            
            # Cerca indirizzo Alfieri
            addr_match = re.search(
                r'(c\.so\s+g\.\s*marconi.+?12050\s+magliano\s+alfieri.+?cn)',
                text,
                re.IGNORECASE | re.DOTALL
            )
            if addr_match:
                addr_parts = addr_match.group(1).strip().split()
                # Ricostruisci indirizzo pulito
                fornitore.indirizzo = " ".join(addr_parts)
                
        else:
            # Pattern generico per altri fornitori
            # Cerca prima riga con P.IVA per identificare il fornitore
            piva = self._extract_field(text, self.patterns.PARTITA_IVA, "p.iva fornitore")
            if piva:
                fornitore.piva = piva
                
                # Cerca nome prima della P.IVA
                piva_index = text.lower().find(piva.lower())
                if piva_index > 0:
                    before_piva = text[:piva_index]
                    lines = before_piva.strip().split('\n')
                    
                    # Il nome è probabilmente nelle ultime righe prima della P.IVA
                    for line in reversed(lines[-5:]):
                        line = line.strip()
                        if line and len(line) > 10 and not re.match(r'^[\d\s\-/]+$', line):
                            fornitore.nome = line
                            break
                            
        return fornitore
    
    def _extract_cliente(self, text: str) -> Cliente:
        """Estrae i dati del cliente"""
        cliente = Cliente()
        
        # Cerca sezione cliente
        cliente_match = re.search(
            r'cliente\s*[:.]?\s*(.+?)(?:luogo|indirizzo|via|p\.iva)',
            text,
            re.IGNORECASE | re.DOTALL
        )
        
        if cliente_match:
            cliente_text = cliente_match.group(1).strip()
            lines = [l.strip() for l in cliente_text.split('\n') if l.strip()]
            
            if lines:
                # Prima riga è il nome
                cliente.nome = lines[0]
                
                # Cerca codice cliente
                cod_match = re.search(r'cod\.\s*cliente\s*[:.]?\s*(\d+)', text, re.IGNORECASE)
                if cod_match:
                    cliente.codice = cod_match.group(1)
                
                # Analizza righe successive per indirizzo
                for i, line in enumerate(lines[1:], 1):
                    # Indirizzo (via, piazza, etc)
                    if re.match(r'^(via|v\.le|viale|corso|c\.so|piazza|p\.za)', line, re.IGNORECASE):
                        cliente.indirizzo = line
                        
                        # CAP e città dovrebbero essere nella riga successiva
                        if i < len(lines) - 1:
                            cap_citta = lines[i + 1]
                            cap_match = re.match(r'^(\d{5})\s*-?\s*(.+)', cap_citta)
                            if cap_match:
                                cliente.cap = cap_match.group(1)
                                citta_prov = cap_match.group(2).strip()
                                
                                # Estrai provincia (ultime 2 lettere maiuscole)
                                prov_match = re.search(r'\b([A-Z]{2})$', citta_prov)
                                if prov_match:
                                    cliente.provincia = prov_match.group(1)
                                    cliente.citta = citta_prov[:prov_match.start()].strip()
                                else:
                                    cliente.citta = citta_prov
                        break
        
        # Cerca P.IVA cliente
        # Escludi P.IVA del fornitore già trovata
        text_after_cliente = text
        if cliente.nome:
            nome_index = text.lower().find(cliente.nome.lower())
            if nome_index > 0:
                text_after_cliente = text[nome_index:]
                
        piva_matches = re.finditer(r'p\.?\s*iva\s*[:.]?\s*(\d{11})', text_after_cliente, re.IGNORECASE)
        for match in piva_matches:
            piva = match.group(1)
            # Escludi P.IVA Alfieri
            if piva != "03247720042":
                cliente.piva = piva
                break
                
        return cliente
    
    def _extract_agente(self, text: str) -> Agente:
        """Estrae i dati dell'agente"""
        agente = Agente()
        
        for pattern in self.patterns.AGENTE:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                agente.codice = match.group(1).strip()
                agente.nome = match.group(2).strip()
                break
                
        return agente
    
    def _extract_articoli(self, text: str, tables_data: List[List[List[str]]]) -> List[Articolo]:
        """Estrae gli articoli dal documento"""
        articoli = []
        
        # Prima prova con le tabelle estratte
        if tables_data:
            articoli = self._extract_articoli_from_tables(tables_data)
            
        # Se non ci sono tabelle o l'estrazione fallisce, prova con pattern
        if not articoli:
            articoli = self._extract_articoli_from_text(text)
            
        return articoli
    
    def _extract_articoli_from_tables(self, tables: List[List[List[str]]]) -> List[Articolo]:
        """Estrae articoli dalle tabelle"""
        articoli = []
        
        for table in tables:
            if not table or len(table) < 2:
                continue
                
            # Identifica header
            header = table[0]
            header_lower = [str(h).lower() if h else "" for h in header]
            
            # Cerca colonne chiave
            col_map = {}
            for i, h in enumerate(header_lower):
                if 'codice' in h or 'cod' in h:
                    col_map['codice'] = i
                elif 'descrizione' in h or 'desc' in h or 'articolo' in h:
                    col_map['descrizione'] = i
                elif 'quant' in h or 'q.tà' in h or 'qta' in h:
                    col_map['quantita'] = i
                elif 'prezzo' in h and 'unit' in h:
                    col_map['prezzo'] = i
                elif 'sconto' in h or 'sc%' in h:
                    col_map['sconto'] = i
                elif 'importo' in h and 'iva' not in h:
                    col_map['importo'] = i
                elif 'iva' in h and '%' in h:
                    col_map['iva'] = i
                elif 'u.m.' in h or 'um' in h:
                    col_map['um'] = i
                    
            # Se non troviamo colonne base, skip
            if 'descrizione' not in col_map:
                continue
                
            # Estrai righe
            for row in table[1:]:
                if not row or all(not cell for cell in row):
                    continue
                    
                try:
                    articolo = Articolo()
                    
                    # Estrai valori
                    if 'codice' in col_map and col_map['codice'] < len(row):
                        articolo.codice = str(row[col_map['codice']] or "").strip()
                        
                    if 'descrizione' in col_map and col_map['descrizione'] < len(row):
                        articolo.descrizione = str(row[col_map['descrizione']] or "").strip()
                        
                    if 'um' in col_map and col_map['um'] < len(row):
                        articolo.unita_misura = str(row[col_map['um']] or "").strip()
                        
                    if 'quantita' in col_map and col_map['quantita'] < len(row):
                        articolo.quantita = self._parse_number(row[col_map['quantita']])
                        
                    if 'prezzo' in col_map and col_map['prezzo'] < len(row):
                        articolo.prezzo_unitario = self._parse_number(row[col_map['prezzo']])
                        
                    if 'sconto' in col_map and col_map['sconto'] < len(row):
                        articolo.sconto = self._parse_number(row[col_map['sconto']])
                        
                    if 'importo' in col_map and col_map['importo'] < len(row):
                        articolo.importo = self._parse_number(row[col_map['importo']])
                        
                    if 'iva' in col_map and col_map['iva'] < len(row):
                        articolo.iva = self._parse_number(row[col_map['iva']])
                        
                    # Valida articolo
                    if articolo.descrizione and (articolo.quantita > 0 or articolo.importo > 0):
                        articoli.append(articolo)
                        
                except Exception as e:
                    logger.debug(f"Errore parsing riga tabella: {e}")
                    continue
                    
        return articoli
    
    def _extract_articoli_from_text(self, text: str) -> List[Articolo]:
        """Estrae articoli dal testo con pattern"""
        articoli = []
        
        # Pattern per righe articolo
        # Formato: CODICE DESCRIZIONE UM QTA PREZZO SCONTO IMPORTO IVA
        pattern = re.compile(
            r'(\w+)\s+'  # Codice
            r'(.+?)\s+'  # Descrizione
            r'(PZ|KG|LT|CF|CT|NR)\s+'  # Unità misura
            r'([\d.,]+)\s+'  # Quantità
            r'([\d.,]+)\s+'  # Prezzo
            r'([\d.,]+)\s+'  # Sconto
            r'([\d.,]+)\s+'  # Importo
            r'(\d+)'  # IVA
        )
        
        # Cerca sezione articoli
        articoli_section = re.search(
            r'(codice\s+descrizione.+?)(totale|trasporto|note)',
            text,
            re.IGNORECASE | re.DOTALL
        )
        
        if articoli_section:
            section_text = articoli_section.group(1)
            
            for match in pattern.finditer(section_text):
                try:
                    articolo = Articolo(
                        codice=match.group(1),
                        descrizione=match.group(2).strip(),
                        unita_misura=match.group(3),
                        quantita=self._parse_number(match.group(4)),
                        prezzo_unitario=self._parse_number(match.group(5)),
                        sconto=self._parse_number(match.group(6)),
                        importo=self._parse_number(match.group(7)),
                        iva=self._parse_number(match.group(8))
                    )
                    articoli.append(articolo)
                except Exception as e:
                    logger.debug(f"Errore parsing articolo da testo: {e}")
                    
        return articoli
    
    def _parse_number(self, value: Union[str, float, int]) -> float:
        """Converte un valore in numero float"""
        if isinstance(value, (int, float)):
            return float(value)
            
        if not value:
            return 0.0
            
        try:
            # Rimuovi spazi e caratteri non numerici comuni
            value = str(value).strip()
            value = value.replace('€', '').replace('$', '').replace('%', '')
            
            # Gestisci separatori decimali
            # Se c'è sia punto che virgola, assumiamo che il punto sia separatore migliaia
            if ',' in value and '.' in value:
                if value.rindex(',') > value.rindex('.'):
                    # Virgola dopo punto: virgola è decimale
                    value = value.replace('.', '').replace(',', '.')
                else:
                    # Punto dopo virgola: punto è decimale
                    value = value.replace(',', '')
            else:
                # Solo virgola: assumiamo sia decimale
                value = value.replace(',', '.')
                
            return float(value)
        except (ValueError, AttributeError):
            return 0.0
    
    def validate_partita_iva(self, piva: str) -> bool:
        """Valida una partita IVA italiana"""
        if not piva or not re.match(r'^\d{11}$', piva):
            return False
            
        # Algoritmo di validazione P.IVA italiana
        total = 0
        for i in range(0, 10, 2):
            total += int(piva[i])
            
        for i in range(1, 10, 2):
            double = int(piva[i]) * 2
            total += double if double < 10 else double - 9
            
        check = (10 - (total % 10)) % 10
        return check == int(piva[10])
    
    def process_multiple_files(self, file_paths: List[Union[str, Path]]) -> Tuple[List[Documento], List[Dict]]:
        """
        Processa multipli file PDF
        
        Args:
            file_paths: Lista di percorsi file
            
        Returns:
            Tuple di (documenti_successo, errori)
        """
        results = []
        errors = []
        
        total_files = len(file_paths)
        logger.info(f"Inizio elaborazione di {total_files} file")
        
        for i, file_path in enumerate(file_paths, 1):
            file_path = Path(file_path)
            logger.info(f"Elaborazione file {i}/{total_files}: {file_path.name}")
            
            try:
                # Crea un nuovo parser per ogni file per evitare contaminazione stato
                documento = self.parse_single_file(file_path)
                results.append(documento)
                logger.info(f"✓ File {i}/{total_files} elaborato con successo")
                
            except Exception as e:
                error_info = {
                    'file': str(file_path),
                    'error': str(e),
                    'traceback': traceback.format_exc()
                }
                errors.append(error_info)
                logger.error(f"✗ Errore file {i}/{total_files}: {e}")
                
        logger.info(f"Elaborazione completata: {len(results)} successi, {len(errors)} errori")
        return results, errors
    
    def save_results(self, documenti: List[Documento], output_path: Union[str, Path], 
                    format: str = 'json') -> None:
        """
        Salva i risultati in file
        
        Args:
            documenti: Lista documenti da salvare
            output_path: Percorso file output
            format: Formato output ('json' o 'csv')
        """
        output_path = Path(output_path)
        
        if format == 'json':
            # Converti in dizionari
            data = [asdict(doc) for doc in documenti]
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                
        elif format == 'csv':
            # Crea DataFrame per export CSV
            records = []
            
            for doc in documenti:
                # Record base documento
                base_record = {
                    'tipo': doc.tipo,
                    'numero': doc.numero,
                    'data': doc.data,
                    'fornitore_nome': doc.fornitore.nome,
                    'fornitore_piva': doc.fornitore.piva,
                    'cliente_nome': doc.cliente.nome,
                    'cliente_piva': doc.cliente.piva,
                    'totale': doc.totale,
                    'file_origine': doc.file_origine
                }
                
                # Se ci sono articoli, crea un record per articolo
                if doc.articoli:
                    for art in doc.articoli:
                        record = base_record.copy()
                        record.update({
                            'articolo_codice': art.codice,
                            'articolo_descrizione': art.descrizione,
                            'articolo_quantita': art.quantita,
                            'articolo_prezzo': art.prezzo_unitario,
                            'articolo_importo': art.importo
                        })
                        records.append(record)
                else:
                    records.append(base_record)
                    
            df = pd.DataFrame(records)
            df.to_csv(output_path, index=False, encoding='utf-8-sig')
            
        logger.info(f"Risultati salvati in: {output_path}")


def main():
    """Esempio di utilizzo"""
    import sys
    
    if len(sys.argv) < 2:
        print("Uso: python ddt_fatture_parser.py <file1.pdf> [file2.pdf] ...")
        sys.exit(1)
        
    # Crea parser
    parser = DDTFattureParser()
    
    # Processa file
    file_paths = sys.argv[1:]
    results, errors = parser.process_multiple_files(file_paths)
    
    # Stampa sommario
    print(f"\n=== RISULTATI ELABORAZIONE ===")
    print(f"File processati: {len(file_paths)}")
    print(f"Successi: {len(results)}")
    print(f"Errori: {len(errors)}")
    
    # Mostra dettagli documenti
    if results:
        print("\n=== DOCUMENTI ESTRATTI ===")
        for doc in results:
            print(f"\n{doc.tipo} N. {doc.numero} del {doc.data}")
            print(f"  Cliente: {doc.cliente.nome}")
            print(f"  Totale: €{doc.totale:.2f}")
            print(f"  Articoli: {len(doc.articoli)}")
            
    # Mostra errori
    if errors:
        print("\n=== ERRORI ===")
        for err in errors:
            print(f"\nFile: {err['file']}")
            print(f"Errore: {err['error']}")
            
    # Salva risultati
    if results:
        parser.save_results(results, 'output_documenti.json', 'json')
        parser.save_results(results, 'output_documenti.csv', 'csv')
        print("\nRisultati salvati in output_documenti.json e output_documenti.csv")


if __name__ == "__main__":
    main()