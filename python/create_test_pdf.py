#!/usr/bin/env python3
"""
Crea un PDF di test che simula un DDT Alfieri per testing
"""

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from datetime import datetime


def create_test_ddt_pdf(filename="test_ddt_alfieri.pdf"):
    """Crea un PDF di test che simula la struttura DDT Alfieri"""
    
    # Crea canvas
    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4
    
    # Font
    c.setFont("Helvetica", 10)
    
    # Intestazione azienda
    y = height - 30*mm
    c.drawString(30*mm, y, "ALFIERI SPECIALITA' ALIMENTARI S.P.A.")
    y -= 5*mm
    c.drawString(30*mm, y, "C.so G. Marconi 10/E - Tel. 0173 66457 - Fax 0173 266898")
    y -= 5*mm
    c.drawString(30*mm, y, "12050 MAGLIANO ALFIERI (CN)")
    y -= 5*mm
    c.drawString(30*mm, y, "R.E.A. Cn 275071 - P.IVA E C.F. 03247720042")
    
    # Tipo documento
    y -= 15*mm
    c.setFont("Helvetica-Bold", 12)
    c.drawString(90*mm, y, "Documento di trasporto")
    c.setFont("Helvetica", 10)
    y -= 5*mm
    c.drawString(85*mm, y, "(D.P.R. 472 del 14 agosto 1996)")
    
    # Intestazioni colonne
    y -= 10*mm
    c.drawString(100*mm, y, "Numero")
    c.drawString(130*mm, y, "Del")
    c.drawString(155*mm, y, "Pag.")
    c.drawString(170*mm, y, "Cod. Cliente")
    
    # RIGA IMPORTANTE: Dati su una riga
    y -= 8*mm
    c.setFont("Helvetica-Bold", 11)
    # Questa è la riga che il parser deve trovare
    c.drawString(30*mm, y, "5023 3/06/25 1 20322 DONAC S.R.L.")
    c.setFont("Helvetica", 10)
    
    # Intestazioni cliente
    y -= 10*mm
    c.drawString(30*mm, y, "Cliente")
    c.drawString(100*mm, y, "Luogo di consegna")
    
    # Dati cliente - colonna sinistra
    y -= 8*mm
    c.drawString(30*mm, y, "DONAC S.R.L.")
    y -= 5*mm
    c.drawString(30*mm, y, "VIA MARGARITA, 8 LOC. TETTO GARETTO")
    y -= 5*mm
    c.drawString(30*mm, y, "12100 - CUNEO CN")
    y -= 5*mm
    c.drawString(30*mm, y, "P.IVA: 04064060041")
    
    # Dati consegna - colonna destra (stesso Y del cliente)
    y_consegna = y + 15*mm
    c.drawString(100*mm, y_consegna, "DONAC S.R.L.")
    y_consegna -= 5*mm
    c.drawString(100*mm, y_consegna, "VIA SALUZZO, 65")
    y_consegna -= 5*mm
    c.drawString(100*mm, y_consegna, "12038 - SAVIGLIANO CN")
    
    # Agente e vettore
    y -= 10*mm
    c.drawString(30*mm, y, "Agente: 507 SAFFIRIO FLAVIO")
    y -= 5*mm
    c.drawString(30*mm, y, "Vettore: S.A.F.I.M. S.P.A")
    
    # Intestazione tabella articoli
    y -= 15*mm
    headers = ["Codice Art.", "Descrizione", "U.M.", "Q.tà", "Prezzo", "Sconto%", "Importo", "IVA"]
    x_positions = [30, 55, 120, 135, 145, 160, 175, 190]
    
    c.setFont("Helvetica-Bold", 9)
    for header, x_pos in zip(headers, x_positions):
        c.drawString(x_pos*mm, y, header)
    
    # Righe articoli
    c.setFont("Helvetica", 9)
    articles = [
        ["060041", "AGNOLOTTI BRASATO CARNE LC 250 G", "PZ", "120", "1,9000", "15,00", "193,80", "10"],
        ["070017", "PASTA SFOGLIA ROTONDA 230 GR", "PZ", "48", "2,1000", "10,00", "90,72", "10"],
        ["200527", "GNOCCHI PATATE RETT. S/GLUT 400", "PZ", "24", "1,8500", "8,00", "40,85", "10"]
    ]
    
    for article in articles:
        y -= 5*mm
        for value, x_pos in zip(article, x_positions):
            c.drawString(x_pos*mm, y, value)
    
    # Totale
    y -= 15*mm
    c.setFont("Helvetica-Bold", 10)
    c.drawString(30*mm, y, "Totale documento €: 325,37")
    
    # Note finali
    y -= 10*mm
    c.setFont("Helvetica", 8)
    c.drawString(30*mm, y, "Numero colli: 92")
    c.drawString(80*mm, y, "Peso lordo Kg: 181,5")
    
    # Salva PDF
    c.save()
    print(f"✅ PDF di test creato: {filename}")
    
    # Mostra struttura attesa
    print("\n📋 STRUTTURA DATI ATTESA:")
    print("  - Tipo: DDT")
    print("  - Numero: 5023")
    print("  - Data: 03/06/2025")
    print("  - Cod. Cliente: 20322")
    print("  - Cliente: DONAC S.R.L.")
    print("  - P.IVA: 04064060041")
    print("  - Indirizzo consegna: VIA SALUZZO, 65 12038 - SAVIGLIANO CN")
    print("  - Totale: €325,37")
    
    return filename


def test_with_parser(pdf_file):
    """Testa il PDF creato con il parser"""
    try:
        from ddt_parser_enhanced import DDTParser
        
        print(f"\n🧪 TEST PARSER SUL PDF CREATO")
        print("="*60)
        
        parser = DDTParser(debug=True)
        result = parser.parse_pdf(pdf_file)
        
        if result['success']:
            data = result['data']
            print("\n✅ DATI ESTRATTI:")
            print(f"  - Numero: {data.get('numero', 'NON TROVATO')}")
            print(f"  - Data: {data.get('data', 'NON TROVATO')}")
            print(f"  - Cliente: {data.get('cliente', 'NON TROVATO')}")
            print(f"  - Cod. Cliente: {data.get('codice_cliente', 'NON TROVATO')}")
            print(f"  - P.IVA: {data.get('piva_cliente', 'NON TROVATO')}")
            print(f"  - Totale: €{data.get('totale', 0):.2f}")
            
            # Verifica correttezza
            checks = {
                'numero': data.get('numero') == '5023',
                'data': data.get('data') == '03/06/2025',
                'cliente': 'DONAC' in str(data.get('cliente', '')),
                'codice_cliente': data.get('codice_cliente') == '20322'
            }
            
            print("\n🔍 VERIFICHE:")
            for field, ok in checks.items():
                print(f"  - {field}: {'✅ OK' if ok else '❌ ERRORE'}")
                
        else:
            print(f"\n❌ ERRORE PARSING: {result['errors']}")
            
    except ImportError:
        print("\n⚠️  Parser non trovato. Esegui prima:")
        print("   python ddt_parser_enhanced.py test_ddt_alfieri.pdf")


if __name__ == "__main__":
    # Crea PDF di test
    pdf_file = create_test_ddt_pdf()
    
    # Testa con il parser
    test_with_parser(pdf_file)