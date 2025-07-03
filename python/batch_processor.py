#!/usr/bin/env python3
"""
Processore batch avanzato per DDT e Fatture
Con reporting dettagliato e gestione errori
"""

import os
import sys
import time
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any
import json
import pandas as pd
from ddt_fatture_parser import DDTFattureParser

# Configurazione logging avanzato
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'batch_process_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class BatchProcessor:
    """Processore batch con funzionalità avanzate"""
    
    def __init__(self, input_dir: str, output_dir: str):
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Crea sottocartelle per organizzazione
        self.success_dir = self.output_dir / "success"
        self.error_dir = self.output_dir / "errors"
        self.reports_dir = self.output_dir / "reports"
        
        for dir in [self.success_dir, self.error_dir, self.reports_dir]:
            dir.mkdir(exist_ok=True)
            
        self.parser = DDTFattureParser()
        self.stats = {
            'total_files': 0,
            'success': 0,
            'errors': 0,
            'start_time': None,
            'end_time': None,
            'by_type': {'DDT': 0, 'FATTURA': 0},
            'by_fornitore': {},
            'totale_importi': 0.0
        }
        
    def find_pdf_files(self) -> List[Path]:
        """Trova tutti i file PDF nella directory input"""
        pdf_files = list(self.input_dir.glob("**/*.pdf"))
        logger.info(f"Trovati {len(pdf_files)} file PDF in {self.input_dir}")
        return pdf_files
        
    def process_batch(self, max_files: int = None) -> Dict[str, Any]:
        """
        Processa batch di file con reporting dettagliato
        
        Args:
            max_files: Numero massimo di file da processare (None = tutti)
            
        Returns:
            Dizionario con statistiche complete
        """
        self.stats['start_time'] = datetime.now()
        
        # Trova file da processare
        pdf_files = self.find_pdf_files()
        
        if max_files:
            pdf_files = pdf_files[:max_files]
            
        self.stats['total_files'] = len(pdf_files)
        
        if not pdf_files:
            logger.warning("Nessun file PDF trovato!")
            return self.stats
            
        logger.info(f"Inizio elaborazione di {len(pdf_files)} file...")
        
        # Process files
        successes = []
        errors = []
        
        for i, pdf_file in enumerate(pdf_files, 1):
            logger.info(f"\n[{i}/{len(pdf_files)}] Elaborazione: {pdf_file.name}")
            
            try:
                # Parse documento
                start = time.time()
                documento = self.parser.parse_single_file(pdf_file)
                elapsed = time.time() - start
                
                # Aggiorna statistiche
                self.stats['success'] += 1
                self.stats['by_type'][documento.tipo] = self.stats['by_type'].get(documento.tipo, 0) + 1
                
                if documento.fornitore.nome:
                    self.stats['by_fornitore'][documento.fornitore.nome] = \
                        self.stats['by_fornitore'].get(documento.fornitore.nome, 0) + 1
                        
                self.stats['totale_importi'] += documento.totale
                
                # Salva risultato singolo
                output_file = self.success_dir / f"{pdf_file.stem}_parsed.json"
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(documento.__dict__, f, ensure_ascii=False, indent=2, default=str)
                    
                successes.append({
                    'file': pdf_file.name,
                    'tipo': documento.tipo,
                    'numero': documento.numero,
                    'data': documento.data,
                    'cliente': documento.cliente.nome,
                    'totale': documento.totale,
                    'tempo_elaborazione': f"{elapsed:.2f}s"
                })
                
                logger.info(f"  ✓ Successo: {documento.tipo} N.{documento.numero} - €{documento.totale:.2f}")
                
            except Exception as e:
                self.stats['errors'] += 1
                
                error_info = {
                    'file': pdf_file.name,
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                }
                errors.append(error_info)
                
                # Salva dettagli errore
                error_file = self.error_dir / f"{pdf_file.stem}_error.txt"
                with open(error_file, 'w', encoding='utf-8') as f:
                    f.write(f"File: {pdf_file}\n")
                    f.write(f"Errore: {e}\n")
                    f.write(f"Timestamp: {datetime.now()}\n\n")
                    f.write("Traceback:\n")
                    import traceback
                    f.write(traceback.format_exc())
                    
                logger.error(f"  ✗ Errore: {e}")
                
        self.stats['end_time'] = datetime.now()
        
        # Genera report completo
        self._generate_report(successes, errors)
        
        # Genera file Excel riepilogativo
        if successes:
            self._generate_excel_summary(successes)
            
        return self.stats
        
    def _generate_report(self, successes: List[Dict], errors: List[Dict]):
        """Genera report dettagliato in formato HTML"""
        elapsed = (self.stats['end_time'] - self.stats['start_time']).total_seconds()
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Report Elaborazione Batch - {self.stats['start_time'].strftime('%Y-%m-%d %H:%M')}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        h1, h2 {{ color: #333; }}
        .stats {{ background: #f0f0f0; padding: 15px; border-radius: 5px; }}
        .success {{ color: green; }}
        .error {{ color: red; }}
        table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #4CAF50; color: white; }}
        tr:nth-child(even) {{ background-color: #f2f2f2; }}
    </style>
</head>
<body>
    <h1>Report Elaborazione Batch DDT/Fatture</h1>
    
    <div class="stats">
        <h2>Statistiche Generali</h2>
        <p><strong>Data elaborazione:</strong> {self.stats['start_time'].strftime('%Y-%m-%d %H:%M:%S')}</p>
        <p><strong>Tempo totale:</strong> {elapsed:.2f} secondi</p>
        <p><strong>File totali:</strong> {self.stats['total_files']}</p>
        <p class="success"><strong>Successi:</strong> {self.stats['success']}</p>
        <p class="error"><strong>Errori:</strong> {self.stats['errors']}</p>
        <p><strong>Importo totale documenti:</strong> €{self.stats['totale_importi']:,.2f}</p>
    </div>
    
    <h2>Riepilogo per Tipo Documento</h2>
    <table>
        <tr>
            <th>Tipo</th>
            <th>Quantità</th>
        </tr>
"""
        
        for tipo, count in self.stats['by_type'].items():
            html_content += f"""
        <tr>
            <td>{tipo}</td>
            <td>{count}</td>
        </tr>
"""
            
        html_content += """
    </table>
    
    <h2>Riepilogo per Fornitore</h2>
    <table>
        <tr>
            <th>Fornitore</th>
            <th>Documenti</th>
        </tr>
"""
        
        for fornitore, count in sorted(self.stats['by_fornitore'].items()):
            html_content += f"""
        <tr>
            <td>{fornitore}</td>
            <td>{count}</td>
        </tr>
"""
            
        html_content += """
    </table>
    
    <h2>Documenti Elaborati con Successo</h2>
    <table>
        <tr>
            <th>File</th>
            <th>Tipo</th>
            <th>Numero</th>
            <th>Data</th>
            <th>Cliente</th>
            <th>Totale</th>
            <th>Tempo</th>
        </tr>
"""
        
        for doc in successes:
            html_content += f"""
        <tr>
            <td>{doc['file']}</td>
            <td>{doc['tipo']}</td>
            <td>{doc['numero']}</td>
            <td>{doc['data']}</td>
            <td>{doc['cliente']}</td>
            <td>€{doc['totale']:.2f}</td>
            <td>{doc['tempo_elaborazione']}</td>
        </tr>
"""
            
        if errors:
            html_content += """
    </table>
    
    <h2>Errori di Elaborazione</h2>
    <table>
        <tr>
            <th>File</th>
            <th>Errore</th>
            <th>Timestamp</th>
        </tr>
"""
            
            for err in errors:
                html_content += f"""
        <tr>
            <td>{err['file']}</td>
            <td>{err['error']}</td>
            <td>{err['timestamp']}</td>
        </tr>
"""
                
        html_content += """
    </table>
</body>
</html>
"""
        
        # Salva report HTML
        report_file = self.reports_dir / f"report_{self.stats['start_time'].strftime('%Y%m%d_%H%M%S')}.html"
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
            
        logger.info(f"\nReport HTML salvato in: {report_file}")
        
    def _generate_excel_summary(self, successes: List[Dict]):
        """Genera riepilogo Excel"""
        df = pd.DataFrame(successes)
        
        # Aggiungi colonne calcolate
        if 'data' in df.columns:
            try:
                df['data_parsed'] = pd.to_datetime(df['data'], format='%d/%m/%Y', errors='coerce')
                df['anno'] = df['data_parsed'].dt.year
                df['mese'] = df['data_parsed'].dt.month
            except:
                pass
                
        # Salva Excel
        excel_file = self.reports_dir / f"riepilogo_{self.stats['start_time'].strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        with pd.ExcelWriter(excel_file, engine='openpyxl') as writer:
            # Foglio principale
            df.to_excel(writer, sheet_name='Documenti', index=False)
            
            # Foglio statistiche
            stats_df = pd.DataFrame([
                {'Metrica': 'File Totali', 'Valore': self.stats['total_files']},
                {'Metrica': 'Successi', 'Valore': self.stats['success']},
                {'Metrica': 'Errori', 'Valore': self.stats['errors']},
                {'Metrica': 'Importo Totale', 'Valore': f"€{self.stats['totale_importi']:,.2f}"},
            ])
            stats_df.to_excel(writer, sheet_name='Statistiche', index=False)
            
        logger.info(f"Riepilogo Excel salvato in: {excel_file}")
        
    def print_summary(self):
        """Stampa riepilogo a console"""
        print("\n" + "="*60)
        print("RIEPILOGO ELABORAZIONE BATCH")
        print("="*60)
        print(f"File totali:     {self.stats['total_files']}")
        print(f"Successi:        {self.stats['success']} ({self.stats['success']/self.stats['total_files']*100:.1f}%)")
        print(f"Errori:          {self.stats['errors']} ({self.stats['errors']/self.stats['total_files']*100:.1f}%)")
        print(f"Importo totale:  €{self.stats['totale_importi']:,.2f}")
        
        if self.stats['end_time'] and self.stats['start_time']:
            elapsed = (self.stats['end_time'] - self.stats['start_time']).total_seconds()
            print(f"Tempo totale:    {elapsed:.2f} secondi")
            if self.stats['total_files'] > 0:
                print(f"Tempo medio:     {elapsed/self.stats['total_files']:.2f} sec/file")
                
        print("\nPer tipo documento:")
        for tipo, count in self.stats['by_type'].items():
            print(f"  {tipo}: {count}")
            
        print("\nTop 5 fornitori:")
        for fornitore, count in sorted(self.stats['by_fornitore'].items(), 
                                     key=lambda x: x[1], reverse=True)[:5]:
            print(f"  {fornitore}: {count} documenti")
            
        print("="*60)


def main():
    """Funzione principale"""
    if len(sys.argv) < 3:
        print("Uso: python batch_processor.py <input_dir> <output_dir> [max_files]")
        print("\nEsempio:")
        print("  python batch_processor.py ./pdf_input ./risultati")
        print("  python batch_processor.py ./pdf_input ./risultati 10")
        sys.exit(1)
        
    input_dir = sys.argv[1]
    output_dir = sys.argv[2]
    max_files = int(sys.argv[3]) if len(sys.argv) > 3 else None
    
    # Verifica directory input
    if not os.path.exists(input_dir):
        print(f"Errore: Directory input '{input_dir}' non trovata!")
        sys.exit(1)
        
    # Crea processore
    processor = BatchProcessor(input_dir, output_dir)
    
    # Processa batch
    try:
        stats = processor.process_batch(max_files)
        processor.print_summary()
        
        # Exit code basato su successo/errori
        if stats['errors'] == 0:
            sys.exit(0)  # Tutto OK
        elif stats['success'] > 0:
            sys.exit(1)  # Alcuni errori
        else:
            sys.exit(2)  # Tutti falliti
            
    except KeyboardInterrupt:
        print("\n\nElaborazione interrotta dall'utente!")
        sys.exit(3)
    except Exception as e:
        print(f"\nErrore critico: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(4)


if __name__ == "__main__":
    main()