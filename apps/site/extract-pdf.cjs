const { PDFParse } = require('pdf-parse');
const fs = require('fs');

const buf = fs.readFileSync('C:/Users/WEVERTON PARANHOS/Desktop/TERCEIRIZEI/MANUAL DA MARCA TERCEIRIZEI.pdf');
const parser = new PDFParse();
parser.parse(buf).then(data => {
  console.log('PAGES:', data.numpages);
  console.log(data.text);
}).catch(e => {
  console.error('ERROR:', e.message);
  console.log('Keys:', Object.keys(require('pdf-parse')));
});
