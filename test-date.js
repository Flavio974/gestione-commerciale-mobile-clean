// Test data corrente
const now = new Date();

console.log('📅 TEST DATA CORRENTE:');
console.log('==================');
console.log('Data completa:', now.toString());
console.log('Data ISO:', now.toISOString());
console.log('Data italiana:', now.toLocaleDateString('it-IT'));
console.log('Data italiana completa:', now.toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
}));

// Calcolo settimana
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

const settimana = getWeekNumber(now);
console.log('\n🗓️ CALCOLO SETTIMANA:');
console.log('Settimana:', settimana);
console.log('Anno:', now.getFullYear());
console.log('Mese:', now.getMonth() + 1);
console.log('Giorno:', now.getDate());

// Test con data specifica 9 luglio 2025
const dataTest = new Date(2025, 6, 9); // Mese 6 = luglio (0-indexed)
console.log('\n🔍 TEST DATA 9 LUGLIO 2025:');
console.log('Data test:', dataTest.toLocaleDateString('it-IT'));
console.log('Settimana data test:', getWeekNumber(dataTest));

// Verifica che sia veramente luglio
console.log('\n✅ VERIFICA:');
console.log('È luglio?', now.getMonth() === 6);
console.log('È giorno 9?', now.getDate() === 9);
console.log('È 2025?', now.getFullYear() === 2025);