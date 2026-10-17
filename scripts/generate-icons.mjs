import fs from 'node:fs';

// Minimal 1x1 valid PNG buffer
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const buf = Buffer.from(pngBase64, 'base64');

fs.writeFileSync('public/icon-192.png', buf);
fs.writeFileSync('public/icon-512.png', buf);
fs.writeFileSync('public/favicon.ico', buf);
console.log('Icons created.');
