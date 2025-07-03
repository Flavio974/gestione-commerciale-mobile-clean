// Simple Node.js script to query Supabase percorsi table
const https = require('https');

const supabaseUrl = 'https://ibuwqihgdkinfmvxqfnq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidXdxaWhnZGtpbmZtdnhxZm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyMDk4NjEsImV4cCI6MjA2Njc4NTg2MX0.c-zsnXM-eqXnIZQXM9UwXlKhvDDcPsDSwqANZk0uDqY';

const options = {
  hostname: 'ibuwqihgdkinfmvxqfnq.supabase.co',
  port: 443,
  path: '/rest/v1/percorsi?select=partenza,arrivo&limit=100',
  method: 'GET',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const percorsi = JSON.parse(data);
      console.log(`Found ${percorsi.length} routes in database`);
      
      // Extract unique locations
      const locations = new Set();
      percorsi.forEach(p => {
        if (p.partenza) locations.add(p.partenza);
        if (p.arrivo) locations.add(p.arrivo);
      });
      
      const locationArray = Array.from(locations).sort();
      console.log(`\nTotal unique locations: ${locationArray.length}`);
      
      // Find Alfieri variations
      const alfieriLocations = locationArray.filter(loc => 
        loc.toLowerCase().includes('alfier'));
      console.log('\n🔍 ALFIERI LOCATIONS:');
      alfieriLocations.forEach(loc => console.log(`  - "${loc}"`));
      
      // Find Essemme/Conad variations  
      const conadLocations = locationArray.filter(loc => 
        loc.toLowerCase().includes('essemme') || 
        loc.toLowerCase().includes('conad'));
      console.log('\n🔍 ESSEMME/CONAD LOCATIONS:');
      conadLocations.forEach(loc => console.log(`  - "${loc}"`));
      
      // Sample routes with these locations
      console.log('\n📍 SAMPLE ROUTES WITH ALFIERI:');
      const alfieriRoutes = percorsi.filter(p => 
        (p.partenza && p.partenza.toLowerCase().includes('alfier')) ||
        (p.arrivo && p.arrivo.toLowerCase().includes('alfier'))
      ).slice(0, 10);
      alfieriRoutes.forEach(r => console.log(`  ${r.partenza} → ${r.arrivo}`));
      
      console.log('\n📍 SAMPLE ROUTES WITH CONAD:');
      const conadRoutes = percorsi.filter(p => 
        (p.partenza && (p.partenza.toLowerCase().includes('essemme') || p.partenza.toLowerCase().includes('conad'))) ||
        (p.arrivo && (p.arrivo.toLowerCase().includes('essemme') || p.arrivo.toLowerCase().includes('conad')))
      ).slice(0, 10);
      conadRoutes.forEach(r => console.log(`  ${r.partenza} → ${r.arrivo}`));
      
      // Show first 20 locations for context
      console.log('\n📋 FIRST 20 LOCATIONS:');
      locationArray.slice(0, 20).forEach(loc => console.log(`  - "${loc}"`));
      
    } catch (error) {
      console.error('Error parsing response:', error);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.end();