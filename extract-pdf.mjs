import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const buf = readFileSync('C:/Users/WEVERTON PARANHOS/Desktop/TERCEIRIZEI/MANUAL DA MARCA TERCEIRIZEI.pdf');
const data = await pdfParse(buf);
console.log('PAGES:', data.numpages);
console.log(data.text);
