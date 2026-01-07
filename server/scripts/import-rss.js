#!/usr/bin/env node

/**
 * RSS Feed Import Script
 * ======================
 * Extracts RSS URLs from any messy text input and adds them
 * directly to newsAggregator.js after user confirmation.
 *
 * Usage:
 *   1. Paste your URLs into server/rss-import.txt
 *   2. Run: node server/scripts/import-rss.js
 *   3. Review and confirm to add to newsAggregator.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const IMPORT_FILE = path.join(__dirname, '..', 'rss-import.txt');
const AGGREGATOR_FILE = path.join(__dirname, '..', 'services', 'newsAggregator.js');

// Country to region mapping
const COUNTRY_REGIONS = {
  'us': 'north_america',
  'usa': 'north_america',
  'united states': 'north_america',
  'ca': 'north_america',
  'canada': 'north_america',
  'mx': 'latin_america',
  'mexico': 'latin_america',
  'br': 'latin_america',
  'brazil': 'latin_america',
  'gb': 'europe',
  'uk': 'europe',
  'united kingdom': 'europe',
  'de': 'europe',
  'germany': 'europe',
  'fr': 'europe',
  'france': 'europe',
  'es': 'europe',
  'spain': 'europe',
  'it': 'europe',
  'italy': 'europe',
  'nl': 'europe',
  'netherlands': 'europe',
  'in': 'south_asia',
  'india': 'south_asia',
  'cn': 'east_asia',
  'china': 'east_asia',
  'jp': 'east_asia',
  'japan': 'east_asia',
  'kr': 'east_asia',
  'korea': 'east_asia',
  'au': 'oceania',
  'australia': 'oceania',
  'nz': 'oceania',
  'new zealand': 'oceania',
  'ae': 'middle_east',
  'uae': 'middle_east',
  'sa': 'middle_east',
  'saudi': 'middle_east',
  'il': 'middle_east',
  'israel': 'middle_east',
  'za': 'africa',
  'south africa': 'africa',
  'ng': 'africa',
  'nigeria': 'africa',
  'ke': 'africa',
  'kenya': 'africa',
  'eg': 'africa',
  'egypt': 'africa',
};

// Category normalization
const CATEGORY_MAP = {
  'general': 'general',
  'news': 'general',
  'top': 'general',
  'headlines': 'general',
  'national': 'general',
  'politics': 'politics',
  'political': 'politics',
  'government': 'politics',
  'election': 'politics',
  'business': 'business',
  'finance': 'business',
  'economy': 'economy',
  'economic': 'economy',
  'markets': 'markets',
  'market': 'markets',
  'stocks': 'markets',
  'tech': 'technology',
  'technology': 'technology',
  'science': 'science',
  'health': 'health',
  'medical': 'health',
  'sports': 'sports',
  'sport': 'sports',
  'entertainment': 'entertainment',
  'showbiz': 'entertainment',
  'celebrity': 'entertainment',
  'gaming': 'gaming',
  'games': 'gaming',
  'world': 'world',
  'international': 'world',
  'local': 'local',
};

// Extract source name from URL
function extractSourceName(url) {
  try {
    const urlObj = new URL(url);
    let domain = urlObj.hostname;

    // Remove common prefixes
    domain = domain.replace(/^(www\.|feeds\.|rss\.|news\.|api\.)/, '');

    // Remove TLD and get main name
    const parts = domain.split('.');
    let name = parts[0];

    // Handle special cases
    if (name === 'feedburner') {
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      if (pathParts.length > 0) {
        name = pathParts[0];
      }
    }

    // Capitalize and clean up
    name = name
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return name;
  } catch (e) {
    return 'Unknown';
  }
}

// Parse a line and extract URL + metadata
function parseLine(line) {
  if (!line || line.trim().startsWith('#') || line.trim() === '') {
    return null;
  }

  // Extract URL using regex
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const urls = line.match(urlRegex);

  if (!urls || urls.length === 0) {
    return null;
  }

  // Clean URL
  let url = urls[0].replace(/[,;:)\]}>]+$/, '');

  const lineLower = line.toLowerCase();
  let country = null;
  let region = null;
  let category = 'general';

  // Check for country codes at start
  for (const [code, reg] of Object.entries(COUNTRY_REGIONS)) {
    if (lineLower.startsWith(code + ' ') || lineLower.startsWith(code + '\t')) {
      country = code.toUpperCase();
      region = reg;
      break;
    }
  }

  // Check for category keywords in line
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(lineLower)) {
      category = cat;
      break;
    }
  }

  // Also detect category from URL path
  const urlLower = url.toLowerCase();
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (urlLower.includes('/' + keyword) || urlLower.includes(keyword + '.')) {
      category = cat;
      break;
    }
  }

  return { url, source: extractSourceName(url), category, country, region };
}

// Generate JS code for a feed entry
function generateFeedEntry(feed) {
  const scope = feed.region ? 'SCOPE_REGIONAL' : 'SCOPE_INTERNATIONAL';
  let entry = `  { url: '${feed.url}', source: '${feed.source}', category: '${feed.category}', scope: ${scope}`;
  if (feed.region) {
    entry += `, region: '${feed.region}'`;
  }
  entry += ' },';
  return entry;
}

// Get existing URLs from newsAggregator.js
function getExistingUrls() {
  const content = fs.readFileSync(AGGREGATOR_FILE, 'utf-8');
  const urlRegex = /url:\s*['"]([^'"]+)['"]/g;
  const urls = new Set();
  let match;
  while ((match = urlRegex.exec(content)) !== null) {
    urls.add(match[1]);
  }
  return urls;
}

// Insert feeds into newsAggregator.js
function insertFeeds(feedsCode) {
  let content = fs.readFileSync(AGGREGATOR_FILE, 'utf-8');

  // Find the end of RSS_SOURCES array - look for the closing ];
  // We need to find the RSS_SOURCES = [ and then its matching ];
  const rssSourcesStart = content.indexOf('const RSS_SOURCES = [');
  if (rssSourcesStart === -1) {
    throw new Error('Could not find RSS_SOURCES array in newsAggregator.js');
  }

  // Find the closing ]; for RSS_SOURCES
  // Count brackets to find the matching close
  let bracketCount = 0;
  let inArray = false;
  let insertPosition = -1;

  for (let i = rssSourcesStart; i < content.length; i++) {
    if (content[i] === '[') {
      bracketCount++;
      inArray = true;
    } else if (content[i] === ']') {
      bracketCount--;
      if (inArray && bracketCount === 0) {
        // Found the closing bracket
        insertPosition = i;
        break;
      }
    }
  }

  if (insertPosition === -1) {
    throw new Error('Could not find end of RSS_SOURCES array');
  }

  // Insert before the closing ];
  const before = content.slice(0, insertPosition);
  const after = content.slice(insertPosition);

  // Add newlines for formatting
  const newContent = before + '\n' + feedsCode + '\n' + after;

  // Backup original file
  const backupFile = AGGREGATOR_FILE + '.backup';
  fs.writeFileSync(backupFile, content);
  console.log(`\nBackup saved to: ${backupFile}`);

  // Write new content
  fs.writeFileSync(AGGREGATOR_FILE, newContent);
  console.log(`Updated: ${AGGREGATOR_FILE}`);

  return true;
}

// Ask user for confirmation
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

// Main function
async function main() {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║      RSS Feed Import Script           ║');
  console.log('╚═══════════════════════════════════════╝\n');

  // Check if import file exists
  if (!fs.existsSync(IMPORT_FILE)) {
    console.log('Creating import file at:', IMPORT_FILE);
    fs.writeFileSync(IMPORT_FILE, '# Paste your RSS URLs here\n');
    console.log('Please paste your URLs into the file and run this script again.');
    return;
  }

  // Read import file
  const content = fs.readFileSync(IMPORT_FILE, 'utf-8');
  const lines = content.split('\n');

  console.log(`Reading from: ${IMPORT_FILE}`);
  console.log(`Found ${lines.length} lines\n`);

  // Get existing URLs to avoid duplicates
  const existingUrls = getExistingUrls();
  console.log(`Found ${existingUrls.size} existing feeds in newsAggregator.js\n`);

  // Parse all lines
  const feeds = [];
  const seenUrls = new Set();
  let duplicates = 0;
  let alreadyExists = 0;

  for (const line of lines) {
    const feed = parseLine(line);
    if (feed) {
      if (seenUrls.has(feed.url)) {
        duplicates++;
        continue;
      }
      if (existingUrls.has(feed.url)) {
        alreadyExists++;
        continue;
      }
      seenUrls.add(feed.url);
      feeds.push(feed);
    }
  }

  console.log(`Results:`);
  console.log(`  ✓ ${feeds.length} new feeds to add`);
  console.log(`  ⊘ ${duplicates} duplicates in input (skipped)`);
  console.log(`  ⊘ ${alreadyExists} already exist in newsAggregator.js (skipped)\n`);

  if (feeds.length === 0) {
    console.log('No new URLs to add.');
    return;
  }

  // Group by region for organized output
  const byRegion = {};
  for (const feed of feeds) {
    const key = feed.country || feed.region || 'UNSPECIFIED';
    if (!byRegion[key]) byRegion[key] = [];
    byRegion[key].push(feed);
  }

  // Generate code
  let feedsCode = `  // ============================================\n`;
  feedsCode += `  // IMPORTED FEEDS - ${new Date().toISOString().split('T')[0]}\n`;
  feedsCode += `  // ${feeds.length} feeds added\n`;
  feedsCode += `  // ============================================\n`;

  for (const [group, groupFeeds] of Object.entries(byRegion)) {
    feedsCode += `\n  // --- ${group} (${groupFeeds.length} feeds) ---\n`;

    // Group by category within region
    const byCategory = {};
    for (const feed of groupFeeds) {
      if (!byCategory[feed.category]) byCategory[feed.category] = [];
      byCategory[feed.category].push(feed);
    }

    for (const [cat, catFeeds] of Object.entries(byCategory)) {
      feedsCode += `  // ${cat}\n`;
      for (const feed of catFeeds) {
        feedsCode += generateFeedEntry(feed) + '\n';
      }
    }
  }

  // Show preview
  console.log('─'.repeat(60));
  console.log('PREVIEW (first 30 entries):');
  console.log('─'.repeat(60));
  const previewLines = feedsCode.split('\n').slice(0, 35);
  console.log(previewLines.join('\n'));
  if (feedsCode.split('\n').length > 35) {
    console.log(`... and ${feedsCode.split('\n').length - 35} more lines`);
  }
  console.log('─'.repeat(60));

  // Ask for confirmation
  const answer = await askConfirmation(`\nAdd ${feeds.length} feeds to newsAggregator.js? (yes/no): `);

  if (answer === 'yes' || answer === 'y') {
    try {
      insertFeeds(feedsCode);
      console.log(`\n✓ Successfully added ${feeds.length} feeds!`);

      // Clear the import file
      const clearAnswer = await askConfirmation('\nClear rss-import.txt for next batch? (yes/no): ');
      if (clearAnswer === 'yes' || clearAnswer === 'y') {
        fs.writeFileSync(IMPORT_FILE, '# Paste your RSS URLs here\n# Run: node server/scripts/import-rss.js\n\n');
        console.log('✓ Import file cleared.');
      }

      console.log('\nDone! Restart your server to use the new feeds.');
    } catch (error) {
      console.error('\n✗ Error:', error.message);
    }
  } else {
    console.log('\nCancelled. No changes made.');
  }
}

main().catch(console.error);
