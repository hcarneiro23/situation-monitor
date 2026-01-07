import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const content = fs.readFileSync(path.join(__dirname, '..', 'services', 'newsAggregator.js'), 'utf8');

// Extract all feed entries
const feedRegex = /\{\s*url:\s*['"]([^'"]+)['"],\s*source:\s*['"]([^'"]+)['"],\s*category:\s*['"]([^'"]+)['"],\s*scope:\s*(\w+)(?:,\s*region:\s*['"]([^'"]+)['"])?/g;

let match;
const feeds = [];
while ((match = feedRegex.exec(content)) !== null) {
  feeds.push({
    url: match[1],
    source: match[2],
    category: match[3],
    scope: match[4].replace('SCOPE_', ''),
    region: match[5] || '-'
  });
}

// Group by region
const byRegion = {};
feeds.forEach(f => {
  const key = f.region || 'INTERNATIONAL';
  if (!byRegion[key]) byRegion[key] = [];
  byRegion[key].push(f);
});

console.log('='.repeat(80));
console.log('TOTAL FEEDS:', feeds.length);
console.log('='.repeat(80));

for (const [region, regionFeeds] of Object.entries(byRegion).sort()) {
  console.log('\n' + '-'.repeat(80));
  console.log(region.toUpperCase() + ' (' + regionFeeds.length + ' feeds)');
  console.log('-'.repeat(80));

  // Group by category
  const byCat = {};
  regionFeeds.forEach(f => {
    if (!byCat[f.category]) byCat[f.category] = [];
    byCat[f.category].push(f);
  });

  for (const [cat, catFeeds] of Object.entries(byCat).sort()) {
    console.log('\n  [' + cat + '] (' + catFeeds.length + ')');
    catFeeds.forEach(f => console.log('    - ' + f.source));
  }
}
