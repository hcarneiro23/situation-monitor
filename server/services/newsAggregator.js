import Parser from 'rss-parser';
import axios from 'axios';
import NodeCache from 'node-cache';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; SituationMonitor/1.0)'
  },
  customFields: {
    item: [
      ['media:content', 'media'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['enclosure', 'enclosure'],
      ['content:encoded', 'contentEncoded'],
    ]
  }
});

// Extract image URL from RSS item
function extractImageUrl(item) {
  // Try media:content
  if (item.media && item.media.$) {
    const url = item.media.$.url;
    if (url && url.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
      return url;
    }
  }

  // Try media:thumbnail
  if (item.mediaThumbnail && item.mediaThumbnail.$) {
    return item.mediaThumbnail.$.url;
  }

  // Try enclosure
  if (item.enclosure && item.enclosure.url) {
    const url = item.enclosure.url;
    if (url && (item.enclosure.type?.startsWith('image/') || url.match(/\.(jpg|jpeg|png|gif|webp)/i))) {
      return url;
    }
  }

  // Try to extract from content:encoded
  if (item.contentEncoded) {
    const imgMatch = item.contentEncoded.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
      return imgMatch[1];
    }
  }

  // Try to extract from content
  if (item.content) {
    const imgMatch = item.content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
      return imgMatch[1];
    }
  }

  return null;
}

const cache = new NodeCache({ stdTTL: 300 }); // 5 minute cache

// Scope levels for news
const SCOPE_INTERNATIONAL = 'international';
const SCOPE_REGIONAL = 'regional';
const SCOPE_LOCAL = 'local';

// Real RSS feeds for geopolitical and financial news
const RSS_SOURCES = [
  // ============================================
  // INTERNATIONAL NEWS (Global Coverage)
  // ============================================

  // Major Wire Services
  { url: 'https://feeds.reuters.com/reuters/worldNews', source: 'Reuters', category: 'world', scope: SCOPE_INTERNATIONAL },
  { url: 'https://feeds.reuters.com/reuters/businessNews', source: 'Reuters', category: 'business', scope: SCOPE_INTERNATIONAL },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC', category: 'world', scope: SCOPE_INTERNATIONAL },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', source: 'BBC', category: 'business', scope: SCOPE_INTERNATIONAL },
  { url: 'https://rss.app/feeds/v1.1/apnews.com.xml', source: 'AP News', category: 'world', scope: SCOPE_INTERNATIONAL },

  // Financial & Economic
  { url: 'https://feeds.bloomberg.com/markets/news.rss', source: 'Bloomberg', category: 'markets', scope: SCOPE_INTERNATIONAL },
  { url: 'https://www.ft.com/rss/home', source: 'Financial Times', category: 'business', scope: SCOPE_INTERNATIONAL },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', source: 'MarketWatch', category: 'markets', scope: SCOPE_INTERNATIONAL },
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', source: 'CNBC', category: 'markets', scope: SCOPE_INTERNATIONAL },
  { url: 'https://www.cnbc.com/id/10001147/device/rss/rss.html', source: 'CNBC', category: 'economy', scope: SCOPE_INTERNATIONAL },
  { url: 'https://finance.yahoo.com/news/rssindex', source: 'Yahoo Finance', category: 'markets', scope: SCOPE_INTERNATIONAL },
  { url: 'https://www.economist.com/finance-and-economics/rss.xml', source: 'Economist', category: 'economy', scope: SCOPE_INTERNATIONAL },
  { url: 'https://www.economist.com/international/rss.xml', source: 'Economist', category: 'world', scope: SCOPE_INTERNATIONAL },
  { url: 'https://feeds.wsj.com/xml/rss/3_7085.xml', source: 'WSJ', category: 'world', scope: SCOPE_INTERNATIONAL },
  { url: 'https://feeds.wsj.com/xml/rss/3_7014.xml', source: 'WSJ', category: 'markets', scope: SCOPE_INTERNATIONAL },

  // Geopolitical Focus
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera', category: 'world', scope: SCOPE_INTERNATIONAL },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', source: 'NYT', category: 'world', scope: SCOPE_INTERNATIONAL },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml', source: 'NYT', category: 'politics', scope: SCOPE_INTERNATIONAL },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', source: 'NYT', category: 'business', scope: SCOPE_INTERNATIONAL },
  { url: 'https://www.theguardian.com/world/rss', source: 'Guardian', category: 'world', scope: SCOPE_INTERNATIONAL },
  { url: 'https://www.politico.com/rss/politicopicks.xml', source: 'Politico', category: 'politics', scope: SCOPE_INTERNATIONAL },

  // Policy & Think Tanks
  { url: 'https://www.brookings.edu/feed/', source: 'Brookings', category: 'policy', scope: SCOPE_INTERNATIONAL },
  { url: 'https://foreignpolicy.com/feed/', source: 'Foreign Policy', category: 'geopolitics', scope: SCOPE_INTERNATIONAL },
  { url: 'https://www.cfr.org/rss.xml', source: 'CFR', category: 'geopolitics', scope: SCOPE_INTERNATIONAL },
  { url: 'https://www.csis.org/feeds/all', source: 'CSIS', category: 'security', scope: SCOPE_INTERNATIONAL },
  { url: 'https://warontherocks.com/feed/', source: 'War on the Rocks', category: 'security', scope: SCOPE_INTERNATIONAL },
  { url: 'https://carnegieendowment.org/rss/solr/?fa=experts', source: 'Carnegie', category: 'policy', scope: SCOPE_INTERNATIONAL },
  { url: 'https://www.atlanticcouncil.org/feed/', source: 'Atlantic Council', category: 'geopolitics', scope: SCOPE_INTERNATIONAL },

  // Commodities & Energy
  { url: 'https://oilprice.com/rss/main', source: 'OilPrice', category: 'commodities', scope: SCOPE_INTERNATIONAL },
  { url: 'https://www.spglobal.com/commodityinsights/en/rss-feed/commodities', source: 'S&P Global', category: 'commodities', scope: SCOPE_INTERNATIONAL },
  { url: 'https://www.mining.com/feed/', source: 'Mining.com', category: 'commodities', scope: SCOPE_INTERNATIONAL },

  // Defense & Security
  { url: 'https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml', source: 'Defense News', category: 'defense', scope: SCOPE_INTERNATIONAL },
  { url: 'https://breakingdefense.com/feed/', source: 'Breaking Defense', category: 'defense', scope: SCOPE_INTERNATIONAL },
  { url: 'https://www.janes.com/feeds/news', source: 'Janes', category: 'defense', scope: SCOPE_INTERNATIONAL },

  // Central Banks & Monetary
  { url: 'https://www.centralbanking.com/rss', source: 'Central Banking', category: 'monetary', scope: SCOPE_INTERNATIONAL },

  // ============================================
  // REGIONAL NEWS (Continent/Region Coverage)
  // ============================================

  // Europe
  { url: 'https://www.politico.eu/feed/', source: 'Politico EU', category: 'europe', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'https://www.dw.com/en/top-stories/rss-12229', source: 'DW', category: 'europe', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'https://www.france24.com/en/rss', source: 'France24', category: 'europe', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'https://www.euronews.com/rss', source: 'Euronews', category: 'europe', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'https://www.thelocal.com/feed/', source: 'The Local EU', category: 'europe', scope: SCOPE_REGIONAL, region: 'europe' },

  // Middle East
  { url: 'https://www.middleeasteye.net/rss', source: 'Middle East Eye', category: 'middle_east', scope: SCOPE_REGIONAL, region: 'middle_east' },
  { url: 'https://www.timesofisrael.com/feed/', source: 'Times of Israel', category: 'middle_east', scope: SCOPE_REGIONAL, region: 'middle_east' },
  { url: 'https://english.alarabiya.net/tools/rss', source: 'Al Arabiya', category: 'middle_east', scope: SCOPE_REGIONAL, region: 'middle_east' },
  { url: 'https://www.arabnews.com/rss.xml', source: 'Arab News', category: 'middle_east', scope: SCOPE_REGIONAL, region: 'middle_east' },
  { url: 'https://gulfnews.com/rss', source: 'Gulf News', category: 'middle_east', scope: SCOPE_REGIONAL, region: 'middle_east' },

  // Asia - East
  { url: 'https://www.scmp.com/rss/91/feed', source: 'SCMP', category: 'asia', scope: SCOPE_REGIONAL, region: 'east_asia' },
  { url: 'https://asia.nikkei.com/rss/feed/nar', source: 'Nikkei Asia', category: 'asia', scope: SCOPE_REGIONAL, region: 'east_asia' },
  { url: 'https://www.japantimes.co.jp/feed/', source: 'Japan Times', category: 'asia', scope: SCOPE_REGIONAL, region: 'east_asia' },
  { url: 'https://www.koreaherald.com/rss', source: 'Korea Herald', category: 'asia', scope: SCOPE_REGIONAL, region: 'east_asia' },
  { url: 'https://www.taipeitimes.com/xml/index.rss', source: 'Taipei Times', category: 'asia', scope: SCOPE_REGIONAL, region: 'east_asia' },

  // Asia - Southeast
  { url: 'https://www.straitstimes.com/news/world/rss.xml', source: 'Straits Times', category: 'asia', scope: SCOPE_REGIONAL, region: 'southeast_asia' },
  { url: 'https://www.bangkokpost.com/rss/data/topstories.xml', source: 'Bangkok Post', category: 'asia', scope: SCOPE_REGIONAL, region: 'southeast_asia' },
  { url: 'https://www.channelnewsasia.com/rssfeeds/8395986', source: 'CNA', category: 'asia', scope: SCOPE_REGIONAL, region: 'southeast_asia' },
  { url: 'https://e.vnexpress.net/rss/news.rss', source: 'VnExpress', category: 'asia', scope: SCOPE_REGIONAL, region: 'southeast_asia' },
  { url: 'https://www.thejakartapost.com/feed', source: 'Jakarta Post', category: 'asia', scope: SCOPE_REGIONAL, region: 'southeast_asia' },

  // Asia - South
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms', source: 'Times of India', category: 'asia', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'https://www.hindustantimes.com/feeds/rss/world-news/rssfeed.xml', source: 'Hindustan Times', category: 'asia', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'https://www.dawn.com/feeds/home', source: 'Dawn', category: 'asia', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'https://bdnews24.com/feed/en/', source: 'bdnews24', category: 'asia', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'https://kathmandupost.com/rss', source: 'Kathmandu Post', category: 'asia', scope: SCOPE_REGIONAL, region: 'south_asia' },

  // Africa
  { url: 'https://mg.co.za/feed/', source: 'Mail & Guardian', category: 'africa', scope: SCOPE_REGIONAL, region: 'africa' },
  { url: 'https://www.news24.com/topstories/rss', source: 'News24 SA', category: 'africa', scope: SCOPE_REGIONAL, region: 'africa' },
  { url: 'https://www.dailymaverick.co.za/feed/', source: 'Daily Maverick', category: 'africa', scope: SCOPE_REGIONAL, region: 'africa' },
  { url: 'https://www.theeastafrican.co.ke/tea/feed', source: 'East African', category: 'africa', scope: SCOPE_REGIONAL, region: 'africa' },
  { url: 'https://guardian.ng/feed/', source: 'Guardian Nigeria', category: 'africa', scope: SCOPE_REGIONAL, region: 'africa' },
  { url: 'https://www.africanews.com/feed/', source: 'Africanews', category: 'africa', scope: SCOPE_REGIONAL, region: 'africa' },

  // Latin America
  { url: 'https://www.batimes.com.ar/feed', source: 'Buenos Aires Times', category: 'latam', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://riotimesonline.com/feed/', source: 'Rio Times', category: 'latam', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://mexiconewsdaily.com/feed/', source: 'Mexico News Daily', category: 'latam', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://www.ticotimes.net/feed', source: 'Tico Times', category: 'latam', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://colombiareports.com/feed/', source: 'Colombia Reports', category: 'latam', scope: SCOPE_REGIONAL, region: 'latin_america' },

  // Oceania
  { url: 'https://www.abc.net.au/news/feed/51120/rss.xml', source: 'ABC Australia', category: 'oceania', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'https://www.smh.com.au/rss/feed.xml', source: 'Sydney Morning Herald', category: 'oceania', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/curated/78/', source: 'NZ Herald', category: 'oceania', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'https://www.stuff.co.nz/rss', source: 'Stuff NZ', category: 'oceania', scope: SCOPE_REGIONAL, region: 'oceania' },

  // North America (Regional)
  { url: 'https://www.cbc.ca/webfeed/rss/rss-topstories', source: 'CBC', category: 'north_america', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://globalnews.ca/feed/', source: 'Global News CA', category: 'north_america', scope: SCOPE_REGIONAL, region: 'north_america' },

  // ============================================
  // LOCAL NEWS (City/Metro Coverage)
  // ============================================

  // United States - Major Cities
  { url: 'https://gothamist.com/feed', source: 'Gothamist', category: 'local', scope: SCOPE_LOCAL, cities: ['new york', 'nyc', 'manhattan', 'brooklyn'] },
  { url: 'https://www.nydailynews.com/feed/', source: 'NY Daily News', category: 'local', scope: SCOPE_LOCAL, cities: ['new york', 'nyc', 'manhattan', 'brooklyn'] },
  { url: 'https://www.amny.com/feed/', source: 'amNewYork', category: 'local', scope: SCOPE_LOCAL, cities: ['new york', 'nyc', 'manhattan', 'brooklyn'] },
  { url: 'https://www.latimes.com/local/rss2.0.xml', source: 'LA Times Local', category: 'local', scope: SCOPE_LOCAL, cities: ['los angeles', 'la', 'hollywood', 'beverly hills'] },
  { url: 'https://laist.com/feed', source: 'LAist', category: 'local', scope: SCOPE_LOCAL, cities: ['los angeles', 'la', 'hollywood', 'beverly hills'] },
  { url: 'https://chicago.suntimes.com/rss/index.xml', source: 'Chicago Sun-Times', category: 'local', scope: SCOPE_LOCAL, cities: ['chicago'] },
  { url: 'https://blockclubchicago.org/feed/', source: 'Block Club Chicago', category: 'local', scope: SCOPE_LOCAL, cities: ['chicago'] },
  { url: 'https://www.houstonchronicle.com/rss/feed/Houston-News-702.php', source: 'Houston Chronicle', category: 'local', scope: SCOPE_LOCAL, cities: ['houston'] },
  { url: 'https://www.dallasnews.com/feed/', source: 'Dallas Morning News', category: 'local', scope: SCOPE_LOCAL, cities: ['dallas', 'fort worth', 'dfw'] },
  { url: 'https://www.miamiherald.com/latest-news/feed/', source: 'Miami Herald', category: 'local', scope: SCOPE_LOCAL, cities: ['miami'] },
  { url: 'https://www.sfchronicle.com/feed/', source: 'SF Chronicle', category: 'local', scope: SCOPE_LOCAL, cities: ['san francisco', 'sf', 'bay area'] },
  { url: 'https://sfist.com/feed/', source: 'SFist', category: 'local', scope: SCOPE_LOCAL, cities: ['san francisco', 'sf', 'bay area'] },
  { url: 'https://www.seattletimes.com/feed/', source: 'Seattle Times', category: 'local', scope: SCOPE_LOCAL, cities: ['seattle'] },
  { url: 'https://www.denverpost.com/feed/', source: 'Denver Post', category: 'local', scope: SCOPE_LOCAL, cities: ['denver'] },
  { url: 'https://www.bostonglobe.com/rss/feed/', source: 'Boston Globe', category: 'local', scope: SCOPE_LOCAL, cities: ['boston'] },
  { url: 'https://www.phillymag.com/feed/', source: 'Philadelphia Magazine', category: 'local', scope: SCOPE_LOCAL, cities: ['philadelphia', 'philly'] },
  { url: 'https://dcist.com/feed/', source: 'DCist', category: 'local', scope: SCOPE_LOCAL, cities: ['washington dc', 'dc', 'washington'] },
  { url: 'https://www.washingtonian.com/feed/', source: 'Washingtonian', category: 'local', scope: SCOPE_LOCAL, cities: ['washington dc', 'dc', 'washington'] },
  { url: 'https://www.atlantamagazine.com/feed/', source: 'Atlanta Magazine', category: 'local', scope: SCOPE_LOCAL, cities: ['atlanta'] },
  { url: 'https://www.bizjournals.com/atlanta/feed/headlines/Atlanta_Business_Chronicle', source: 'Atlanta Business Chronicle', category: 'local', scope: SCOPE_LOCAL, cities: ['atlanta'] },

  // Europe - Major Cities
  { url: 'https://www.timeout.com/london/rss', source: 'Time Out London', category: 'local', scope: SCOPE_LOCAL, cities: ['london'] },
  { url: 'https://www.standard.co.uk/rss', source: 'Evening Standard', category: 'local', scope: SCOPE_LOCAL, cities: ['london'] },
  { url: 'https://www.cityam.com/feed/', source: 'City A.M.', category: 'local', scope: SCOPE_LOCAL, cities: ['london'] },
  { url: 'https://www.thelocal.fr/feed/', source: 'The Local France', category: 'local', scope: SCOPE_LOCAL, cities: ['paris'] },
  { url: 'https://www.timeout.com/paris/en/rss', source: 'Time Out Paris', category: 'local', scope: SCOPE_LOCAL, cities: ['paris'] },
  { url: 'https://www.thelocal.de/feed/', source: 'The Local Germany', category: 'local', scope: SCOPE_LOCAL, cities: ['berlin', 'munich', 'frankfurt', 'hamburg'] },
  { url: 'https://www.exberliner.com/feed/', source: 'Exberliner', category: 'local', scope: SCOPE_LOCAL, cities: ['berlin'] },
  { url: 'https://www.thelocal.es/feed/', source: 'The Local Spain', category: 'local', scope: SCOPE_LOCAL, cities: ['madrid', 'barcelona'] },
  { url: 'https://www.thelocal.it/feed/', source: 'The Local Italy', category: 'local', scope: SCOPE_LOCAL, cities: ['rome', 'milan'] },
  { url: 'https://www.thelocal.nl/feed/', source: 'The Local Netherlands', category: 'local', scope: SCOPE_LOCAL, cities: ['amsterdam', 'rotterdam', 'the hague'] },
  { url: 'https://www.dutchnews.nl/feed/', source: 'Dutch News', category: 'local', scope: SCOPE_LOCAL, cities: ['amsterdam', 'rotterdam', 'the hague'] },
  { url: 'https://www.thelocal.se/feed/', source: 'The Local Sweden', category: 'local', scope: SCOPE_LOCAL, cities: ['stockholm', 'gothenburg', 'malmo'] },
  { url: 'https://www.thelocal.dk/feed/', source: 'The Local Denmark', category: 'local', scope: SCOPE_LOCAL, cities: ['copenhagen'] },
  { url: 'https://www.irishtimes.com/cmlink/the-irish-times-news-1.1319192', source: 'Irish Times', category: 'local', scope: SCOPE_LOCAL, cities: ['dublin'] },
  { url: 'https://www.swissinfo.ch/eng/rss', source: 'Swissinfo', category: 'local', scope: SCOPE_LOCAL, cities: ['zurich', 'geneva', 'bern'] },
  { url: 'https://www.thelocal.at/feed/', source: 'The Local Austria', category: 'local', scope: SCOPE_LOCAL, cities: ['vienna'] },
  { url: 'https://www.portugal-news.com/feed/', source: 'Portugal News', category: 'local', scope: SCOPE_LOCAL, cities: ['lisbon', 'porto'] },
  { url: 'https://www.praguemorning.cz/feed/', source: 'Prague Morning', category: 'local', scope: SCOPE_LOCAL, cities: ['prague'] },
  { url: 'https://budapestbeacon.com/feed/', source: 'Budapest Beacon', category: 'local', scope: SCOPE_LOCAL, cities: ['budapest'] },
  { url: 'https://polandin.com/feed', source: 'Polandin', category: 'local', scope: SCOPE_LOCAL, cities: ['warsaw', 'krakow'] },

  // Asia - Major Cities
  { url: 'https://www.timeout.com/tokyo/rss', source: 'Time Out Tokyo', category: 'local', scope: SCOPE_LOCAL, cities: ['tokyo'] },
  { url: 'https://www.timeout.com/hong-kong/rss', source: 'Time Out Hong Kong', category: 'local', scope: SCOPE_LOCAL, cities: ['hong kong'] },
  { url: 'https://www.timeout.com/singapore/rss', source: 'Time Out Singapore', category: 'local', scope: SCOPE_LOCAL, cities: ['singapore'] },
  { url: 'https://coconuts.co/bangkok/feed/', source: 'Coconuts Bangkok', category: 'local', scope: SCOPE_LOCAL, cities: ['bangkok'] },
  { url: 'https://coconuts.co/singapore/feed/', source: 'Coconuts Singapore', category: 'local', scope: SCOPE_LOCAL, cities: ['singapore'] },
  { url: 'https://coconuts.co/hongkong/feed/', source: 'Coconuts Hong Kong', category: 'local', scope: SCOPE_LOCAL, cities: ['hong kong'] },
  { url: 'https://coconuts.co/jakarta/feed/', source: 'Coconuts Jakarta', category: 'local', scope: SCOPE_LOCAL, cities: ['jakarta'] },
  { url: 'https://coconuts.co/manila/feed/', source: 'Coconuts Manila', category: 'local', scope: SCOPE_LOCAL, cities: ['manila'] },
  { url: 'https://mumbaimirror.indiatimes.com/rssfeedstopstories.cms', source: 'Mumbai Mirror', category: 'local', scope: SCOPE_LOCAL, cities: ['mumbai', 'bombay'] },
  { url: 'https://bangaloremirror.indiatimes.com/rssfeedstopstories.cms', source: 'Bangalore Mirror', category: 'local', scope: SCOPE_LOCAL, cities: ['bangalore', 'bengaluru'] },
  { url: 'https://delhincr.indiatimes.com/rssfeedstopstories.cms', source: 'Delhi Mirror', category: 'local', scope: SCOPE_LOCAL, cities: ['delhi', 'new delhi'] },
  { url: 'https://www.timeout.com/dubai/rss', source: 'Time Out Dubai', category: 'local', scope: SCOPE_LOCAL, cities: ['dubai'] },
  { url: 'https://whatson.ae/feed/', source: 'WhatsOn Dubai', category: 'local', scope: SCOPE_LOCAL, cities: ['dubai', 'abu dhabi'] },
  { url: 'https://www.timeout.com/kuala-lumpur/rss', source: 'Time Out KL', category: 'local', scope: SCOPE_LOCAL, cities: ['kuala lumpur', 'kl'] },
  { url: 'https://www.timeout.com/seoul/rss', source: 'Time Out Seoul', category: 'local', scope: SCOPE_LOCAL, cities: ['seoul'] },

  // Latin America - Major Cities
  { url: 'https://www.timeout.com/mexico-city/rss', source: 'Time Out Mexico City', category: 'local', scope: SCOPE_LOCAL, cities: ['mexico city', 'cdmx'] },
  { url: 'https://www.timeout.com/sao-paulo/rss', source: 'Time Out Sao Paulo', category: 'local', scope: SCOPE_LOCAL, cities: ['sao paulo', 'são paulo'] },
  { url: 'https://www.timeout.com/buenos-aires/rss', source: 'Time Out Buenos Aires', category: 'local', scope: SCOPE_LOCAL, cities: ['buenos aires'] },
  { url: 'https://thebogotapost.com/feed/', source: 'Bogota Post', category: 'local', scope: SCOPE_LOCAL, cities: ['bogota', 'bogotá'] },
  { url: 'https://santiagotimes.cl/feed/', source: 'Santiago Times', category: 'local', scope: SCOPE_LOCAL, cities: ['santiago'] },
  { url: 'https://www.peruthisweek.com/feed/', source: 'Peru This Week', category: 'local', scope: SCOPE_LOCAL, cities: ['lima'] },

  // Oceania - Major Cities
  { url: 'https://www.timeout.com/sydney/rss', source: 'Time Out Sydney', category: 'local', scope: SCOPE_LOCAL, cities: ['sydney'] },
  { url: 'https://www.timeout.com/melbourne/rss', source: 'Time Out Melbourne', category: 'local', scope: SCOPE_LOCAL, cities: ['melbourne'] },
  { url: 'https://www.brisbanetimes.com.au/rss/feed.xml', source: 'Brisbane Times', category: 'local', scope: SCOPE_LOCAL, cities: ['brisbane'] },
  { url: 'https://www.perthnow.com.au/news/rss', source: 'Perth Now', category: 'local', scope: SCOPE_LOCAL, cities: ['perth'] },
  { url: 'https://www.timeout.com/auckland/rss', source: 'Time Out Auckland', category: 'local', scope: SCOPE_LOCAL, cities: ['auckland'] },

  // Africa - Major Cities
  { url: 'https://www.iol.co.za/feed', source: 'IOL Cape Town', category: 'local', scope: SCOPE_LOCAL, cities: ['cape town'] },
  { url: 'https://www.citizen.co.za/feed/', source: 'The Citizen', category: 'local', scope: SCOPE_LOCAL, cities: ['johannesburg', 'joburg'] },
  { url: 'https://www.nation.co.ke/feed/', source: 'Daily Nation', category: 'local', scope: SCOPE_LOCAL, cities: ['nairobi'] },
  { url: 'https://www.monitor.co.ug/feed/', source: 'Daily Monitor', category: 'local', scope: SCOPE_LOCAL, cities: ['kampala'] },
  { url: 'https://egyptindependent.com/feed/', source: 'Egypt Independent', category: 'local', scope: SCOPE_LOCAL, cities: ['cairo'] },
  { url: 'https://www.moroccoworldnews.com/feed/', source: 'Morocco World News', category: 'local', scope: SCOPE_LOCAL, cities: ['casablanca', 'rabat', 'marrakech'] },

  // Canada - Major Cities
  { url: 'https://www.thestar.com/search/?f=rss', source: 'Toronto Star', category: 'local', scope: SCOPE_LOCAL, cities: ['toronto'] },
  { url: 'https://www.blogto.com/feed/', source: 'BlogTO', category: 'local', scope: SCOPE_LOCAL, cities: ['toronto'] },
  { url: 'https://montrealgazette.com/feed/', source: 'Montreal Gazette', category: 'local', scope: SCOPE_LOCAL, cities: ['montreal'] },
  { url: 'https://www.vancouverisawesome.com/feed/', source: 'Vancouver Is Awesome', category: 'local', scope: SCOPE_LOCAL, cities: ['vancouver'] },
  { url: 'https://dailyhive.com/vancouver/feed', source: 'Daily Hive Vancouver', category: 'local', scope: SCOPE_LOCAL, cities: ['vancouver'] },
  { url: 'https://edmontonjournal.com/feed/', source: 'Edmonton Journal', category: 'local', scope: SCOPE_LOCAL, cities: ['edmonton'] },
  { url: 'https://calgaryherald.com/feed/', source: 'Calgary Herald', category: 'local', scope: SCOPE_LOCAL, cities: ['calgary'] },
  { url: 'https://ottawacitizen.com/feed/', source: 'Ottawa Citizen', category: 'local', scope: SCOPE_LOCAL, cities: ['ottawa'] },

  // ============================================
  // BRAZIL - National & Regional News
  // ============================================

  // Major National Sources
  { url: 'https://feeds.feedburner.com/EstadaoRSS', source: 'Estadão', category: 'brazil', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://www1.folha.uol.com.br/feed/', source: 'Folha de S.Paulo', category: 'brazil', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://www.cnnbrasil.com.br/feed/', source: 'CNN Brasil', category: 'brazil', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://agenciabrasil.ebc.com.br/rss.xml', source: 'Agência Brasil', category: 'brazil', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://feeds.bbci.co.uk/portuguese/rss.xml', source: 'BBC Brasil', category: 'brazil', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://correiobraziliense.com.br/rss/', source: 'Correio Braziliense', category: 'brazil', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://correiodopovo.com.br/rss/', source: 'Correio do Povo', category: 'brazil', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://www.brasildefato.com.br/rss2.xml', source: 'Brasil de Fato', category: 'brazil', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://reporterbrasil.org.br/feed-rss/', source: 'Repórter Brasil', category: 'brazil', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://www.revistaforum.com.br/rss/', source: 'Revista Fórum', category: 'brazil', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://feeds.feedburner.com/pragmatismopolitico', source: 'Pragmatismo Político', category: 'brazil', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://brasilwire.com/feed', source: 'Brasil Wire', category: 'brazil', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://elpais.com/arc/outboundfeeds/rss/tags_slug/brasil-a/?outputType=xml', source: 'El País Brasil', category: 'brazil', scope: SCOPE_REGIONAL, region: 'latin_america' },

  // UOL Network
  { url: 'https://rss.uol.com.br/feed', source: 'UOL', category: 'brazil', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://rss.uol.com.br/economia.xml', source: 'UOL Economia', category: 'economy', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://rss.uol.com.br/politica.xml', source: 'UOL Política', category: 'politics', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://rss.uol.com.br/tecnologia.xml', source: 'UOL Tecnologia', category: 'technology', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://rss.uol.com.br/esporte.xml', source: 'UOL Esporte', category: 'sports', scope: SCOPE_REGIONAL, region: 'latin_america' },

  // Terra Network
  { url: 'https://rss.terra.com.br/feed', source: 'Terra', category: 'brazil', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://rss.terra.com.br/economia/feed.xml', source: 'Terra Economia', category: 'economy', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://rss.terra.com.br/politica/feed.xml', source: 'Terra Política', category: 'politics', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://rss.terra.com.br/tecnologia/feed.xml', source: 'Terra Tecnologia', category: 'technology', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://rss.terra.com.br/mundo/feed.xml', source: 'Terra Mundo', category: 'world', scope: SCOPE_REGIONAL, region: 'latin_america' },

  // Metrópoles Network
  { url: 'https://rss.metropoles.com/', source: 'Metrópoles', category: 'brazil', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://rss.metropoles.com/politica/feed', source: 'Metrópoles Política', category: 'politics', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://rss.metropoles.com/economia/feed', source: 'Metrópoles Economia', category: 'economy', scope: SCOPE_REGIONAL, region: 'latin_america' },

  // Tech & Finance Brazil
  { url: 'https://rss.tecmundo.com.br/feed', source: 'TecMundo', category: 'technology', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://olhardigital.com.br/rss', source: 'Olhar Digital', category: 'technology', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://br.investing.com/rss/news.rss', source: 'Investing.com Brasil', category: 'markets', scope: SCOPE_REGIONAL, region: 'latin_america' },

  // Other Networks
  { url: 'https://rss.r7.com/', source: 'R7', category: 'brazil', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://rss.band.uol.com.br/xml/portalbandnoticias.xml', source: 'Band', category: 'brazil', scope: SCOPE_REGIONAL, region: 'latin_america' },

  // Gazeta do Povo Network
  { url: 'https://www.gazetadopovo.com.br/feed/rss/ultimas-noticias.xml', source: 'Gazeta do Povo', category: 'brazil', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://www.gazetadopovo.com.br/feed/rss/republica.xml', source: 'Gazeta República', category: 'politics', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://www.gazetadopovo.com.br/feed/rss/economia.xml', source: 'Gazeta Economia', category: 'economy', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://www.gazetadopovo.com.br/feed/rss/brasil.xml', source: 'Gazeta Brasil', category: 'brazil', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://www.gazetadopovo.com.br/feed/rss/mundo.xml', source: 'Gazeta Mundo', category: 'world', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://www.gazetadopovo.com.br/feed/rss/vida-e-cidadania.xml', source: 'Gazeta Vida', category: 'lifestyle', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://www.gazetadopovo.com.br/feed/rss/cultura.xml', source: 'Gazeta Cultura', category: 'culture', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://www.gazetadopovo.com.br/feed/rss/agronegocio.xml', source: 'Gazeta Agro', category: 'business', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://www.gazetadopovo.com.br/feed/rss/opiniao.xml', source: 'Gazeta Opinião', category: 'opinion', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://www.gazetadopovo.com.br/feed/rss/tudo-sobre/congresso-nacional.xml', source: 'Gazeta Congresso', category: 'politics', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://www.gazetadopovo.com.br/feed/rss/tudo-sobre/governo-federal.xml', source: 'Gazeta Governo', category: 'politics', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://www.gazetadopovo.com.br/feed/rss/tudo-sobre/stf.xml', source: 'Gazeta STF', category: 'politics', scope: SCOPE_REGIONAL, region: 'latin_america' },
  { url: 'https://www.gazetadopovo.com.br/feed/rss/parana.xml', source: 'Gazeta Paraná', category: 'local', scope: SCOPE_LOCAL, cities: ['curitiba', 'londrina', 'maringa', 'maringá', 'foz do iguacu', 'foz do iguaçu', 'parana', 'paraná'] },

  // Brazil - Local City News
  { url: 'https://jornaldebrasilia.com.br/feed', source: 'Jornal de Brasília', category: 'local', scope: SCOPE_LOCAL, cities: ['brasilia', 'brasília', 'distrito federal', 'df'] },
  { url: 'https://feeds.brazilnews.net/rss/2445.xml', source: 'Brazil News', category: 'local', scope: SCOPE_LOCAL, cities: ['sao paulo', 'são paulo', 'rio de janeiro', 'rio'] },

  // ============================================
  // USA - National & Network News
  // ============================================

  // Major Networks - Main Feeds
  { url: 'https://feeds.nbcnews.com/nbcnews/public/news', source: 'NBC News', category: 'usa', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://abcnews.go.com/abcnews/topstories', source: 'ABC News', category: 'usa', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://rss.cbsnews.com/rss/lineup', source: 'CBS News', category: 'usa', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://rss.cnn.com/rss/cnn_topstories.rss', source: 'CNN', category: 'usa', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://feeds.foxnews.com/foxnews/latest', source: 'Fox News', category: 'usa', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://www.npr.org/rss/rss.php?id=1001', source: 'NPR', category: 'usa', scope: SCOPE_REGIONAL, region: 'north_america' },

  // Major Newspapers
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', source: 'NYT', category: 'usa', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://www.washingtonpost.com/rss/', source: 'Washington Post', category: 'usa', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://rss.washingtontimes.com/rss/headlines.xml', source: 'Washington Times', category: 'usa', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://rssfeeds.usatoday.com/usatoday-NewsTopStories', source: 'USA Today', category: 'usa', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://www.usnews.com/rss/news', source: 'US News', category: 'usa', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://www.newsweek.com/rss', source: 'Newsweek', category: 'usa', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://nypost.com/feed', source: 'NY Post', category: 'usa', scope: SCOPE_REGIONAL, region: 'north_america' },

  // Digital / Online News
  { url: 'https://news.yahoo.com/rss/', source: 'Yahoo News', category: 'usa', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://www.vox.com/rss/index.xml', source: 'Vox', category: 'usa', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://www.huffpost.com/section/front-page/feed', source: 'HuffPost', category: 'usa', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://feeds2.feedburner.com/SlateMagazineMain', source: 'Slate', category: 'usa', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://www.theintercept.com/feed/', source: 'The Intercept', category: 'usa', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://feeds.feedburner.com/breitbart', source: 'Breitbart', category: 'usa', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://observer.com/feed', source: 'Observer', category: 'usa', scope: SCOPE_REGIONAL, region: 'north_america' },

  // Politics Focused
  { url: 'https://feeds.feedburner.com/politico-all', source: 'Politico', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://feeds.foxnews.com/foxnews/politics', source: 'Fox Politics', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://rssfeeds.abcnews.com/abcnews/politicsheadlines', source: 'ABC Politics', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://rssfeeds.nbcnews.com/nbcnews/public/politics', source: 'NBC Politics', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://feeds.huffpost.com/huffpost/politics', source: 'HuffPost Politics', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },

  // Business & Economy
  { url: 'https://rssfeeds.usatoday.com/usatoday-money-topstories', source: 'USA Today Money', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://rssfeeds.nbcnews.com/nbcnews/public/business', source: 'NBC Business', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://feeds.huffpost.com/huffpost/business', source: 'HuffPost Business', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://rssfeeds.bizjournals.com/bizj_us_news', source: 'BizJournals US', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://rssfeeds.bizjournals.com/bizj_national_news', source: 'BizJournals National', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },

  // Technology
  { url: 'https://feeds.foxnews.com/foxnews/tech', source: 'Fox Tech', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://rssfeeds.usatoday.com/usatoday-tech-topstories', source: 'USA Today Tech', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://rssfeeds.nbcnews.com/nbcnews/public/technology', source: 'NBC Tech', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://feeds.huffpost.com/huffpost/tech', source: 'HuffPost Tech', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },

  // Health & Science
  { url: 'https://feeds.foxnews.com/foxnews/health', source: 'Fox Health', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://feeds.foxnews.com/foxnews/science', source: 'Fox Science', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://rssfeeds.usatoday.com/usatoday-health-topstories', source: 'USA Today Health', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://rssfeeds.nbcnews.com/nbcnews/public/health', source: 'NBC Health', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },

  // World News (US perspective)
  { url: 'https://rssfeeds.abcnews.com/abcnews/worldnews', source: 'ABC World', category: 'world', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://rssfeeds.nbcnews.com/nbcnews/public/worldnews', source: 'NBC World', category: 'world', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://feeds.huffpost.com/huffpost/world-news', source: 'HuffPost World', category: 'world', scope: SCOPE_REGIONAL, region: 'north_america' },

  // Sports
  { url: 'https://feeds.foxnews.com/foxnews/sports', source: 'Fox Sports', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://rssfeeds.usatoday.com/usatoday-sports-topstories', source: 'USA Today Sports', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://rssfeeds.nbcnews.com/nbcnews/public/sports', source: 'NBC Sports', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://feeds.huffpost.com/huffpost/sports', source: 'HuffPost Sports', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },

  // Entertainment & Lifestyle
  { url: 'https://feeds.foxnews.com/foxnews/entertainment', source: 'Fox Entertainment', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://feeds.foxnews.com/foxnews/lifestyle', source: 'Fox Lifestyle', category: 'lifestyle', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://rssfeeds.usatoday.com/usatoday-life-topstories', source: 'USA Today Life', category: 'lifestyle', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://rssfeeds.usatoday.com/usatoday-entertainment-topstories', source: 'USA Today Entertainment', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://rssfeeds.nbcnews.com/nbcnews/public/entertainment', source: 'NBC Entertainment', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://feeds.huffpost.com/huffpost/entertainment', source: 'HuffPost Entertainment', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://feeds.huffpost.com/huffpost/lifestyle', source: 'HuffPost Lifestyle', category: 'lifestyle', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://feeds.huffpost.com/huffpost/arts-culture', source: 'HuffPost Arts', category: 'culture', scope: SCOPE_REGIONAL, region: 'north_america' },

  // Travel & Weather
  { url: 'https://rssfeeds.usatoday.com/usatoday-travel-topstories', source: 'USA Today Travel', category: 'travel', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://rssfeeds.usatoday.com/usatoday-weather-topstories', source: 'USA Today Weather', category: 'weather', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://rssfeeds.nbcnews.com/nbcnews/public/weather', source: 'NBC Weather', category: 'weather', scope: SCOPE_REGIONAL, region: 'north_america' },

  // US Government Sources
  { url: 'https://www.govinfo.gov/feeds/summary/latest.xml', source: 'GovInfo', category: 'government', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://www.govinfo.gov/feeds/collection/BILLS.xml', source: 'Congress Bills', category: 'government', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://www.govinfo.gov/feeds/collection/PLAW.xml', source: 'Public Laws', category: 'government', scope: SCOPE_REGIONAL, region: 'north_america' },

  // Reuters US
  { url: 'https://www.reuters.com/rssFeed/usNews', source: 'Reuters US', category: 'usa', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://www.reuters.com/rssFeed/technologyNews', source: 'Reuters Tech', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },

  // ============================================
  // USA - Local City News
  // ============================================

  // New York
  { url: 'https://gothamist.com/feed', source: 'Gothamist', category: 'local', scope: SCOPE_LOCAL, cities: ['new york', 'nyc', 'manhattan', 'brooklyn', 'queens', 'bronx'] },
  { url: 'https://www.newsday.com/rss/', source: 'Newsday', category: 'local', scope: SCOPE_LOCAL, cities: ['new york', 'nyc', 'long island'] },

  // California
  { url: 'https://www.latimes.com/local/rss2.0.xml', source: 'LA Times', category: 'local', scope: SCOPE_LOCAL, cities: ['los angeles', 'la', 'hollywood'] },
  { url: 'https://www.sfgate.com/rss/', source: 'SFGate', category: 'local', scope: SCOPE_LOCAL, cities: ['san francisco', 'sf', 'bay area'] },
  { url: 'https://www.mercurynews.com/feed', source: 'Mercury News', category: 'local', scope: SCOPE_LOCAL, cities: ['san jose', 'silicon valley', 'bay area'] },
  { url: 'https://www.sacbee.com/latest-news/feed/', source: 'Sacramento Bee', category: 'local', scope: SCOPE_LOCAL, cities: ['sacramento'] },

  // Texas
  { url: 'https://www.dallasnews.com/arcio/rss/category/news/?format=rss', source: 'Dallas Morning News', category: 'local', scope: SCOPE_LOCAL, cities: ['dallas', 'fort worth', 'dfw'] },
  { url: 'https://www.houstonchronicle.com/news/rss/', source: 'Houston Chronicle', category: 'local', scope: SCOPE_LOCAL, cities: ['houston'] },
  { url: 'https://www.startelegram.com/latest-news/rss.xml', source: 'Fort Worth Star-Telegram', category: 'local', scope: SCOPE_LOCAL, cities: ['fort worth', 'dallas', 'dfw'] },

  // Illinois
  { url: 'https://www.chicagotribune.com/arcio/rss/category/news/?query=&format=rss', source: 'Chicago Tribune', category: 'local', scope: SCOPE_LOCAL, cities: ['chicago'] },

  // Washington
  { url: 'https://seattletimes.com/rss/localnews', source: 'Seattle Times', category: 'local', scope: SCOPE_LOCAL, cities: ['seattle'] },

  // Colorado
  { url: 'https://www.denverpost.com/feed', source: 'Denver Post', category: 'local', scope: SCOPE_LOCAL, cities: ['denver'] },

  // Massachusetts
  { url: 'https://www.boston.com/feed', source: 'Boston.com', category: 'local', scope: SCOPE_LOCAL, cities: ['boston'] },

  // Florida
  { url: 'https://www.miamiherald.com/rss/', source: 'Miami Herald', category: 'local', scope: SCOPE_LOCAL, cities: ['miami'] },
  { url: 'https://www.orlandosentinel.com/news/orl-orlando-sentinel-news-rss-story.xml', source: 'Orlando Sentinel', category: 'local', scope: SCOPE_LOCAL, cities: ['orlando'] },

  // Pennsylvania
  { url: 'https://www.phillyvoice.com/feed', source: 'PhillyVoice', category: 'local', scope: SCOPE_LOCAL, cities: ['philadelphia', 'philly'] },

  // Ohio
  { url: 'https://www.cleveland.com/news/rss.xml', source: 'Cleveland.com', category: 'local', scope: SCOPE_LOCAL, cities: ['cleveland'] },

  // Minnesota
  { url: 'https://www.startribune.com/rss/?c=10&c=1&c=3&c=5&format=rss2.0', source: 'Star Tribune', category: 'local', scope: SCOPE_LOCAL, cities: ['minneapolis', 'st paul', 'twin cities'] },
  { url: 'https://www.twincities.com/feed/', source: 'Twin Cities', category: 'local', scope: SCOPE_LOCAL, cities: ['minneapolis', 'st paul', 'twin cities'] },

  // North Carolina
  { url: 'https://www.charlotteobserver.com/latest-news/rss.xml', source: 'Charlotte Observer', category: 'local', scope: SCOPE_LOCAL, cities: ['charlotte'] },

  // Georgia
  { url: 'https://www.ajc.com/rss/', source: 'Atlanta Journal-Constitution', category: 'local', scope: SCOPE_LOCAL, cities: ['atlanta'] },

  // Maryland
  { url: 'https://www.baltimoresun.com/feeds/', source: 'Baltimore Sun', category: 'local', scope: SCOPE_LOCAL, cities: ['baltimore'] },

  // ============================================
  // IMPORTED FEEDS - 2026-01-07
  // 883 feeds added
  // ============================================

  // --- US (333 feeds) ---
  // general
  { url: 'http://feeds.abcnews.com/abcnews/usheadlines', source: 'Abcnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.cnn.com/rss/cnn_topstories.rss', source: 'Cnn', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.cbsnews.com/latest/rss/main', source: 'Cbsnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.nytimes.com/services/xml/rss/nyt/National.xml', source: 'Nytimes', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://online.wsj.com/xml/rss/3_7085.xml', source: 'Online', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.csmonitor.com/feeds/usa', source: 'Csmonitor', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.nbcnews.com/feeds/topstories', source: 'Nbcnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.nbcnews.com/feeds/worldnews', source: 'Nbcnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.reuters.com/Reuters/domesticNews', source: 'Reuters', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://hosted.ap.org/lineups/USHEADS.rss', source: 'Hosted', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml', source: 'Bbci', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://news.yahoo.com/rss/us', source: 'Yahoo', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.news.yahoo.com/rss/world', source: 'News', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.newsweek.com/rss', source: 'Newsweek', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/thedailybeast/articles', source: 'Thedailybeast', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://qz.com/feed', source: 'Qz', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.politico.com/rss/politicopicks.xml', source: 'Politico', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.newyorker.com/feed/news', source: 'Newyorker', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/NationPBSNewsHour', source: 'NationPBSNewsHour', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/NewshourWorld', source: 'NewshourWorld', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.usnews.com/rss/news', source: 'Usnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.npr.org/rss/rss.php?id=1003', source: 'Npr', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.npr.org/rss/rss.php?id=1004', source: 'Npr', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/AtlanticNational', source: 'AtlanticNational', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/TheAtlanticWire', source: 'TheAtlanticWire', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.latimes.com/nation/rss2.0.xml', source: 'Latimes', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://api.breakingnews.com/api/v1/item/?format=rss', source: 'Breakingnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://news.vice.com/rss', source: 'Vice', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://talkingpointsmemo.com/feed/livewire', source: 'Talkingpointsmemo', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.salon.com/category/news/feed/rss/', source: 'Salon', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://time.com/newsfeed/feed/', source: 'Time', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.foxnews.com/foxnews/latest?format=xml', source: 'Foxnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://mashable.com/us-world/rss/', source: 'Mashable', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.politico.com/rss/Top10Blogs.xml', source: 'Politico', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.nbcnews.com/feeds/nbcpolitics', source: 'Nbcnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.foxnews.com/foxnews/politics', source: 'Foxnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.rollcall.com/rss/all_news.xml', source: 'Rollcall', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.rollcall.com/news/?zkDo=showRSS', source: 'Rollcall', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.washingtontimes.com/rss/headlines/news/politics/', source: 'Washingtontimes', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.usnews.com/blogrss/washington-whispers', source: 'Usnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.usnews.com/blogrss/Ken-Walshs-Washington', source: 'Usnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.usnews.com/blogrss/ballot-2014', source: 'Usnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.huffingtonpost.com/feeds/verticals/business/news.xml', source: 'Huffingtonpost', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.bbci.co.uk/news/health/rss.xml?edition=us', source: 'Bbci', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.abcnews.com/abcnews/healthheadlines', source: 'Abcnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.nbcnews.com/feeds/health', source: 'Nbcnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.nydailynews.com/lifestyle/health/index_rss.xml', source: 'Nydailynews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.usnews.com/rss/health?int=a7fe09', source: 'Usnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://news.yahoo.com/rss/health', source: 'Yahoo', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.healthcareitnews.com/home/feed', source: 'Healthcareitnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.sciencedaily.com/sciencedaily/top_news/top_health', source: 'Sciencedaily', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.self.com/feed/fitness-news/', source: 'Self', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.cpsc.gov/en/Newsroom/CPSC-RSS-Feed/Recalls-RSS/', source: 'Cpsc', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.medpagetoday.com/rss/Headlines.xml', source: 'Medpagetoday', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.medicalnewstoday.com/featurednews.xml', source: 'Medicalnewstoday', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.foxnews.com/foxnews/science', source: 'Foxnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.nbcnews.com/feeds/science', source: 'Nbcnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.bbci.co.uk/news/science_and_environment/rss.xml', source: 'Bbci', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.nasa.gov/rss/dyn/breaking_news.rss', source: 'Nasa', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.sciam.com/ScientificAmerican-News', source: 'Sciam', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://news.yahoo.com/rss/science', source: 'Yahoo', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://news.nationalgeographic.com/rss/index.rss', source: 'Nationalgeographic', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.foxnews.com/foxnews/sports', source: 'Foxnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://sports.espn.go.com/espn/rss/news', source: 'Sports', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://sports.yahoo.com/top/rss.xml', source: 'Sports', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.huffingtonpost.com/feeds/verticals/technology/news.xml', source: 'Huffingtonpost', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.foxnews.com/foxnews/tech', source: 'Foxnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.cnet.com/rss/news/', source: 'Cnet', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://recode.net/category/general/feed/', source: 'Recode', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.abcnews.com/abcnews/technologyheadlines', source: 'Abcnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.bbci.co.uk/news/technology/rss.xml', source: 'Bbci', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://techreport.com/news.rss', source: 'Techreport', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.nature.com/news/rss/news_s16', source: 'Nature', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.mtv.com/rss/news/news_full.jhtml', source: 'Mtv', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.rollingstone.com/news.rss', source: 'Rollingstone', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.cbsnews.com/latest/rss/entertainment', source: 'Cbsnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.abcnews.com/abcnews/entertainmentheadlines', source: 'Abcnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.nbcnews.com/feeds/todayentertainment', source: 'Nbcnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.hitfix.com/headlines.rss', source: 'Hitfix', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.people.com/web/people/rss/topheadlines/index.xml', source: 'People', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds2.feedburner.com/nmecom/rss/newsxml', source: 'Feeds2', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://news.yahoo.com/rss/entertainment', source: 'Yahoo', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.gamesradar.com/all-platforms/news/rss/', source: 'Gamesradar', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.webservice.techradar.com/us/rss/news/gaming', source: 'Webservice', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rssfeeds.usatoday.com/topgaming', source: 'Rssfeeds', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  // markets
  { url: 'http://content.usatoday.com/marketing/rss/rsstrans.aspx?feedId=news2', source: 'Content', category: 'markets', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://content.usatoday.com/marketing/rss/rsstrans.aspx?feedId=sports1', source: 'Content', category: 'markets', scope: SCOPE_REGIONAL, region: 'north_america' },
  // world
  { url: 'http://feeds.reuters.com/Reuters/worldNews', source: 'Reuters', category: 'world', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://hosted.ap.org/lineups/WORLDHEADS.rss', source: 'Hosted', category: 'world', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.huffingtonpost.com/feeds/verticals/world/index.xml', source: 'Huffingtonpost', category: 'world', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.theguardian.com/world/usa/rss', source: 'Theguardian', category: 'world', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.latimes.com/world/rss2.0.xml', source: 'Latimes', category: 'world', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.macworld.com/index.rss', source: 'Macworld', category: 'world', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.pcworld.com/index.rss', source: 'Pcworld', category: 'world', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.pcworld.com/column/game-on/index.rss', source: 'Pcworld', category: 'world', scope: SCOPE_REGIONAL, region: 'north_america' },
  // politics
  { url: 'http://www.politico.com/rss/magazine.xml', source: 'Politico', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.huffingtonpost.com/feeds/verticals/politics/index.xml', source: 'Huffingtonpost', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.cnn.com/rss/cnn_allpolitics.rss', source: 'Cnn', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.buzzfeed.com/politics.xml', source: 'Buzzfeed', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.washingtonpost.com/rss/rss_election-2012', source: 'Washingtonpost', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.nytimes.com/services/xml/rss/nyt/Politics.xml', source: 'Nytimes', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.nytimes.com/services/xml/rss/nyt/Upshot.xml', source: 'Nytimes', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://thecaucus.blogs.nytimes.com/feed/', source: 'Thecaucus', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.reuters.com/Reuters/PoliticsNews', source: 'Reuters', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://blogs.wsj.com/washwire/feed/?mod=WSJ_Politics%2520and%2520Policy', source: 'Blogs', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.reddit.com/r/politics/.rss', source: 'Reddit', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.dailykos.com/dailykos/index.xml', source: 'Dailykos', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.npr.org/rss/rss.php?id=1014', source: 'Npr', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.npr.org/rss/rss.php?id=5', source: 'Npr', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.rollcall.com/politics/archives/?zkDo=showRSS', source: 'Rollcall', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.rollcall.com/policy/archives/?zkDo=showRSS', source: 'Rollcall', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.nationaljournal.com/?rss=1', source: 'Nationaljournal', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.nationaljournal.com/white-house?rss=1', source: 'Nationaljournal', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.nationaljournal.com/congress?rss=1', source: 'Nationaljournal', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.nationaljournal.com/politics?rss=1', source: 'Nationaljournal', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.nationaljournal.com/congressional-connection?rss=1', source: 'Nationaljournal', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.thenation.com/rss/articles', source: 'Thenation', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.thenation.com/blogs/rss/politics', source: 'Thenation', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.thenation.com/blogs/rss/foreign-reporting', source: 'Thenation', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/realclearpolitics/qlMj', source: 'Realclearpolitics', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/BreitbartFeed', source: 'BreitbartFeed', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://dailycaller.com/section/politics/feed/', source: 'Dailycaller', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://www.nationalreview.com/rss.xml', source: 'Nationalreview', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/DrudgeReportFeed', source: 'DrudgeReportFeed', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.weeklystandard.com/rss/site.xml', source: 'Weeklystandard', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.slate.com/slate-101526', source: 'Slate', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/motherjones/Politics', source: 'Motherjones', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.newrepublic.com/taxonomy/term/17538/feed', source: 'Newrepublic', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://fivethirtyeight.com/politics/feed/', source: 'Fivethirtyeight', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.redstate.com/feed/', source: 'Redstate', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://humanevents.com/feed/', source: 'Humanevents', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://twitchy.com/category/us-politics/feed/', source: 'Twitchy', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://talkingpointsmemo.com/feed/all', source: 'Talkingpointsmemo', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://gamepolitics.com/feed/', source: 'Gamepolitics', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  // business
  { url: 'http://hosted2.ap.org/atom/APDEFAULT/f70471f764144b2fab526d39972d37b3', source: 'Hosted2', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://online.wsj.com/xml/rss/3_7014.xml', source: 'Online', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.nytimes.com/services/xml/rss/nyt/Business.xml', source: 'Nytimes', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.nytimes.com/services/xml/rss/nyt/Business.xml', source: 'Nytimes', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.reuters.com/reuters/businessNews', source: 'Reuters', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.washingtonpost.com/rss/rss_storyline', source: 'Washingtonpost', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.washingtonpost.com/rss/rss_wonkblog', source: 'Washingtonpost', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.economist.com/feeds/print-sections/77/business.xml', source: 'Economist', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.business-standard.com/rss/latest.rss', source: 'Business Standard', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.business-standard.com/rss/home_page_top_stories.rss', source: 'Business Standard', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.harvardbusiness.org/harvardbusiness?format=xml', source: 'Harvardbusiness', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://au.ibtimes.com/rss/articles/region/1.rss', source: 'Au', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.businessweek.com/search/rssfeed.htm', source: 'Businessweek', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.ft.com/rss/home/us', source: 'Ft', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.cnn.com/rss/edition_business.rss', source: 'Cnn', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.bloomberg.com/feed/podcast/law.xml', source: 'Bloomberg', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.latimes.com/business/technology/rss2.0.xml', source: 'Latimes', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.arstechnica.com/arstechnica/business', source: 'Arstechnica', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.washingtonpost.com/rss/business/technology', source: 'Washingtonpost', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  // health
  { url: 'http://www.health.harvard.edu/rss.php', source: 'Health', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.health.com/health/healthy-happy/feed', source: 'Health', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.cnn.com/rss/cnn_health.rss', source: 'Cnn', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.nytimes.com/services/xml/rss/nyt/Health.xml', source: 'Nytimes', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.forbes.com/health/feed2/', source: 'Forbes', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.reuters.com/reuters/healthNews', source: 'Reuters', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.chicagotribune.com/lifestyles/health/rss2.0.xml', source: 'Chicagotribune', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.huffingtonpost.com/c/35496/f/677071/index.rss', source: 'Huffingtonpost', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.theguardian.com/society/health/rss', source: 'Theguardian', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.menshealth.com/events-promotions/washpofeed', source: 'Menshealth', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.glamour.com/glamour/health_fitness', source: 'Glamour', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.newscientist.com/health', source: 'Newscientist', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://time.com/health/feed/', source: 'Time', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://hosted2.ap.org/atom/APDEFAULT/bbd825583c8542898e6fa7d440b9febc', source: 'Hosted2', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.womenshealthandfitness.com.au/component/obrss/women-s-health-fitnesscombined-', source: 'Womenshealthandfitness', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.wsj.com/xml/rss/3_7201.xml', source: 'Wsj', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.modernhealthcare.com/section/rss01&mime=xml', source: 'Modernhealthcare', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.mayoclinic.org/rss/all-health-information-topics', source: 'Mayoclinic', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://khn.org/feed/', source: 'Khn', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.lexblog.com/foodsafetynews/mRcs', source: 'Lexblog', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.washingtonpost.com/rss/lifestyle', source: 'Washingtonpost', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.buzzfeed.com/health.xml', source: 'Buzzfeed', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://vitals.lifehacker.com/rss', source: 'Vitals', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.huffingtonpost.com/c/35496/f/677070/index.rss', source: 'Huffingtonpost', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.medscape.com/cx/rssfeeds/2700.xml', source: 'Medscape', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.nytimes.com/services/xml/rss/nyt/Health.xml', source: 'Nytimes', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.theguardian.com/lifeandstyle/health-and-wellbeing/rss', source: 'Theguardian', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.npr.org/rss/rss.php?id=1128', source: 'Npr', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.latimes.com/health/rss2.0.xml', source: 'Latimes', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  // science
  { url: 'http://www.huffingtonpost.com/feeds/verticals/science/index.xml', source: 'Huffingtonpost', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.nytimes.com/services/xml/rss/nyt/Science.xml', source: 'Nytimes', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.nytimes.com/services/xml/rss/nyt/Space.xml', source: 'Nytimes', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.sciam.com/ScientificAmerican-Global', source: 'Sciam', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/BreakingScienceNews?format=xml', source: 'BreakingScienceNews', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.wired.com/wiredscience', source: 'Wired', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.sciencedaily.com/sciencedaily', source: 'Sciencedaily', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.washingtonpost.com/rss/rss_speaking-of-science', source: 'Washingtonpost', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.sciencemag.org/rss/current.xml', source: 'Sciencemag', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/DiscoverTopStories', source: 'DiscoverTopStories', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.howtogeek.com/howtogeek', source: 'Howtogeek', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://syndication.howstuffworks.com/rss/science', source: 'Syndication', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.npr.org/templates/rss/podlayer.php?id=1007', source: 'Npr', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.livescience.com/home/feed/site.xml', source: 'Livescience', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.nature.com/nbt/rss/current', source: 'Nature', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.popsci.com/rss.xml', source: 'Popsci', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://nautil.us/rss/all', source: 'Nautil', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.arstechnica.com/arstechnica/science', source: 'Arstechnica', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.smithsonianmag.com/rss/science-nature/', source: 'Smithsonianmag', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.gawker.com/io9/full#_ga=1.239815749.772722176.1436906624', source: 'Gawker', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.newscientist.com/science-news', source: 'Newscientist', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.newscientist.com/space', source: 'Newscientist', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.pnas.org/rss/Feature_Article.xml', source: 'Pnas', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.treehugger.com/feeds/category/science/', source: 'Treehugger', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds2.feedburner.com/time/scienceandhealth', source: 'Feeds2', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.eurekalert.org/rss.xml', source: 'Eurekalert', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://phys.org/rss-feed/', source: 'Phys', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.csmonitor.com/feeds/science', source: 'Csmonitor', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://hosted2.ap.org/atom/APDEFAULT/b2f0ca3a594644ee9e50a8ec4ce2d6de', source: 'Hosted2', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://omnifeed.com/feed/www.iflscience.com/rss.xml', source: 'Omnifeed', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.wired.com/category/science/science-blogs/feed/', source: 'Wired', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.reuters.com/reuters/scienceNews', source: 'Reuters', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/IeeeSpectrumFullText', source: 'IeeeSpectrumFullText', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.theverge.com/science/rss/index.xml', source: 'Theverge', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://grist.org/feed/', source: 'Grist', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.theguardian.com/science/rss', source: 'Theguardian', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.theguardian.com/us/environment/rss', source: 'Theguardian', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.viralnova.com/feed', source: 'Viralnova', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  // technology
  { url: 'http://www.chron.com/rss/feed/AP-Technology-and-Science-266.php', source: 'Chron', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.cnn.com/rss/cnn_tech.rss', source: 'Cnn', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', source: 'Nytimes', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.theverge.com/rss/group/features/index.xml', source: 'Theverge', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/TechCrunch/', source: 'TechCrunch', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.wired.com/wired/index', source: 'Wired', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://mashable.com/category/rss/', source: 'Mashable', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.cnet.com/rss/iphone-update/', source: 'Cnet', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.cnet.com/rss/android-update/', source: 'Cnet', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://online.wsj.com/xml/rss/3_7455.xml', source: 'Online', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.npr.org/rss/rss.php?id=1019', source: 'Npr', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://recode.net/category/mobile/feed/', source: 'Recode', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://recode.net/category/security/feed/', source: 'Recode', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://recode.net/category/enterprise/feed/', source: 'Recode', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.engadget.com/rss.xml', source: 'Engadget', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.gawker.com/gizmodo/full', source: 'Gawker', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/techcrunch/startups?format=xml', source: 'Techcrunch', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/TechCrunch/Gaming?format=xml', source: 'TechCrunch', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.venturebeat.com/VentureBeat', source: 'Venturebeat', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.venturebeat.com/smallbiz', source: 'Venturebeat', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.gawker.com/valleywag/full', source: 'Gawker', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.bizjournals.com/industry_7', source: 'Bizjournals', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.buzzfeed.com/tech.xml', source: 'Buzzfeed', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.webservice.techradar.com/us/rss/new', source: 'Webservice', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://gigaom.com/feed/', source: 'Gigaom', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.arstechnica.com/arstechnica/gadgets', source: 'Arstechnica', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.geek.com/feed/', source: 'Geek', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.reuters.com/reuters/technologyNews?format=xml', source: 'Reuters', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.computerweekly.com/rss/All-Computer-Weekly-content.xml', source: 'Computerweekly', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://techrepublic.com.feedsportal.com/c/35463/f/670841/index.rss', source: 'Techrepublic', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://zdnet.com.feedsportal.com/c/35462/f/675634/index.rss', source: 'Zdnet', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.forbes.com/technology/feed/', source: 'Forbes', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://time.com/tech/feed/', source: 'Time', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.feedsportal.com/c/270/f/3547/index.rss', source: 'Feedsportal', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rssfeeds.usatoday.com/usatoday-TechTopStories', source: 'Rssfeeds', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.theinquirer.net/feeds/rss', source: 'Theinquirer', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.techspot.com/backend.xml', source: 'Techspot', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.techtarget.com/html/pr/tt_pr.xml', source: 'Techtarget', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/geekologie/iShm', source: 'Geekologie', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.dailytech.com/rss.aspx', source: 'Dailytech', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.digitaltrends.com/feed/', source: 'Digitaltrends', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds2.feedburner.com/bit-tech/all', source: 'Feeds2', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.wsj.com/xml/rss/3_7455.xml', source: 'Wsj', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.arstechnica.com/arstechnica/technology-lab', source: 'Arstechnica', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.informationweek.com/rss_simple.asp', source: 'Informationweek', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.newscientist.com/tech', source: 'Newscientist', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.technologyreview.com/stream/rss/', source: 'Technologyreview', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://hosted2.ap.org/atom/APDEFAULT/495d344a0d10421e9baa8ee77029cfbd', source: 'Hosted2', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.techinsider.io/rss', source: 'Techinsider', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/IeeeSpectrumRoboticsChannel', source: 'IeeeSpectrumRoboticsChannel', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.theverge.com/tech/rss/index.xml', source: 'Theverge', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://recode.net/feed/', source: 'Recode', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/TechCrunch/gaming', source: 'TechCrunch', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  // sports
  { url: 'http://rss.nytimes.com/services/xml/rss/nyt/Sports.xml', source: 'Nytimes', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.buzzfeed.com/sports.xml', source: 'Buzzfeed', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.sbnation.com/rss/streams', source: 'Sbnation', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.latimes.com/sports/rss2.0.xml', source: 'Latimes', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.cbssports.com/partners/feeds/rss/home_news', source: 'Cbssports', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.si.com/rss/si_topstories.rss', source: 'Si', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.gawker.com/deadspin/full', source: 'Gawker', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.washingtonpost.com/rss/rss_early-lead', source: 'Washingtonpost', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.theguardian.com/sport/us-sport/rss', source: 'Theguardian', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://hosted.ap.org/lineups/SPORTSHEADS.rss?SITE=AP&SECTION=HOME', source: 'Hosted', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  // entertainment
  { url: 'http://blogs.wsj.com/speakeasy/feed/', source: 'Blogs', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.hollywoodreporter.com/blogs/live-feed/rss', source: 'Hollywoodreporter', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://variety.com/feed/', source: 'Variety', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.ew.com/web/ew/rss/todayslatest/index.xml', source: 'Ew', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://grantland.com/hollywood-prospectus/feed/', source: 'Grantland', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.latimes.com/entertainment/rss2.0.xml', source: 'Latimes', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/nymag/vulture', source: 'Nymag', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.newyorker.com/feed/culture', source: 'Newyorker', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.buzzfeed.com/tvandmovies.xml', source: 'Buzzfeed', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rssfeeds.usatoday.com/usatoday-LifeTopStories', source: 'Rssfeeds', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.accesshollywood.com/AccessHollywood/LatestNews', source: 'Accesshollywood', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/fuse/latest', source: 'Fuse', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.tmz.com/rss.xml', source: 'Tmz', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/nydnrss/entertainment', source: 'Nydnrss', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.huffingtonpost.com/feeds/verticals/entertainment/index.xml', source: 'Huffingtonpost', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.vice.com/music/rss', source: 'Vice', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://deadline.com/feed/', source: 'Deadline', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/EtsBreakingNews', source: 'EtsBreakingNews', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.cnn.com/rss/cnn_showbiz.rss', source: 'Cnn', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.bet.com/AllBetcom', source: 'Bet', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.popsugar.com/feed', source: 'Popsugar', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feed2.hollywood.com/hollywood/RhHn', source: 'Feed2', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.esquire.com/blogs/culture/culture-rss', source: 'Esquire', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.usmagazine.com/feeds/movies_tv_music/atom', source: 'Usmagazine', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.washingtonpost.com/rss/entertainment', source: 'Washingtonpost', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.reuters.com/reuters/entertainment', source: 'Reuters', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  // gaming
  { url: 'http://feeds.ign.com/ign/all', source: 'Ign', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.gawker.com/kotaku/full#_ga=1.111114893.94307673.1446233598', source: 'Gawker', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/RockPaperShotgun', source: 'RockPaperShotgun', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/VGChartz', source: 'VGChartz', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://toucharcade.com/feed/', source: 'Toucharcade', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://killscreendaily.com/articles/latest/', source: 'Killscreendaily', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.engadget.com/tag/@gaming/rss.xml', source: 'Engadget', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://fulltextrssfeed.com/feed.php?url=www.joystiq.com%2Frss.xml', source: 'Fulltextrssfeed', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.gamesindustry.biz/rss/gamesindustry_news_feed.rss', source: 'Gamesindustry', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.giantbomb.com/feeds/mashup/', source: 'Giantbomb', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.gamespot.com/feeds/mashup/', source: 'Gamespot', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.gamasutra.com/static2/rssfeeds.html', source: 'Gamasutra', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.eurogamer.net/?format=rss', source: 'Eurogamer', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.escapistmagazine.com/tags/video-games.xml', source: 'Escapistmagazine', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.destructoid.com/?mode=atom', source: 'Destructoid', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://www.cheapassgamer.com/rss/forums/1-cheap-ass-gamer-video-game-dealsforum/', source: 'Cheapassgamer', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.gametrailers.com/about/rss', source: 'Gametrailers', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/Rpgcast', source: 'Rpgcast', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.tigsource.com/feed/', source: 'Tigsource', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.pocketgamer.co.uk/rss.asp', source: 'Pocketgamer', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.polygon.com/rss/index.xml', source: 'Polygon', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.wired.com/category/underwire/feed/', source: 'Wired', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.cnet.com/rss/gaming/', source: 'Cnet', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.arstechnica.com/arstechnica/gaming', source: 'Arstechnica', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },

  // --- CA (156 feeds) ---
  // general
  { url: 'http://rss.canada.com/get/?F7497', source: 'Canada', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://news.gc.ca/web/fd-en.do?mthd=ntnl&ft=atom', source: 'Gc', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://news.gc.ca/web/fd-en.do?mthd=rgnl&ft=atom', source: 'Gc', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.journaldemontreal.com/rss.xml', source: 'Journaldemontreal', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.radio-canada.ca/fils/nouvelles/national.xml', source: 'Radio Canada', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.calgarysun.com/home/rss.xml', source: 'Calgarysun', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://leaderpost.com/feed/', source: 'Leaderpost', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://thestarphoenix.com/feed/', source: 'Thestarphoenix', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://windsorstar.com/feed/', source: 'Windsorstar', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.cbc.ca/cmlink/rss-canada', source: 'Cbc', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.ctvnews.ca/rss/ctvnews-ca-canada-public-rss-1.822284', source: 'Ctvnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canada.com/get/?F75', source: 'Canada', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://globalnews.ca/canada/feed/', source: 'Globalnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.thestar.com/feeds.articles.news.canada.rss', source: 'Thestar', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.theglobeandmail.com/news/national/?service=rss', source: 'Theglobeandmail', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canada.com/get/?F270', source: 'Canada', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.macleans.ca/feed/', source: 'Macleans', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canada.com/get/?F7364', source: 'Canada', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canada.com/get/?F264', source: 'Canada', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.nhl.com/rss/news.xml', source: 'Nhl', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.660news.com/featured/spotlight/feed/', source: '660news', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.brandonsun.com/rss/?path=%2Fnational%2Fbreaking-news', source: 'Brandonsun', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://thewalrus.ca/feed/', source: 'Thewalrus', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.torontosun.com/home/rss.xml', source: 'Torontosun', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canada.com/get/?F243', source: 'Canada', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canada.com/get/?F259', source: 'Canada', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canada.com/get/?F291', source: 'Canada', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedblitz.com/thetyee', source: 'Feedblitz', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/rabble-news?format=xml', source: 'Rabble News', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.theglobeandmail.com/news/politics/?service=rss', source: 'Theglobeandmail', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.ctvnews.ca/rss/ctvnews-ca-politics-public-rss-1.822302', source: 'Ctvnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://globalnews.ca/politics/feed/', source: 'Globalnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.economist.com/topics/canadian-politics/index.xml', source: 'Economist', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.thestar.com/feeds.blogs.news.politics_blog.rss', source: 'Thestar', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://topics.nytimes.com/top/news/international/countriesandterritories/canada/', source: 'Topics', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://news.gc.ca/web/fd-en.do?mthd=thm&ft=atom&crtr.thm1D=7', source: 'Gc', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://news.gc.ca/web/fd-en.do?mthd=thm&ft=atom&crtr.thm1D=17', source: 'Gc', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.ctvnews.ca/rss/business/ctv-news-business-headlines-1.867648', source: 'Ctvnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://news.gc.ca/web/fd-en.do?mthd=thm&ft=atom&crtr.thm1D=9', source: 'Gc', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://news.nationalpost.com/category/health/feed/', source: 'Nationalpost', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.ctvnews.ca/rss/ctvnews-ca-sci-tech-public-rss-1.822295', source: 'Ctvnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://globalnews.ca/science/feed/', source: 'Globalnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://en.cis-sic.ca/landing/headlines-featured?feed=rss_2.0', source: 'En', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'https://ca.sports.yahoo.com/top/rss.xml', source: 'Ca', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://globalnews.ca/sports/feed/', source: 'Globalnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://globalnews.ca/tech/feed/', source: 'Globalnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://news.gc.ca/web/fd-en.do?mthd=thm&ft=atom&crtr.thm1D=13', source: 'Gc', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://globalnews.ca/category/entertainment/feed/', source: 'Globalnews', category: 'general', scope: SCOPE_REGIONAL, region: 'north_america' },
  // politics
  { url: 'http://www.huffingtonpost.ca/feeds/verticals/canada-politics/index.xml', source: 'Huffingtonpost', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://backofthebook.ca/feed/rss/', source: 'Backofthebook', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.radio-canada.ca/fils/nouvelles/politique.xml', source: 'Radio Canada', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.hilltimes.com/feed', source: 'Hilltimes', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.cbc.ca/lineup/politics.xml', source: 'Cbc', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.macleans.ca/author/inklesswells/feed/', source: 'Macleans', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.economist.com/blogs/americasview/2014/09/politics-alberta?fsrc=rss', source: 'Economist', category: 'politics', scope: SCOPE_REGIONAL, region: 'north_america' },
  // business
  { url: 'http://rss.canada.com/get/?F7537', source: 'Canada', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/morningstar/glkd', source: 'Morningstar', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.radio-canada.ca/fils/nouvelles/economieaffaires.xml', source: 'Radio Canada', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.calgarysun.com/money/rss.xml', source: 'Calgarysun', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.huffingtonpost.ca/feeds/verticals/canada-business/index.xml', source: 'Huffingtonpost', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canoe.com/Money/home.xml', source: 'Canoe', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.itbusiness.ca/feed', source: 'Itbusiness', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.cbc.ca/lineup/business.xml', source: 'Cbc', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.cbj.ca/business_news/canadian_business_news/index.1.rss', source: 'Cbj', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.cbj.ca/business_in_action/april_11/index.1.rss', source: 'Cbj', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/FP_TopStories?format=xml', source: 'FP TopStories', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.canadianbusiness.com/feed/', source: 'Canadianbusiness', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canada.com/get/?F7477', source: 'Canada', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canada.com/get/?F6939', source: 'Canada', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://blogs.wsj.com/canadarealtime/feed/?mod=WSJ_Canada_Realtime&mg=blogswsj&', source: 'Blogs', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://business.financialpost.com/category/fp-tech-desk/feed/', source: 'Business', category: 'business', scope: SCOPE_REGIONAL, region: 'north_america' },
  // gaming
  { url: 'http://rss.canada.com/get/?F7541', source: 'Canada', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/feedburner/g4tv_ca', source: 'Feedburner', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://cogconnected.com/feed/', source: 'Cogconnected', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.cvawards.ca/feed/', source: 'Cvawards', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.gamingpost.ca/feed/', source: 'Gamingpost', category: 'gaming', scope: SCOPE_REGIONAL, region: 'north_america' },
  // health
  { url: 'http://rss.canada.com/get/?F7523', source: 'Canada', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canada.com/get/?F7519', source: 'Canada', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canada.com/get/?F7517', source: 'Canada', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.ellecanada.com/rss_feed/home.rss', source: 'Ellecanada', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.journaldemontreal.com/jm/sante/rss.xml', source: 'Journaldemontreal', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.calgarysun.com/life/rss.xml', source: 'Calgarysun', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.huffingtonpost.ca/feeds/verticals/canada-lifestyle/index.xml', source: 'Huffingtonpost', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canoe.com/Lifewise/home.xml', source: 'Canoe', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.thestar.com/feeds.articles.life.health_wellness.rss', source: 'Thestar', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.theglobeandmail.com/life/health-and-fitness/?service=rss', source: 'Theglobeandmail', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.torontosun.com/life/health-and-fitness/rss.xml', source: 'Torontosun', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canada.com/get/?F6918', source: 'Canada', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://ottawacitizen.com/feed', source: 'Ottawacitizen', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canada.com/get/?F7738', source: 'Canada', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.metroland.com/9/article/hamilton/living/health', source: 'Metroland', category: 'health', scope: SCOPE_REGIONAL, region: 'north_america' },
  // science
  { url: 'http://www.cbc.ca/cmlink/1.392', source: 'Cbc', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.radio-canada.ca/fils/nouvelles/scienceetsante.xml', source: 'Radio Canada', category: 'science', scope: SCOPE_REGIONAL, region: 'north_america' },
  // technology
  { url: 'http://www.thestar.com/feeds.articles.life.technology.rss', source: 'Thestar', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.theglobeandmail.com/technology/?service=rss', source: 'Theglobeandmail', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.torontosun.com/tech/rss.xml', source: 'Torontosun', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canada.com/get/?F7539', source: 'Canada', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.radio-canada.ca/fils/nouvelles/technologie.xml', source: 'Radio Canada', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.calgarysun.com/tech/rss.xml', source: 'Calgarysun', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.pcauthority.com.au/RSS/rss.ashx?type=Category&ID=12', source: 'Pcauthority', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.techvibes.com/feed/blog/xml/global/', source: 'Techvibes', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://betakit.com/feed/', source: 'Betakit', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.cbc.ca/cmlink/rss-technology', source: 'Cbc', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canada.com/get/?F7166', source: 'Canada', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canada.com/get/?F221', source: 'Canada', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canada.com/get/?F7484', source: 'Canada', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://mobilesyrup.com/feed/', source: 'Mobilesyrup', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.theepochtimes.com/n3/c/tech/tech-news/feed/', source: 'Theepochtimes', category: 'technology', scope: SCOPE_REGIONAL, region: 'north_america' },
  // sports
  { url: 'http://rss.canada.com/get/?F255', source: 'Canada', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.journaldemontreal.com/sports/rss.xml', source: 'Journaldemontreal', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.radio-canada.ca/fils/sports/sports.xml', source: 'Radio Canada', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.calgarysun.com/sports/rss.xml', source: 'Calgarysun', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.huffingtonpost.ca/feeds/verticals/canada-sports/index.xml', source: 'Huffingtonpost', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canoe.com/Slam/home.xml', source: 'Canoe', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://torontosportsmedia.com/feed', source: 'Torontosportsmedia', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.cbc.ca/cmlink/rss-sports', source: 'Cbc', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.tsn.ca/datafiles/rss/Stories.xml', source: 'Tsn', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.sportsnet.ca/feed/', source: 'Sportsnet', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.thestar.com/feeds.articles.sports.rss', source: 'Thestar', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.theglobeandmail.com/sports/?service=rss', source: 'Theglobeandmail', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canada.com/get/?F260', source: 'Canada', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.torontosun.com/sports/rss.xml', source: 'Torontosun', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.winnipegfreepress.com/rss/?path=%2Fsports', source: 'Winnipegfreepress', category: 'sports', scope: SCOPE_REGIONAL, region: 'north_america' },
  // entertainment
  { url: 'http://rss.canada.com/get/?F7502', source: 'Canada', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.ellecanada.com/rss_feed/celebrity.rss', source: 'Ellecanada', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.calgarysun.com/entertainment/celebrities/rss.xml', source: 'Calgarysun', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canoe.com/Jam/Celebrities/home.xml', source: 'Canoe', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://blogs.etcanada.com/feed/', source: 'Blogs', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.hgtv.ca/rss.ashx', source: 'Hgtv', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://syndication.eonline.com/syndication/feeds/rssfeeds/', source: 'Syndication', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.laineygossip.com/Rss', source: 'Laineygossip', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.thestar.com/feeds.articles.entertainment.rss', source: 'Thestar', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.huffingtonpost.ca/feeds/verticals/canada-music/index.xml', source: 'Huffingtonpost', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.calgarysun.com/entertainment/music/rss.xml', source: 'Calgarysun', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canoe.com/Jam/Music/home.xml', source: 'Canoe', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/ExclaimCaAllArticles', source: 'ExclaimCaAllArticles', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.chartattack.com/feed/', source: 'Chartattack', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://musiccanada.com/feed/', source: 'Musiccanada', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.blogtalkradio.com/canadianmusician/podcast', source: 'Blogtalkradio', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://feeds.feedburner.com/thescenemag', source: 'Thescenemag', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canada.com/get/?F6946', source: 'Canada', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canada.com/get/?F7500', source: 'Canada', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.journaldemontreal.com/spectacles/rss.xml', source: 'Journaldemontreal', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.radio-canada.ca/fils/arts-spectacles/artsetspectacles.xml', source: 'Radio Canada', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.calgarysun.com/entertainment/rss.xml', source: 'Calgarysun', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canoe.com/Jam/Movies/home.xml', source: 'Canoe', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.cbc.ca/lineup/arts.xml', source: 'Cbc', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://arts.nationalpost.com/category/arts/feed/', source: 'Arts', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canada.com/get/?F69', source: 'Canada', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.theglobeandmail.com/arts/?service=rss', source: 'Theglobeandmail', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.torontosun.com/entertainment/rss.xml', source: 'Torontosun', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canada.com/get/?F6948', source: 'Canada', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.ottawasun.com/entertainment/rss.xml', source: 'Ottawasun', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canada.com/get/?F7366', source: 'Canada', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://rss.canoe.ca/Jam/home.xml', source: 'Canoe', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },
  { url: 'http://www.dose.ca/feed', source: 'Dose', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'north_america' },

  // --- IN (156 feeds) ---
  // general
  { url: 'http://www.telegraphindia.com/feeds/rss.jsp?id=3', source: 'Telegraphindia', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.caravanmagazine.in/feed', source: 'Caravanmagazine', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://thewire.in/feed/', source: 'Thewire', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.oneindia.com/rss/news-india-fb.xml', source: 'Oneindia', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://sify.com/rss2/news/article/category/national', source: 'Sify', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.tehelka.com/?feed=custom_feed', source: 'Tehelka', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.outlookindia.com/rss/main/website', source: 'Outlookindia', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.outlookindia.com/rss/main/newswire', source: 'Outlookindia', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.outlookindia.com/rss/section/19', source: 'Outlookindia', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://feeds.hindustantimes.com/HT-India', source: 'Hindustantimes', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://indianexpress.com/section/india/feed/', source: 'Indianexpress', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://timesofindia.feedsportal.com/c/33039/f/533916/index.rss', source: 'Timesofindia', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://feeds.bbci.co.uk/news/world/asia/india/rss.xml', source: 'Bbci', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://ibnlive.in.com/ibnrss/top.xml', source: 'Ibnlive', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://timesofindia.feedsportal.com/c/33039/f/533965/index.rss', source: 'Timesofindia', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://indiatoday.feedsportal.com/c/33614/f/589699/index.rss', source: 'Indiatoday', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.thehindubusinessline.com/news/?service=rss', source: 'Thehindubusinessline', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.thehindubusinessline.com/news/international/?service=rss', source: 'Thehindubusinessline', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.thehindu.com/news/national/?service=rss', source: 'Thehindu', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://zeenews.india.com/rss/world-news.xml', source: 'Zeenews', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.business-standard.com/rss/current-affairs-news-11501.rss', source: 'Business Standard', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://nvonews.com/feed/', source: 'Nvonews', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://economictimes.indiatimes.com/News/rssfeeds/1715249553.cms', source: 'Economictimes', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.sikhsiyasat.com/feed/', source: 'Sikhsiyasat', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.asianage.com/rss/38', source: 'Asianage', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.dnaindia.com/rss.xml', source: 'Dnaindia', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.deccanchronicle.com/rss.xml', source: 'Deccanchronicle', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.deccanherald.com/rss-internal/top-stories.rss', source: 'Deccanherald', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://syndication.financialexpress.com/rss/latest-news.xml', source: 'Syndication', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.mid-day.com/Resources/midday/rss/news-national.xml', source: 'Mid Day', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.livemint.com/rss/homepage', source: 'Livemint', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://sify.com/rss2/news/article/category/politics', source: 'Sify', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.thehindu.com/news/international/south-asia/?service=rss', source: 'Thehindu', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.thehindu.com/news/cities/?service=rss', source: 'Thehindu', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'https://in.news.yahoo.com/rss/politics', source: 'In', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'https://in.news.yahoo.com/rss/national', source: 'In', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.economist.com/topics/india/index.xml', source: 'Economist', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.oneindia.com/rss/news-business-fb.xml', source: 'Oneindia', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://zeenews.india.com/rss/business.xml', source: 'Zeenews', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'https://in.news.yahoo.com/rss//india', source: 'In', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'https://news.google.com/news/feeds?cf=all&ned=in&hl=en&topic=b&output=rss', source: 'Google', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://feeds.bbci.co.uk/news/world/asia/rss.xml', source: 'Bbci', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://sify.com/rss2/news/article/category/science', source: 'Sify', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://zeenews.india.com/rss/science-technology-news.xml', source: 'Zeenews', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.oneindia.com/rss/news-sports-fb.xml', source: 'Oneindia', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://syndication.indianexpress.com/rss/785/latest-news.xml', source: 'Syndication', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'https://in.news.yahoo.com/rss/sports', source: 'In', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://zeenews.india.com/rss/sports-news.xml', source: 'Zeenews', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.pcquest.com/rss-2-2/?cat_slug=news-launches', source: 'Pcquest', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.bollywoodhungama.com/rss/news.xml', source: 'Bollywoodhungama', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://zeenews.india.com/rss/india-national-news.xml', source: 'Zeenews', category: 'general', scope: SCOPE_REGIONAL, region: 'south_asia' },
  // politics
  { url: 'http://www.telegraphindia.com/feeds/rss.jsp?id=4', source: 'Telegraphindia', category: 'politics', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://ibnlive.in.com/ibnrss/rss/politics/politics.xml', source: 'Ibnlive', category: 'politics', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://ibnlive.in.com/ibnrss/rss/politics/elections.xml', source: 'Ibnlive', category: 'politics', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://ibnlive.in.com/ibnrss/rss/shows/facethenation.xml', source: 'Ibnlive', category: 'politics', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://ibnlive.in.com/ibnrss/rss/elections/delhielections.xml', source: 'Ibnlive', category: 'politics', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://ibnlive.in.com/ibnrss/rss/elections/chhattisgarhelections.xml', source: 'Ibnlive', category: 'politics', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://ibnlive.in.com/ibnrss/rss/loksabhaelections/loksabhaelections.xml', source: 'Ibnlive', category: 'politics', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://ibnlive.in.com/ibnrss/rss/elections/madhyapradeshelections.xml', source: 'Ibnlive', category: 'politics', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://ibnlive.in.com/ibnrss/rss/elections/rajasthanelections.xml', source: 'Ibnlive', category: 'politics', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://ibnlive.in.com/ibnrss/rss/elections/mizoramelections.xml', source: 'Ibnlive', category: 'politics', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://ibnlive.in.com/ibnrss/rss/elections/haryanaelections.xml', source: 'Ibnlive', category: 'politics', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://ibnlive.in.com/ibnrss/rss/elections/maharashtraelections.xml', source: 'Ibnlive', category: 'politics', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://ibnlive.in.com/ibnrss/rss/elections/odishaelections.xml', source: 'Ibnlive', category: 'politics', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://ibnlive.in.com/ibnrss/rss/elections/andhrapradeshelections.xml', source: 'Ibnlive', category: 'politics', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://ibnlive.in.com/ibnrss/rss/elections/sikkimelections.xml', source: 'Ibnlive', category: 'politics', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://inp.sagepub.com/rss/current.xml', source: 'Inp', category: 'politics', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://indianexpress.com/section/india/politics/feed/', source: 'Indianexpress', category: 'politics', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.firstpost.com/politics/feed', source: 'Firstpost', category: 'politics', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.frontline.in/politics/?service=rss', source: 'Frontline', category: 'politics', scope: SCOPE_REGIONAL, region: 'south_asia' },
  // world
  { url: 'http://www.ft.com/rss/world/asiapacific/india', source: 'Ft', category: 'world', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://feeds.reuters.com/reuters/worldOfSport', source: 'Reuters', category: 'world', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.computerworld.in/rss.xml', source: 'Computerworld', category: 'world', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.bollywoodnewsworld.com/feed', source: 'Bollywoodnewsworld', category: 'world', scope: SCOPE_REGIONAL, region: 'south_asia' },
  // economy
  { url: 'http://www.livemint.com/rss/economy_politics', source: 'Livemint', category: 'economy', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.tehelka.com/economy/?feed=custom_feed', source: 'Tehelka', category: 'economy', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://economictimes.indiatimes.com/rssfeedsdefault.cms', source: 'Economictimes', category: 'economy', scope: SCOPE_REGIONAL, region: 'south_asia' },
  // business
  { url: 'http://www.outlookindia.com/rss/section/18', source: 'Outlookindia', category: 'business', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://sify.com/rss2/business/article/category/bank', source: 'Sify', category: 'business', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://sify.com/rss2/business/article/category/ipo', source: 'Sify', category: 'business', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://timesofindia.feedsportal.com/c/33039/f/534010/index.rss', source: 'Timesofindia', category: 'business', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://timesofindia.feedsportal.com/c/33039/f/533919/index.rss', source: 'Timesofindia', category: 'business', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.businessweek.com/feeds/most-popular.rss', source: 'Businessweek', category: 'business', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://feeds.reuters.com/reuters/INbusinessNews', source: 'Reuters', category: 'business', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.business-standard.com/rss/todays-paper.rss', source: 'Business Standard', category: 'business', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://forbesindia.com/rssfeed/rss_all.xml', source: 'Forbesindia', category: 'business', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://feeds.feedburner.com/NDTV-Business?format=xml', source: 'NDTV Business', category: 'business', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://feeds.hindustantimes.com/HT-Business?format=xml', source: 'Hindustantimes', category: 'business', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.nytimes.com/services/xml/rss/nyt/InternationalBusiness.xml', source: 'Nytimes', category: 'business', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.thetimes.co.uk/tto/business/markets/india/rss', source: 'Thetimes', category: 'business', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.livemint.com/rss/companies', source: 'Livemint', category: 'business', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.livemint.com/rss/consumer', source: 'Livemint', category: 'business', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.livemint.com/rss/money', source: 'Livemint', category: 'business', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.livemint.com/rss/industry', source: 'Livemint', category: 'business', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://sify.com/rss2/business/article/category/technology', source: 'Sify', category: 'business', scope: SCOPE_REGIONAL, region: 'south_asia' },
  // health
  { url: 'http://www.femina.in/feeds/feeds-lifestyle.xml', source: 'Femina', category: 'health', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.femina.in/feeds/feeds-fitness.xml', source: 'Femina', category: 'health', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://feeds.hindustantimes.com/HT-HomePage-TopStories', source: 'Hindustantimes', category: 'health', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://timesofindia.indiatimes.com/rssfeeds/2886714.cms', source: 'Timesofindia', category: 'health', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://indiatoday.intoday.in/rss/homepage-topstories.jsp', source: 'Indiatoday', category: 'health', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://lifestyle.in.msn.com/rss/health.aspx', source: 'Lifestyle', category: 'health', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.thehealthsite.com/comments/feed/', source: 'Thehealthsite', category: 'health', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.mensxp.com/feeds.xml', source: 'Mensxp', category: 'health', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://forbesindia.com/rssfeed/rss_life.xml', source: 'Forbesindia', category: 'health', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.mansworldindia.com/feed/', source: 'Mansworldindia', category: 'health', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.thehindu.com/sci-tech/health/?service=rss', source: 'Thehindu', category: 'health', scope: SCOPE_REGIONAL, region: 'south_asia' },
  // gaming
  { url: 'http://www.pcquest.com/rss-2-2/?cat_slug=games', source: 'Pcquest', category: 'gaming', scope: SCOPE_REGIONAL, region: 'south_asia' },
  // technology
  { url: 'http://feeds.feedburner.com/NDTV-Tech', source: 'NDTV Tech', category: 'technology', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.dnaindia.com/feeds/scitech.xml', source: 'Dnaindia', category: 'technology', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.business-standard.com/rss/technology-108.rss', source: 'Business Standard', category: 'technology', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://indianexpress.com/technology/feed/', source: 'Indianexpress', category: 'technology', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.pcquest.com/rss-2-2/?cat_slug=tech-&-trends', source: 'Pcquest', category: 'technology', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://timesofindia.feedsportal.com/c/33039/f/533923/index.rss', source: 'Timesofindia', category: 'technology', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.techtree.com/rss.xml', source: 'Techtree', category: 'technology', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://indianexpress.com/section/technology/feed/', source: 'Indianexpress', category: 'technology', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.thehindu.com/sci-tech/?service=rss', source: 'Thehindu', category: 'technology', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.thehindu.com/sci-tech/technology/?service=rss', source: 'Thehindu', category: 'technology', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://feeds.hindustantimes.com/HT-Technology', source: 'Hindustantimes', category: 'technology', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://syndication.financialexpress.com/rss/377/tech.xml', source: 'Syndication', category: 'technology', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.gizmodo.in/rss_section_feeds/19124814.cms', source: 'Gizmodo', category: 'technology', scope: SCOPE_REGIONAL, region: 'south_asia' },
  // science
  { url: 'http://www.thehindu.com/sci-tech/science/?service=rss', source: 'Thehindu', category: 'science', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://feeds.hindustantimes.com/HT-Reviews', source: 'Hindustantimes', category: 'science', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.indodaily.com/indodaily.xml', source: 'Indodaily', category: 'science', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://timesofindia.indiatimes.com/rss.cms', source: 'Timesofindia', category: 'science', scope: SCOPE_REGIONAL, region: 'south_asia' },
  // sports
  { url: 'http://www.telegraphindia.com/feeds/rss.jsp?id=7', source: 'Telegraphindia', category: 'sports', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.espncricinfo.com/rss/content/story/feeds/6.xml', source: 'Espncricinfo', category: 'sports', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://live-feeds.cricbuzz.com/CricbuzzFeed', source: 'Live Feeds', category: 'sports', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.outlookindia.com/rss/section/22', source: 'Outlookindia', category: 'sports', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://sify.com/rss2/sports/article/category/cricket', source: 'Sify', category: 'sports', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://sify.com/rss2/sports/article/category/football', source: 'Sify', category: 'sports', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://sify.com/rss2/sports/article/category/others', source: 'Sify', category: 'sports', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://timesofindia.feedsportal.com/c/33039/f/533921/index.rss', source: 'Timesofindia', category: 'sports', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://feeds.feedburner.com/NDTV-Sports', source: 'NDTV Sports', category: 'sports', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://feeds.feedburner.com/NDTV-Cricket', source: 'NDTV Cricket', category: 'sports', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://indiatoday.feedsportal.com/c/33614/f/589706/index.rss?http://', source: 'Indiatoday', category: 'sports', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://feeds.hindustantimes.com/HT-Sport', source: 'Hindustantimes', category: 'sports', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.thehindu.com/sport/?service=rss', source: 'Thehindu', category: 'sports', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.abplive.in/sports/?widgetName=rssfeed&widgetContentId=101313&getXmlFeed=true', source: 'Abplive', category: 'sports', scope: SCOPE_REGIONAL, region: 'south_asia' },
  // entertainment
  { url: 'http://www.telegraphindia.com/feeds/rss.jsp?id=20', source: 'Telegraphindia', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.tehelka.com/cinema/?feed=custom_feed', source: 'Tehelka', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://rollingstoneindia.com/feed/', source: 'Rollingstoneindia', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.filmibeat.com/rss/filmibeat-fb.xml', source: 'Filmibeat', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.outlookindia.com/rss/section/23', source: 'Outlookindia', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.tellychakkar.com/rss.xml', source: 'Tellychakkar', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.in.com/', source: 'In', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://feeds2.feedburner.com/musicmaza/zNyY', source: 'Feeds2', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://feeds2.feedburner.com/BollywoodNewsFeed', source: 'Feeds2', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.bollywood.com/rss.xml', source: 'Bollywood', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://timesofindia.indiatimes.com/rssfeeds/1081479906.cms', source: 'Timesofindia', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://indianexpress.com/entertainment/feed/', source: 'Indianexpress', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.bollywoodlife.com/feed/', source: 'Bollywoodlife', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.dnaindia.com/feeds/entertainment.xml', source: 'Dnaindia', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://feeds.reuters.com/reuters/INentertainmentNews', source: 'Reuters', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://feeds.hindustantimes.com/HT-Entertainment', source: 'Hindustantimes', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.thehindu.com/entertainment/?service=rss', source: 'Thehindu', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'south_asia' },
  { url: 'http://www.livemint.com/rss/lounge', source: 'Livemint', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'south_asia' },

  // --- GB (157 feeds) ---
  // general
  { url: 'http://www.theguardian.com/observer/rss', source: 'Theguardian', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.theweek.co.uk/feeds/all', source: 'Theweek', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.bbci.co.uk/news/world/rss.xml', source: 'Bbci', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.bbci.co.uk/news/uk/rss.xml', source: 'Bbci', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.theguardian.com/uk/rss', source: 'Theguardian', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://news.sky.com/feeds/rss/uk.xml', source: 'Sky', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.telegraph.co.uk/news/uknews/rss', source: 'Telegraph', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.standard.co.uk/news/rss', source: 'Standard', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.oxfordmail.co.uk/news/rss/', source: 'Oxfordmail', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.dailymail.co.uk/news/index.rss', source: 'Dailymail', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://rss.feedsportal.com/c/266/f/3503/index.rss', source: 'Feedsportal', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://rss.feedsportal.com/c/266/f/3496/index.rss', source: 'Feedsportal', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.feedburner.com/daily-express-uk-news', source: 'Daily Express Uk News', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.manchestereveningnews.co.uk/rss.xml', source: 'Manchestereveningnews', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.itv.com/news/index.rss', source: 'Itv', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.thecourier.co.uk/cmlink/1.67998', source: 'Thecourier', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.feedburner.com/ScottishNewsHeraldScotland', source: 'ScottishNewsHeraldScotland', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.channel4.com/news/uk/rss', source: 'Channel4', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.scotsman.com/rss/cmlink/1.65668', source: 'Scotsman', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.newsletter.co.uk/rss/cmlink/1.1571541', source: 'Newsletter', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.examiner.ie/ietopstories', source: 'Examiner', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.irishtimes.com/rss/editors-picks-feed-1.1904962?localLinksEnabled=false', source: 'Irishtimes', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.skynews.com/feeds/rss/politics.xml', source: 'Skynews', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.independent.co.uk/news/people/diary/', source: 'Independent', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.bbci.co.uk/news/politics/rss.xml', source: 'Bbci', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.telegraph.co.uk/news/politics/rss', source: 'Telegraph', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.economist.com/topics/european-union/index.xml', source: 'Economist', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.huffingtonpost.co.uk/news/british-national-party/feed/', source: 'Huffingtonpost', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.huffingtonpost.co.uk/news/london-riots/feed/', source: 'Huffingtonpost', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.huffingtonpost.co.uk/news/immigration/feed/', source: 'Huffingtonpost', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.huffingtonpost.co.uk/news/islam/feed/', source: 'Huffingtonpost', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.huffingtonpost.co.uk/news/media/feed/', source: 'Huffingtonpost', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.huffingtonpost.co.uk/news/terrorism/feed/', source: 'Huffingtonpost', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.huffingtonpost.co.uk/news/space-agency/feed/', source: 'Huffingtonpost', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.huffingtonpost.co.uk/news/economy/feed/', source: 'Huffingtonpost', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.standard.co.uk/news/politics/rss', source: 'Standard', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'https://uk.finance.yahoo.com/news/provider-yahoofinance/?format=rss', source: 'Uk', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.feedburner.com/daily-express-finance-news', source: 'Daily Express Finance News', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.manchestereveningnews.co.uk/business/rss.xml', source: 'Manchestereveningnews', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.bbci.co.uk/news/business/rss.xml', source: 'Bbci', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://news.sky.com/feeds/rss/business.xml', source: 'Sky', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.bbci.co.uk/news/health/rss.xml', source: 'Bbci', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.independent.co.uk/news/science/rss', source: 'Independent', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.wired.co.uk/news/rss', source: 'Wired', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.theregister.co.uk/science/headlines.atom', source: 'Theregister', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.mirror.co.uk/news/technology-science/rss.xml', source: 'Mirror', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.in.com/rss/news/sci-tech', source: 'In', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.feedburner.com/daily-express-sport-news', source: 'Daily Express Sport News', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.skynews.com/feeds/rss/technology.xml', source: 'Skynews', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.bbci.co.uk/news/technology/rss.xml#', source: 'Bbci', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.skynews.com/feeds/rss/entertainment.xml', source: 'Skynews', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.huffingtonpost.co.uk/news/celebrity/feed/', source: 'Huffingtonpost', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.manchestereveningnews.co.uk/news/showbiz-news/rss.xml', source: 'Manchestereveningnews', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.music-news.com/rss/UK/news', source: 'Music News', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.mirror.co.uk/tv/tv-news/rss.xml', source: 'Mirror', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.film-news.co.uk/rss/UK/news', source: 'Film News', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://ukfilmnews.com/?feed=rss2', source: 'Ukfilmnews', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', source: 'Bbci', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.entertainmentnews.co.uk/feed/', source: 'Entertainmentnews', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.mtv.co.uk/rss/news', source: 'Mtv', category: 'general', scope: SCOPE_REGIONAL, region: 'europe' },
  // world
  { url: 'http://www.theguardian.com/world/rss', source: 'Theguardian', category: 'world', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.ft.com/rss/world/uk', source: 'Ft', category: 'world', scope: SCOPE_REGIONAL, region: 'europe' },
  // politics
  { url: 'http://www.ft.com/rss/world/uk/politics', source: 'Ft', category: 'politics', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.scotsman.com.dynamic.feedsportal.com/pf/610141/www.scotsman.com/', source: 'Scotsman', category: 'politics', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.theguardian.com/theguardian/politics/rss', source: 'Theguardian', category: 'politics', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://mf.feeds.reuters.com/reuters/UKdomesticNews', source: 'Mf', category: 'politics', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.economist.com/blogs/blighty/index.xml', source: 'Economist', category: 'politics', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.economist.com/feeds/print-sections/76/britain.xml', source: 'Economist', category: 'politics', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.huffingtonpost.com/tag/uk-election/feed', source: 'Huffingtonpost', category: 'politics', scope: SCOPE_REGIONAL, region: 'europe' },
  // business
  { url: 'http://www.economist.com/sections/business-finance/rss.xml', source: 'Economist', category: 'business', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.theweek.co.uk/taxonomy/term/60/feed', source: 'Theweek', category: 'business', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://online.wsj.com/xml/rss/3_7031.xml', source: 'Online', category: 'business', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://blogs.wsj.com/moneybeat/category/europe/feed/?mod=WSJ_moneybeat_blog', source: 'Blogs', category: 'business', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.theguardian.com/theguardian/uk/business/rss', source: 'Theguardian', category: 'business', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://mf.feeds.reuters.com/reuters/UKVideoBusiness', source: 'Mf', category: 'business', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://rss.feedsportal.com/c/266/f/3510/index.rss', source: 'Feedsportal', category: 'business', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.telegraph.co.uk/finance/rss', source: 'Telegraph', category: 'business', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.thetimes.co.uk/tto/business/rss', source: 'Thetimes', category: 'business', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.ibtimes.co.uk/rss/uk', source: 'Ibtimes', category: 'business', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.ft.com/rss/home/europe', source: 'Ft', category: 'business', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://blogs.wsj.com/emergingeurope/feed/?mod=emergingeurope&mg=blogswsj&', source: 'Blogs', category: 'business', scope: SCOPE_REGIONAL, region: 'europe' },
  // technology
  { url: 'http://www.theguardian.com/technology/games/rss', source: 'Theguardian', category: 'technology', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.feedburner.com/uk/gizmodo', source: 'Uk', category: 'technology', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://rss.feedsportal.com/c/559/f/7174/index.rss', source: 'Feedsportal', category: 'technology', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.huffingtonpost.co.uk/feeds/verticals/uk-tech/index.xml', source: 'Huffingtonpost', category: 'technology', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://techcrunch.com/europe/feed/', source: 'Techcrunch', category: 'technology', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.techrepublic.com/rssfeeds/blog/european-technology/', source: 'Techrepublic', category: 'technology', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.theguardian.com/theguardian/technology/rss', source: 'Theguardian', category: 'technology', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://blogs.technet.com/b/uktechnet/rss.aspx', source: 'Blogs', category: 'technology', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://blogs.which.co.uk/technology/feed/atom/', source: 'Blogs', category: 'technology', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.webservice.techradar.com/rss/new', source: 'Webservice', category: 'technology', scope: SCOPE_REGIONAL, region: 'europe' },
  // gaming
  { url: 'http://feeds.feedburner.com/daily-star-Gaming', source: 'Daily Star Gaming', category: 'gaming', scope: SCOPE_REGIONAL, region: 'europe' },
  // entertainment
  { url: 'http://metro.co.uk/entertainment/gaming/feed/', source: 'Metro', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.express.co.uk/posts/rss/79/showbiznews', source: 'Express', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://metro.co.uk/entertainment/showbiz/feed/', source: 'Metro', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.celebsnow.co.uk/feed', source: 'Celebsnow', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.standard.co.uk/showbiz/rss', source: 'Standard', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.theguardian.com/music/rss', source: 'Theguardian', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.feedburner.com/factmag', source: 'Factmag', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.uncut.co.uk/feed', source: 'Uncut', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.clashmusic.com/rss.xml', source: 'Clashmusic', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.theguardian.com/us/film/rss', source: 'Theguardian', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'https://uk.movies.yahoo.com/rss', source: 'Uk', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.bfi.org.uk/latest/feed', source: 'Bfi', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://metro.co.uk/entertainment/tv/feed/', source: 'Metro', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.telegraph.co.uk/culture/culturenews/rss', source: 'Telegraph', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.huffingtonpost.com/feeds/verticals/uk-entertainment/index.xml', source: 'Huffingtonpost', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://celebrity.uk.msn.com/RSS-Celebrity-Gossip.aspx', source: 'Celebrity', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://tv.uk.msn.com/blog/editor-rss.aspx', source: 'Tv', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.popsugar.co.uk/celebrity/feed', source: 'Popsugar', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.independent.co.uk/arts-entertainment/tv/rss', source: 'Independent', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.dailymail.co.uk/tvshowbiz/articles.rss', source: 'Dailymail', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.ok.co.uk/rss/entertainment', source: 'Ok', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.feedburner.com/the-edge-susu', source: 'The Edge Susu', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.bestdaily.co.uk/rss/zones/gb/all.xml', source: 'Bestdaily', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.tntmagazine.com/entertainment/rss', source: 'Tntmagazine', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.reveal.co.uk/rss/zones/gb/all.xml', source: 'Reveal', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.qthemusic.com/feed/', source: 'Qthemusic', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.theguardian.com/tv-and-radio/entertainment/rss', source: 'Theguardian', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'europe' },
  // health
  { url: 'http://www.theguardian.com/us/lifeandstyle/rss', source: 'Theguardian', category: 'health', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.theguardian.com/fashion/rss', source: 'Theguardian', category: 'health', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.theguardian.com/travel/rss', source: 'Theguardian', category: 'health', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.independent.co.uk/life-style/health-and-families/health-news/rss', source: 'Independent', category: 'health', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.express.co.uk/posts/rss/11/health', source: 'Express', category: 'health', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.thetimes.co.uk/tto/health/rss', source: 'Thetimes', category: 'health', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.huffingtonpost.com/feeds/verticals/uk-lifestyle/index.xml', source: 'Huffingtonpost', category: 'health', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.standard.co.uk/lifestyle/rss', source: 'Standard', category: 'health', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.telegraph.co.uk/health/rss', source: 'Telegraph', category: 'health', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.dailymail.co.uk/health/index.rss', source: 'Dailymail', category: 'health', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.ok.co.uk/rss/health', source: 'Ok', category: 'health', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.hellomagazine.com/rss.xml', source: 'Hellomagazine', category: 'health', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.mynaturallifestyle.co.uk/naturallifestyle/feed/', source: 'Mynaturallifestyle', category: 'health', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.candis.co.uk/feed/', source: 'Candis', category: 'health', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.soarmagazine.co.uk/feed/', source: 'Soarmagazine', category: 'health', scope: SCOPE_REGIONAL, region: 'europe' },
  // science
  { url: 'http://www.theguardian.com/uk/environment/rss', source: 'Theguardian', category: 'science', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.economist.com/sections/science-technology/rss.xml', source: 'Economist', category: 'science', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'https://www.newscientist.com/feed/home', source: 'Newscientist', category: 'science', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.theguardian.com/theguardian/science/rss', source: 'Theguardian', category: 'science', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.telegraph.co.uk/science/science-news/rss', source: 'Telegraph', category: 'science', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.dailymail.co.uk/sciencetech/articles.rss', source: 'Dailymail', category: 'science', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.ibtimes.co.uk/rss/science', source: 'Ibtimes', category: 'science', scope: SCOPE_REGIONAL, region: 'europe' },
  // sports
  { url: 'http://www.theguardian.com/football/rss', source: 'Theguardian', category: 'sports', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.theweek.co.uk/feeds/sport', source: 'Theweek', category: 'sports', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.mirror.co.uk/sport/rss.xml', source: 'Mirror', category: 'sports', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.feedburner.com/SportcoukNewsRssFeed', source: 'SportcoukNewsRssFeed', category: 'sports', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.standard.co.uk/sport/football/rss', source: 'Standard', category: 'sports', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.skysports.com/rss/0,20514,12040,00.xml', source: 'Skysports', category: 'sports', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.skysports.com/rss/0,20514,20876,00.xml', source: 'Skysports', category: 'sports', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.theguardian.com/theguardian/uk/sport/rss', source: 'Theguardian', category: 'sports', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://feeds.bbci.co.uk/sport/0/rss.xml?edition=uk', source: 'Bbci', category: 'sports', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.dailymail.co.uk/sport/index.rss', source: 'Dailymail', category: 'sports', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.huffingtonpost.co.uk/feeds/verticals/uk-sport/index.xml', source: 'Huffingtonpost', category: 'sports', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://www.telegraph.co.uk/sport/rss', source: 'Telegraph', category: 'sports', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://metro.co.uk/sport/feed/', source: 'Metro', category: 'sports', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://rss.feedsportal.com/c/266/f/3784/index.rss', source: 'Feedsportal', category: 'sports', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'https://uk.eurosport.yahoo.com/eurosport/tickerdb/sport/0.xml', source: 'Uk', category: 'sports', scope: SCOPE_REGIONAL, region: 'europe' },
  { url: 'http://mf.feeds.reuters.com/reuters/UKSportsNews', source: 'Mf', category: 'sports', scope: SCOPE_REGIONAL, region: 'europe' },

  // --- AU (81 feeds) ---
  // general
  { url: 'http://www.abc.net.au/news/feed/46182/rss.xml', source: 'Abc', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.feedburner.com/TheAustralianTheNationNews', source: 'TheAustralianTheNationNews', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.smh.com.au/rssheadlines/national.xml', source: 'Smh', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.theguardian.com/au/rss', source: 'Theguardian', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.abc.net.au/local/rss/sydney/news.xml', source: 'Abc', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.channelnewsasia.com/starterkit/servlet/cna/rss/asiapacific.xml', source: 'Channelnewsasia', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.brisbanetimes.com.au/rssheadlines/national.xml', source: 'Brisbanetimes', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.theage.com.au/rssheadlines/national.xml', source: 'Theage', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://au.ibtimes.com/rss/articles/countries/13.rss', source: 'Au', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://rss.nzherald.co.nz/rss/xml/nzhrsscid_000000002.xml', source: 'Nzherald', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.gmanetwork.com/news/rss/news', source: 'Gmanetwork', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.dailymail.co.uk/auhome/index.rss', source: 'Dailymail', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.feedburner.com/dailytelegraphnationalnewsndm?format=xml', source: 'Dailytelegraphnationalnewsndm', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.news.com.au/public/rss/2.0/bcm_top_stories_257.xml', source: 'News', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.news.com.au/public/rss/2.0/anow_topstories_250.xml', source: 'News', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.news.com.au/heraldsun/rss/heraldsun_news_morenews_2794.xml', source: 'News', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.news.com.au/public/rss/2.0/', source: 'News', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.news.com.au/public/rss/2.0/wtn_top_3368.xml', source: 'News', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.news.com.au/public/rss/2.0/au_national_affairs_news_13_3296.xml', source: 'News', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.abc.net.au/news/feed/1534/rss.xml', source: 'Abc', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.economist.com/topics/australia/index.xml', source: 'Economist', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.news.com.au/public/rss/2.0/business_top_stories_346.xml', source: 'News', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.abc.net.au/news/feed/51892/rss.xml', source: 'Abc', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.news.com.au/heraldsun/rss/heraldsun_news_business_2783.xml', source: 'News', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.news.com.au/public/rss/2.0/news_lifestyle_3171.xml', source: 'News', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.mensfitnessmagazine.com.au/topics/health-nutrition/feed/', source: 'Mensfitnessmagazine', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.news.com.au/public/rss/2.0/news_tech_506.xml', source: 'News', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.sbs.com.au/news/rss/news/science-technology.xml', source: 'Sbs', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.news.com.au/public/rss/2.0/fs_breaking_news_13.xml', source: 'News', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.abc.net.au/news/feed/45924/rss.xml', source: 'Abc', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.news.com.au/public/rss/2.0/news_sport_3168.xml', source: 'News', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.news.com.au/rss/newslocal/dt_nlocal_sport_3214.xml', source: 'News', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.news.com.au/heraldsun/rss/heraldsun_news_sport_2789.xml', source: 'News', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://wwos.ninemsn.com.au/rss/headlines/', source: 'Wwos', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.news.com.au/public/rss/2.0/ausit_exec_topstories_385.xml', source: 'News', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.news.com.au/heraldsun/rss/heraldsun_news_technology_2790.xml', source: 'News', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.news.com.au/entertainment', source: 'News', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.news.com.au/public/rss/2.0/cpost_news_entertainment_3329.xml', source: 'News', category: 'general', scope: SCOPE_REGIONAL, region: 'oceania' },
  // world
  { url: 'http://feeds.brisbanetimes.com.au/rssheadlines/world.xml', source: 'Brisbanetimes', category: 'world', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.theguardian.com/world/australian-politics/rss', source: 'Theguardian', category: 'world', scope: SCOPE_REGIONAL, region: 'oceania' },
  // politics
  { url: 'http://feeds.feedburner.com/TheAustralianPolitics', source: 'TheAustralianPolitics', category: 'politics', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.feedburner.com/TheAustralianMediaNews', source: 'TheAustralianMediaNews', category: 'politics', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.businessspectator.com.au/bs/rss.xml', source: 'Businessspectator', category: 'politics', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.abc.net.au/radionational/feed/3727018/rss.xml', source: 'Abc', category: 'politics', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.abc.net.au/radionational/feed/2884582/rss.xml', source: 'Abc', category: 'politics', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.pm.gov.au/rss-feeds/press-office', source: 'Pm', category: 'politics', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.rba.gov.au/rss/rss-cb-media-releases.xml', source: 'Rba', category: 'politics', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.crikey.com.au/politics/feed', source: 'Crikey', category: 'politics', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://mashable.com/category/australian-politics/rss/', source: 'Mashable', category: 'politics', scope: SCOPE_REGIONAL, region: 'oceania' },
  // business
  { url: 'http://www.cio.com/index.rss', source: 'Cio', category: 'business', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.dynamicbusiness.com.au/feed', source: 'Dynamicbusiness', category: 'business', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.feedburner.com/TheAustralianBusNews?format=xml', source: 'TheAustralianBusNews', category: 'business', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.feedburner.com/TheAustralianBusAviation?format=xml', source: 'TheAustralianBusAviation', category: 'business', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.feedburner.com/TheAustralianBusinessWorldBusNews?format=xml', source: 'TheAustralianBusinessWorldBusNews', category: 'business', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.smh.com.au/rssheadlines/business.xml', source: 'Smh', category: 'business', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://abns.com.au/feed/', source: 'Abns', category: 'business', scope: SCOPE_REGIONAL, region: 'oceania' },
  // health
  { url: 'http://www.smh.com.au/rssheadlines/health/article/rss.xml', source: 'Smh', category: 'health', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.shapemagazine.com.au/feed/', source: 'Shapemagazine', category: 'health', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.alive.com/articles/rss', source: 'Alive', category: 'health', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.wellbeing.com.au/blog/feed/', source: 'Wellbeing', category: 'health', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.dailyrecord.co.uk/lifestyle/health-fitness/rss.xml', source: 'Dailyrecord', category: 'health', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.starobserver.com.au/category/features/healthy-living/feed', source: 'Starobserver', category: 'health', scope: SCOPE_REGIONAL, region: 'oceania' },
  // technology
  { url: 'http://www.theage.com.au/rssheadlines/technology-news/article/rss.xml', source: 'Theage', category: 'technology', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.watoday.com.au/rssheadlines/technology-news/article/rss.xml', source: 'Watoday', category: 'technology', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.gizmodo.com.au/gizmodoaustraliaau', source: 'Gizmodo', category: 'technology', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.smh.com.au/rssheadlines/technology-news/article/rss.xml', source: 'Smh', category: 'technology', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://techau.com.au/feed/', source: 'Techau', category: 'technology', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.techrepublic.com/rssfeeds/blog/australian-technology/', source: 'Techrepublic', category: 'technology', scope: SCOPE_REGIONAL, region: 'oceania' },
  // science
  { url: 'http://www.australianscience.com.au/feed/', source: 'Australianscience', category: 'science', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.scienceweek.net.au/homepage/feed/', source: 'Scienceweek', category: 'science', scope: SCOPE_REGIONAL, region: 'oceania' },
  // sports
  { url: 'http://feeds.feedburner.com/TheAustralianSportsNews', source: 'TheAustralianSportsNews', category: 'sports', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.smh.com.au/rssheadlines/sport.xml', source: 'Smh', category: 'sports', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.theage.com.au/rssheadlines/sport.xml', source: 'Theage', category: 'sports', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.bbci.co.uk/sport/0/cricket/rss.xml?edition=uk', source: 'Bbci', category: 'sports', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://sbs.feedsportal.com/c/34692/f/637526/index.rss', source: 'Sbs', category: 'sports', scope: SCOPE_REGIONAL, region: 'oceania' },
  // entertainment
  { url: 'http://www.goldcoastbulletin.com.au/entertainment', source: 'Goldcoastbulletin', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.spotlightreport.net/feed', source: 'Spotlightreport', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.popsugar.com.au/celebrity/feed', source: 'Popsugar', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.okmagazine.com.au/rss.axd?channel=entertainment_articles', source: 'Okmagazine', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://www.studiotv.com.au/feed/', source: 'Studiotv', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'oceania' },
  { url: 'http://feeds.feedburner.com/sunshinecoastdailyentertainmen', source: 'Sunshinecoastdailyentertainmen', category: 'entertainment', scope: SCOPE_REGIONAL, region: 'oceania' },

];

// City-to-region mapping for local news fallback
const CITY_REGIONS = {
  // North America - USA
  'new york': 'north_america', 'nyc': 'north_america', 'manhattan': 'north_america', 'brooklyn': 'north_america',
  'queens': 'north_america', 'bronx': 'north_america', 'long island': 'north_america',
  'los angeles': 'north_america', 'la': 'north_america', 'hollywood': 'north_america',
  'chicago': 'north_america', 'houston': 'north_america', 'dallas': 'north_america', 'fort worth': 'north_america',
  'dfw': 'north_america', 'miami': 'north_america', 'orlando': 'north_america',
  'san francisco': 'north_america', 'sf': 'north_america', 'bay area': 'north_america',
  'san jose': 'north_america', 'silicon valley': 'north_america', 'sacramento': 'north_america',
  'seattle': 'north_america', 'denver': 'north_america', 'boston': 'north_america',
  'philadelphia': 'north_america', 'philly': 'north_america', 'washington dc': 'north_america', 'dc': 'north_america',
  'atlanta': 'north_america', 'baltimore': 'north_america', 'cleveland': 'north_america',
  'minneapolis': 'north_america', 'st paul': 'north_america', 'twin cities': 'north_america',
  'charlotte': 'north_america', 'phoenix': 'north_america', 'san diego': 'north_america',
  'austin': 'north_america', 'san antonio': 'north_america', 'las vegas': 'north_america',
  'portland': 'north_america', 'detroit': 'north_america', 'nashville': 'north_america',
  // North America - Canada
  'toronto': 'north_america', 'vancouver': 'north_america', 'montreal': 'north_america',
  'calgary': 'north_america', 'ottawa': 'north_america', 'edmonton': 'north_america',

  // Europe
  'london': 'europe', 'paris': 'europe', 'berlin': 'europe', 'madrid': 'europe', 'barcelona': 'europe',
  'rome': 'europe', 'milan': 'europe', 'amsterdam': 'europe', 'brussels': 'europe', 'vienna': 'europe',
  'munich': 'europe', 'frankfurt': 'europe', 'zurich': 'europe', 'geneva': 'europe', 'lisbon': 'europe',
  'dublin': 'europe', 'stockholm': 'europe', 'copenhagen': 'europe', 'oslo': 'europe', 'helsinki': 'europe',
  'prague': 'europe', 'budapest': 'europe', 'warsaw': 'europe', 'athens': 'europe',

  // Asia
  'tokyo': 'east_asia', 'beijing': 'east_asia', 'shanghai': 'east_asia', 'hong kong': 'east_asia',
  'seoul': 'east_asia', 'taipei': 'east_asia', 'singapore': 'southeast_asia', 'bangkok': 'southeast_asia',
  'kuala lumpur': 'southeast_asia', 'jakarta': 'southeast_asia', 'manila': 'southeast_asia', 'ho chi minh': 'southeast_asia',
  'mumbai': 'south_asia', 'delhi': 'south_asia', 'bangalore': 'south_asia', 'chennai': 'south_asia',
  'kolkata': 'south_asia', 'karachi': 'south_asia', 'dhaka': 'south_asia',

  // Middle East
  'dubai': 'middle_east', 'abu dhabi': 'middle_east', 'doha': 'middle_east', 'riyadh': 'middle_east',
  'tel aviv': 'middle_east', 'jerusalem': 'middle_east', 'istanbul': 'middle_east', 'cairo': 'middle_east',

  // Africa
  'johannesburg': 'africa', 'cape town': 'africa', 'nairobi': 'africa', 'lagos': 'africa',
  'cairo': 'africa', 'casablanca': 'africa', 'accra': 'africa', 'addis ababa': 'africa',

  // Latin America
  'mexico city': 'latin_america', 'sao paulo': 'latin_america', 'são paulo': 'latin_america',
  'rio de janeiro': 'latin_america', 'rio': 'latin_america', 'brasilia': 'latin_america',
  'brasília': 'latin_america', 'distrito federal': 'latin_america', 'df': 'latin_america',
  'belo horizonte': 'latin_america', 'salvador': 'latin_america', 'fortaleza': 'latin_america',
  'curitiba': 'latin_america', 'recife': 'latin_america', 'porto alegre': 'latin_america',
  'manaus': 'latin_america', 'belem': 'latin_america', 'belém': 'latin_america',
  'goiania': 'latin_america', 'goiânia': 'latin_america', 'campinas': 'latin_america',
  'campo grande': 'latin_america', 'florianopolis': 'latin_america', 'florianópolis': 'latin_america',
  'vitoria': 'latin_america', 'vitória': 'latin_america', 'natal': 'latin_america',
  'londrina': 'latin_america', 'maringa': 'latin_america', 'maringá': 'latin_america',
  'foz do iguacu': 'latin_america', 'foz do iguaçu': 'latin_america', 'parana': 'latin_america', 'paraná': 'latin_america',
  'buenos aires': 'latin_america', 'bogota': 'latin_america', 'lima': 'latin_america',
  'santiago': 'latin_america', 'caracas': 'latin_america', 'havana': 'latin_america',

  // Oceania
  'sydney': 'oceania', 'melbourne': 'oceania', 'brisbane': 'oceania', 'perth': 'oceania',
  'auckland': 'oceania', 'wellington': 'oceania',
};

// Get all available cities for selection
const getAvailableCities = () => {
  const cities = new Set();
  RSS_SOURCES.forEach(source => {
    if (source.cities) {
      source.cities.forEach(city => cities.add(city.toLowerCase()));
    }
  });
  return [...cities].sort();
};

// Export available cities
export const availableCities = getAvailableCities();

// Keywords for market relevance scoring
const MARKET_KEYWORDS = {
  high: [
    'sanctions', 'tariff', 'trade war', 'central bank', 'interest rate', 'fed', 'ecb',
    'inflation', 'gdp', 'recession', 'default', 'debt ceiling', 'fiscal', 'monetary',
    'opec', 'oil price', 'gas price', 'commodity', 'currency', 'devaluation',
    'war', 'conflict', 'invasion', 'military', 'nuclear', 'attack',
    'election', 'coup', 'regime', 'government collapse', 'political crisis',
    'supply chain', 'shortage', 'embargo', 'blockade', 'export ban',
    'tech ban', 'chip', 'semiconductor', 'rare earth', 'critical minerals'
  ],
  medium: [
    'policy', 'regulation', 'legislation', 'bill', 'law', 'treaty',
    'summit', 'negotiation', 'diplomatic', 'alliance', 'partnership',
    'investment', 'acquisition', 'merger', 'ipo', 'earnings',
    'unemployment', 'jobs', 'manufacturing', 'industrial', 'production',
    'protest', 'strike', 'unrest', 'demonstration', 'riot'
  ],
  low: [
    'statement', 'comment', 'speech', 'interview', 'report', 'analysis',
    'meeting', 'visit', 'ceremony', 'anniversary', 'commemoration'
  ]
};

// Region-market mappings
const REGION_EXPOSURE = {
  'china': ['FXI', 'KWEB', 'BABA', 'copper', 'CNY', 'semiconductors', 'rare earth'],
  'russia': ['RSX', 'oil', 'gas', 'wheat', 'RUB', 'palladium', 'nickel'],
  'ukraine': ['wheat', 'corn', 'sunflower', 'neon', 'European defense'],
  'middle east': ['oil', 'XLE', 'defense', 'gold', 'safe havens'],
  'iran': ['oil', 'shipping', 'defense', 'gold'],
  'taiwan': ['semiconductors', 'TSM', 'INTC', 'NVDA', 'AMD', 'tech supply chain'],
  'europe': ['EUR', 'DAX', 'gas', 'EWG', 'European banks'],
  'japan': ['JPY', 'EWJ', 'JGB', 'auto', 'electronics'],
  'india': ['INDA', 'INR', 'pharmaceuticals', 'IT services'],
  'brazil': ['EWZ', 'BRL', 'soybeans', 'iron ore', 'coffee'],
  'mexico': ['EWW', 'MXN', 'nearshoring', 'auto manufacturing'],
  'saudi arabia': ['oil', 'OPEC', 'KSA', 'petrodollar'],
  'united states': ['SPY', 'USD', 'treasuries', 'tech', 'defense'],
  'united kingdom': ['GBP', 'EWU', 'gilts', 'financial services'],
};

// Transmission channels
const TRANSMISSION_CHANNELS = {
  sanctions: 'Policy -> Trade Restriction -> Supply -> Pricing',
  tariff: 'Policy -> Trade Cost -> Import Price -> Consumer Price',
  'interest rate': 'Monetary Policy -> Credit Cost -> Investment -> Growth',
  'central bank': 'Monetary Policy -> Currency -> Competitiveness -> Trade',
  war: 'Conflict -> Supply Disruption -> Commodity Price -> Inflation',
  conflict: 'Conflict -> Risk Premium -> Safe Haven Flows -> Asset Reallocation',
  election: 'Political Change -> Policy Uncertainty -> Market Volatility',
  'supply chain': 'Disruption -> Shortage -> Price Spike -> Margin Compression',
  oil: 'Energy Price -> Input Cost -> Transportation -> Broad Inflation',
  semiconductor: 'Tech Supply -> Production Bottleneck -> Sector Impact -> Tech Valuations',
};

// Normalize date to ISO format with robust parsing
// Returns null for missing/invalid dates (these items will be filtered out)
function normalizeDate(dateInput) {
  if (!dateInput) return null;

  try {
    const date = new Date(dateInput);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('[NewsAggregator] Invalid date:', dateInput);
      return null;
    }

    // Reject dates in the future (likely parsing errors)
    const now = new Date();
    if (date > now) {
      // Allow up to 1 hour in future (timezone issues)
      if (date.getTime() - now.getTime() > 3600000) {
        console.warn('[NewsAggregator] Future date rejected:', dateInput);
        return null;
      }
    }

    // Reject dates older than 7 days (stale content)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (date < sevenDaysAgo) {
      return null; // Silently filter old content
    }

    return date.toISOString();
  } catch (e) {
    console.warn('[NewsAggregator] Date parse error:', dateInput, e.message);
    return null;
  }
}

function scoreMarketRelevance(title, content) {
  const text = `${title} ${content}`.toLowerCase();
  let score = 0;

  MARKET_KEYWORDS.high.forEach(kw => {
    if (text.includes(kw)) score += 3;
  });
  MARKET_KEYWORDS.medium.forEach(kw => {
    if (text.includes(kw)) score += 1.5;
  });
  MARKET_KEYWORDS.low.forEach(kw => {
    if (text.includes(kw)) score += 0.5;
  });

  return Math.min(score, 10); // Cap at 10
}

function detectRegions(text) {
  const regions = [];
  const textLower = text.toLowerCase();

  Object.keys(REGION_EXPOSURE).forEach(region => {
    if (textLower.includes(region)) {
      regions.push(region);
    }
  });

  // Additional country detection
  const countries = [
    'china', 'chinese', 'beijing', 'russia', 'russian', 'moscow', 'putin',
    'ukraine', 'ukrainian', 'kyiv', 'iran', 'iranian', 'tehran',
    'taiwan', 'taiwanese', 'taipei', 'israel', 'israeli', 'palestine',
    'saudi', 'arabia', 'riyadh', 'turkey', 'turkish', 'ankara',
    'germany', 'german', 'berlin', 'france', 'french', 'paris',
    'japan', 'japanese', 'tokyo', 'india', 'indian', 'delhi', 'modi',
    'brazil', 'brazilian', 'mexico', 'mexican', 'venezuela',
    'north korea', 'pyongyang', 'kim jong', 'south korea', 'seoul'
  ];

  countries.forEach(country => {
    if (textLower.includes(country)) {
      // Map to region
      if (country.includes('china') || country.includes('beijing')) regions.push('china');
      if (country.includes('russia') || country.includes('moscow') || country.includes('putin')) regions.push('russia');
      if (country.includes('ukrain') || country.includes('kyiv')) regions.push('ukraine');
      if (country.includes('iran') || country.includes('tehran')) regions.push('iran');
      if (country.includes('taiwan') || country.includes('taipei')) regions.push('taiwan');
      if (country.includes('japan') || country.includes('tokyo')) regions.push('japan');
      if (country.includes('india') || country.includes('delhi') || country.includes('modi')) regions.push('india');
      if (country.includes('brazil')) regions.push('brazil');
      if (country.includes('mexico')) regions.push('mexico');
      if (country.includes('saudi') || country.includes('riyadh')) regions.push('saudi arabia');
      if (country.includes('german') || country.includes('berlin')) regions.push('europe');
      if (country.includes('france') || country.includes('paris')) regions.push('europe');
    }
  });

  return [...new Set(regions)];
}

function getExposedMarkets(regions) {
  const markets = new Set();
  regions.forEach(region => {
    const regionMarkets = REGION_EXPOSURE[region] || [];
    regionMarkets.forEach(m => markets.add(m));
  });
  return [...markets];
}

function detectTransmissionChannel(text) {
  const textLower = text.toLowerCase();
  for (const [keyword, channel] of Object.entries(TRANSMISSION_CHANNELS)) {
    if (textLower.includes(keyword)) {
      return channel;
    }
  }
  return 'Information -> Sentiment -> Positioning -> Price';
}

function determineSignalStrength(item) {
  const text = `${item.title} ${item.contentSnippet || ''}`.toLowerCase();

  // Check for confirmation language
  const confirmedPatterns = ['announced', 'confirmed', 'signed', 'enacted', 'passed', 'approved', 'invaded', 'attacked'];
  const buildingPatterns = ['considering', 'planning', 'expected to', 'likely to', 'preparing', 'negotiating', 'talks'];
  const earlyPatterns = ['may', 'could', 'might', 'rumor', 'speculation', 'sources say', 'reportedly'];

  for (const pattern of confirmedPatterns) {
    if (text.includes(pattern)) return 'confirmed';
  }
  for (const pattern of buildingPatterns) {
    if (text.includes(pattern)) return 'building';
  }
  for (const pattern of earlyPatterns) {
    if (text.includes(pattern)) return 'early';
  }

  return 'building';
}

function generateWhyItMatters(item, regions, score) {
  const text = `${item.title} ${item.contentSnippet || ''}`.toLowerCase();
  const matters = [];

  if (text.includes('sanction')) {
    matters.push('Sanctions affect trade flows, currency valuations, and commodity supply chains');
  }
  if (text.includes('tariff') || text.includes('trade war')) {
    matters.push('Trade restrictions impact import costs, corporate margins, and consumer prices');
  }
  if (text.includes('interest rate') || text.includes('central bank') || text.includes('fed ')) {
    matters.push('Monetary policy shifts affect currency strength, borrowing costs, and equity valuations');
  }
  if (text.includes('war') || text.includes('conflict') || text.includes('military')) {
    matters.push('Military developments drive risk premiums, commodity prices, and safe-haven flows');
  }
  if (text.includes('election') || text.includes('vote')) {
    matters.push('Electoral outcomes can shift policy direction, regulatory environment, and market sentiment');
  }
  if (text.includes('oil') || text.includes('opec') || text.includes('energy')) {
    matters.push('Energy prices are a key input cost affecting inflation and corporate margins globally');
  }
  if (text.includes('semiconductor') || text.includes('chip')) {
    matters.push('Semiconductor supply affects technology sector, auto industry, and manufacturing capacity');
  }
  if (text.includes('supply chain')) {
    matters.push('Supply disruptions lead to shortages, price increases, and production delays');
  }

  if (matters.length === 0 && score > 3) {
    matters.push('Developments in this area historically correlate with market volatility and sector rotation');
  }

  return matters.length > 0 ? matters[0] : 'Monitor for second-order effects on related markets';
}

function isNewInformation(item, existingNews) {
  // Check if this is substantially new vs repetition
  const titleWords = item.title.toLowerCase().split(' ').filter(w => w.length > 4);

  for (const existing of existingNews) {
    const existingWords = existing.title.toLowerCase().split(' ').filter(w => w.length > 4);
    const overlap = titleWords.filter(w => existingWords.includes(w)).length;
    if (overlap / titleWords.length > 0.6) {
      return false; // More than 60% word overlap - likely repetition
    }
  }
  return true;
}

async function fetchFeed(source) {
  try {
    const feed = await parser.parseURL(source.url);
    return feed.items.slice(0, 15).map(item => ({
      ...item,
      feedSource: source.source,
      feedCategory: source.category,
      feedScope: source.scope || SCOPE_INTERNATIONAL,
      feedRegion: source.region || null,
      feedCities: source.cities || null
    }));
  } catch (error) {
    console.error(`[NewsAggregator] Failed to fetch ${source.source}:`, error.message);
    return [];
  }
}

export const newsAggregator = {
  async getLatest() {
    const cached = cache.get('news');
    if (cached) return cached;

    console.log('[NewsAggregator] Fetching from', RSS_SOURCES.length, 'sources...');

    // Fetch all feeds in parallel
    const feedPromises = RSS_SOURCES.map(source => fetchFeed(source));
    const feedResults = await Promise.all(feedPromises);

    // Flatten all items
    let allItems = feedResults.flat();
    console.log('[NewsAggregator] Raw items:', allItems.length);

    // Process and enrich each item
    const processedItems = [];
    const seenTitles = new Set();

    for (const item of allItems) {
      // Skip items without title
      if (!item.title) continue;

      // Deduplicate
      const titleKey = item.title.toLowerCase().slice(0, 50);
      if (seenTitles.has(titleKey)) continue;
      seenTitles.add(titleKey);

      // Validate and normalize date - skip items with invalid/missing dates
      const pubDate = normalizeDate(item.pubDate || item.isoDate);
      if (!pubDate) continue; // Skip items without valid recent dates

      const text = `${item.title} ${item.contentSnippet || ''}`;
      const relevanceScore = scoreMarketRelevance(item.title, item.contentSnippet || '');

      // For international/regional news, require market relevance
      // For local news, include all items regardless of market relevance
      const isLocalNews = item.feedScope === SCOPE_LOCAL;
      if (!isLocalNews && relevanceScore < 1) continue;

      const regions = detectRegions(text);
      const exposedMarkets = getExposedMarkets(regions);

      processedItems.push({
        id: Buffer.from(item.title + pubDate).toString('base64').slice(0, 16),
        title: item.title,
        summary: item.contentSnippet || '',
        source: item.feedSource,
        category: item.feedCategory,
        link: item.link,
        pubDate,
        relevanceScore,
        signalStrength: determineSignalStrength(item),
        regions,
        exposedMarkets,
        transmissionChannel: detectTransmissionChannel(text),
        whyItMatters: generateWhyItMatters(item, regions, relevanceScore),
        isNew: isNewInformation(item, processedItems),
        isSignal: relevanceScore >= 5,
        // Location-based fields
        scope: item.feedScope,
        feedRegion: item.feedRegion,
        cities: item.feedCities,
        // Image from RSS feed
        image: extractImageUrl(item),
      });
    }

    // Sort by date (newest first) - frontend handles relevance sorting
    processedItems.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return dateB - dateA;
    });

    // Increased limit to accommodate expanded sources
    const result = processedItems.slice(0, 1000);
    cache.set('news', result);

    return result;
  },

  // Get news filtered by user location (city)
  async getLatestByLocation(userCity = null) {
    const allNews = await this.getLatest();

    if (!userCity) {
      // No city selected - return only international news
      return allNews.filter(item => item.scope === SCOPE_INTERNATIONAL);
    }

    const cityLower = userCity.toLowerCase();
    const userRegion = CITY_REGIONS[cityLower];

    // Build the filtered feed:
    // 1. All international news
    // 2. Regional news matching user's region
    // 3. Local news matching user's city
    return allNews.filter(item => {
      // Always include international news
      if (item.scope === SCOPE_INTERNATIONAL) return true;

      // Include regional news if user's city is in that region
      if (item.scope === SCOPE_REGIONAL && userRegion && item.feedRegion === userRegion) {
        return true;
      }

      // Include local news if it matches user's city
      if (item.scope === SCOPE_LOCAL && item.cities) {
        return item.cities.some(city => city.toLowerCase() === cityLower);
      }

      return false;
    });
  },

  // Get list of available cities for selection
  getAvailableCities() {
    return availableCities;
  },

  // Get city-to-region mapping
  getCityRegions() {
    return CITY_REGIONS;
  },

  // Group news by narrative/theme
  clusterByNarrative(news) {
    const clusters = {
      'US-China Relations': [],
      'Russia-Ukraine Conflict': [],
      'Middle East Tensions': [],
      'Central Bank Policy': [],
      'Trade & Tariffs': [],
      'Energy Markets': [],
      'Tech & Semiconductors': [],
      'Elections & Politics': [],
      'Other Developments': []
    };

    news.forEach(item => {
      const text = `${item.title} ${item.summary}`.toLowerCase();

      if (text.includes('china') && (text.includes('us') || text.includes('america') || text.includes('tariff') || text.includes('trade'))) {
        clusters['US-China Relations'].push(item);
      } else if (text.includes('russia') || text.includes('ukraine') || text.includes('putin') || text.includes('kyiv')) {
        clusters['Russia-Ukraine Conflict'].push(item);
      } else if (text.includes('israel') || text.includes('iran') || text.includes('saudi') || text.includes('gaza') || text.includes('houthi')) {
        clusters['Middle East Tensions'].push(item);
      } else if (text.includes('fed ') || text.includes('ecb') || text.includes('central bank') || text.includes('interest rate') || text.includes('monetary')) {
        clusters['Central Bank Policy'].push(item);
      } else if (text.includes('tariff') || text.includes('trade') || text.includes('export') || text.includes('import') || text.includes('sanction')) {
        clusters['Trade & Tariffs'].push(item);
      } else if (text.includes('oil') || text.includes('gas') || text.includes('opec') || text.includes('energy')) {
        clusters['Energy Markets'].push(item);
      } else if (text.includes('semiconductor') || text.includes('chip') || text.includes('tech') || text.includes('ai ') || text.includes('nvidia')) {
        clusters['Tech & Semiconductors'].push(item);
      } else if (text.includes('election') || text.includes('vote') || text.includes('parliament') || text.includes('congress')) {
        clusters['Elections & Politics'].push(item);
      } else {
        clusters['Other Developments'].push(item);
      }
    });

    return Object.fromEntries(
      Object.entries(clusters).filter(([_, items]) => items.length > 0)
    );
  }
};
