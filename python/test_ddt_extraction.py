#!/usr/bin/env python3
"""
Script di test per verificare l'estrazione corretta dei dati DDT
"""

import pdfplumber
import re
from pathlib import Path


def debug_pdf_structure(pdf_path):
    """
    Mostra esattamente cosa viene estratto dal PDF per debugging
    """
    print(f"\n{'='*60}")
    print(f"DEBUG STRUTTURA PDF: {pdf_path}")
    print(f"{'='*60}\n")
    
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[0]
        
        # 1. Mostra dimensioni pagina
        print(f"📄 Dimensioni pagina: {page.width} x {page.height}")
        print(f"📄 Numero oggetti: {len(page.chars)} caratteri\n")
        
        # 2. Estrai e mostra testo completo
        print("=== TESTO COMPLETO ESTRATTO ===")
        full_text = page.extract_text()
        if full_text:
            print(f"Lunghezza testo: {len(full_text)} caratteri\n")
            
            # Mostra prime 30 righe
            lines = full_text.split('\n')
            print(f"Totale righe: {len(lines)}\n")
            
            for i, line in enumerate(lines[:30]):
                print(f"[{i+1:2d}] {line}")
                
                # Evidenzia righe importanti
                if any(key in line for key in ['Numero', 'Cliente', 'D.D.T.', 'DONAC']):
                    print(f"     ^^^ RIGA IMPORTANTE ^^^")
        else:
            print("❌ NESSUN TESTO ESTRATTO!")
        
        # 3. Analizza tabelle
        print("\n=== TABELLE ESTRATTE ===")
        tables = page.extract_tables()
        if tables:
            print(f"Trovate {len(tables)} tabelle\n")
            
            for i, table in enumerate(tables):
                print(f"TABELLA {i+1}: {len(table)} righe x {len(table[0]) if table else 0} colonne")
                
                # Mostra prime 5 righe
                for j, row in enumerate(table[:5]):
                    print(f"  Riga {j}: {row}")
                    
                if len(table) > 5:
                    print(f"  ... e altre {len(table)-5} righe")
                print()
        else:
            print("Nessuna tabella trovata con extract_tables()")
        
        # 4. Cerca pattern specifici nel testo
        print("\n=== RICERCA PATTERN SPECIFICI ===")
        
        # Pattern DDT Alfieri: numero data pag codcliente nome
        # Es: "5023 3/06/25 1 20322 DONAC S.R.L."
        pattern_alfieri = re.compile(r'^(\d{4})\s+(\d{1,2}/\d{2}/\d{2})\s+(\d+)\s+(\d{5})\s+(.+?)$', re.MULTILINE)
        
        matches = pattern_alfieri.finditer(full_text)
        found = False
        for match in matches:
            found = True
            print(f"\n🎯 PATTERN DDT ALFIERI TROVATO!")
            print(f"   Riga completa: '{match.group(0)}'")
            print(f"   Numero DDT: {match.group(1)}")
            print(f"   Data: {match.group(2)}")
            print(f"   Pagina: {match.group(3)}")
            print(f"   Cod. Cliente: {match.group(4)}")
            print(f"   Nome Cliente: {match.group(5)}")
            
        if not found:
            print("❌ Pattern Alfieri non trovato")
            
            # Prova a cercare i campi singolarmente
            print("\n🔍 Ricerca campi singoli:")
            
            # Cerca numeri che potrebbero essere numero DDT
            numeri_4_cifre = re.findall(r'\b(\d{4})\b', full_text)
            print(f"\nNumeri a 4 cifre trovati: {numeri_4_cifre[:10]}")
            
            # Cerca date
            date_pattern = re.findall(r'\b(\d{1,2}/\d{2}/\d{2,4})\b', full_text)
            print(f"\nDate trovate: {date_pattern[:5]}")
            
            # Cerca "DONAC" o altri clienti
            if 'DONAC' in full_text:
                idx = full_text.find('DONAC')
                context = full_text[max(0, idx-50):idx+100]
                print(f"\nContesto 'DONAC': ...{context}...")
        
        # 5. Analisi layout caratteri (per capire la struttura)
        print("\n=== ANALISI POSIZIONI CARATTERI (prime 500) ===")
        chars = page.chars[:500]
        
        # Raggruppa per riga (stesso y)
        from collections import defaultdict
        rows = defaultdict(list)
        
        for char in chars:
            y = round(char['top'])  # Arrotonda per raggruppare
            rows[y].append(char)
        
        # Mostra prime 10 righe con posizioni
        sorted_rows = sorted(rows.items())[:10]
        for y, chars_in_row in sorted_rows:
            # Ordina per x
            chars_in_row.sort(key=lambda c: c['x0'])
            text = ''.join(c['text'] for c in chars_in_row)
            x_positions = [f"{c['x0']:.0f}" for c in chars_in_row[:5]]  # Prime 5 posizioni X
            print(f"Y={y}: {text[:50]}... (X: {', '.join(x_positions)})")


def test_specific_extraction(pdf_path):
    """
    Test estrazione specifica per DDT Alfieri
    """
    print(f"\n{'='*60}")
    print("TEST ESTRAZIONE SPECIFICA DDT ALFIERI")
    print(f"{'='*60}\n")
    
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[0]
        text = page.extract_text()
        
        # Dividi in righe
        lines = text.split('\n')
        
        # Strategia 1: Cerca riga con pattern completo
        print("📍 Strategia 1: Pattern riga completa")
        for i, line in enumerate(lines):
            # Pulisci spazi multipli
            clean_line = ' '.join(line.split())
            
            # Pattern: inizia con 4 cifre seguite da data
            if re.match(r'^\d{4}\s+\d{1,2}/\d{2}/\d{2}', clean_line):
                print(f"\nTrovata riga candidata {i+1}: '{clean_line}'")
                
                # Estrai parti
                parts = clean_line.split(None, 5)  # Dividi in max 6 parti
                if len(parts) >= 5:
                    print(f"  Numero: {parts[0]}")
                    print(f"  Data: {parts[1]}")
                    print(f"  Pagina: {parts[2]}")
                    print(f"  Cod.Cliente: {parts[3]}")
                    print(f"  Cliente: {parts[4] if len(parts) > 4 else 'N/A'}")
                    if len(parts) > 5:
                        print(f"  Resto: {parts[5]}")
        
        # Strategia 2: Cerca vicino a intestazioni
        print("\n📍 Strategia 2: Cerca dopo intestazioni")
        for i, line in enumerate(lines):
            if 'Numero' in line and 'Del' in line and 'Pag' in line:
                print(f"\nTrovata intestazione alla riga {i+1}: '{line}'")
                
                # Guarda le prossime 3 righe
                for j in range(1, 4):
                    if i + j < len(lines):
                        next_line = lines[i + j].strip()
                        if next_line:
                            print(f"  Riga {i+j+1}: '{next_line}'")
                            
                            # Se contiene numeri, prova a estrarre
                            if re.search(r'\d{4}', next_line):
                                parts = next_line.split()
                                print(f"    → Parti estratte: {parts}")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Uso: python test_ddt_extraction.py <file.pdf>")
        print("\nQuesto script mostra in dettaglio cosa viene estratto dal PDF")
        sys.exit(1)
    
    pdf_file = sys.argv[1]
    
    if not Path(pdf_file).exists():
        print(f"Errore: File '{pdf_file}' non trovato!")
        sys.exit(1)
    
    # Esegui debug completo
    debug_pdf_structure(pdf_file)
    
    # Test estrazione specifica
    test_specific_extraction(pdf_file)