const fs = require('fs');
const path = require('path');

const { PRODUCTS_DATA } = require('./js/products.js');

function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const headers = [
  'ID',
  'Name',
  'Gender',
  'Category',
  'Price (INR)',
  'Original Price (INR)',
  'Rating',
  'Reviews Count',
  'Badge',
  'Section',
  'Sizes',
  'Colors',
  'Images',
  'Description',
  'Details'
];

const rows = [headers.join(',')];

for (const p of PRODUCTS_DATA) {
  const row = [
    escapeCsv(p.id),
    escapeCsv(p.name),
    escapeCsv(p.gender),
    escapeCsv(p.category),
    escapeCsv(p.price),
    escapeCsv(p.originalPrice),
    escapeCsv(p.rating),
    escapeCsv(p.reviewsCount),
    escapeCsv(p.badge),
    escapeCsv(p.section),
    escapeCsv((p.sizes || []).join(', ')),
    escapeCsv((p.colors || []).map(c => c.name).join(', ')),
    escapeCsv((p.images || []).join('\n')),
    escapeCsv(p.description),
    escapeCsv((p.details || []).join(' | '))
  ];
  rows.push(row.join(','));
}

const csvPath = path.join(__dirname, 'products_catalog.csv');
fs.writeFileSync(csvPath, '\uFEFF' + rows.join('\r\n'), 'utf8');
console.log('Successfully generated products_catalog.csv with total rows:', rows.length - 1);
