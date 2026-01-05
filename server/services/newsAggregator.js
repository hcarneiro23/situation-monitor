import Parser from 'rss-parser';
import axios from 'axios';
import NodeCache from 'node-cache';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; SituationMonitor/1.0)'
  }
});

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
];

// City-to-region mapping for local news fallback
const CITY_REGIONS = {
  // North America
  'new york': 'north_america', 'nyc': 'north_america', 'los angeles': 'north_america', 'chicago': 'north_america',
  'houston': 'north_america', 'dallas': 'north_america', 'miami': 'north_america', 'san francisco': 'north_america',
  'seattle': 'north_america', 'denver': 'north_america', 'boston': 'north_america', 'philadelphia': 'north_america',
  'washington dc': 'north_america', 'atlanta': 'north_america', 'toronto': 'north_america', 'vancouver': 'north_america',
  'montreal': 'north_america', 'calgary': 'north_america', 'ottawa': 'north_america', 'edmonton': 'north_america',

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
  'mexico city': 'latin_america', 'sao paulo': 'latin_america', 'rio de janeiro': 'latin_america',
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
      });
    }

    // Sort by date (newest first) - frontend handles relevance sorting
    processedItems.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return dateB - dateA;
    });

    // Increased limit to accommodate expanded sources
    const result = processedItems.slice(0, 200);
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
