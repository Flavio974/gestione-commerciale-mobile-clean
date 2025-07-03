// Script Node.js per generare icone PWA
const fs = require('fs');
const { createCanvas } = require('canvas');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Sfondo gradiente blu
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#457b9d');
    gradient.addColorStop(1, '#1d3557');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Cerchio bianco centrale
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(size/2, size/2, size*0.35, 0, 2 * Math.PI);
    ctx.fill();
    
    // Icona microfono stilizzata
    ctx.fillStyle = '#1d3557';
    const micSize = size * 0.15;
    
    // Corpo microfono
    ctx.fillRect(size/2 - micSize/3, size/2 - micSize, micSize*0.66, micSize*1.5);
    
    // Base microfono
    ctx.fillRect(size/2 - micSize/2, size/2 + micSize/2, micSize, micSize/4);
    
    // Salva l'icona
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`icons/icon-${size}x${size}.png`, buffer);
    console.log(`✅ Creata icona ${size}x${size}`);
});

console.log('🎯 Tutte le icone create!');