import type { MeetingCitation } from '@/lib/meetings';
import {
  getCachedSignalRecord,
  isCacheFresh,
  upsertCachedSignalRecord,
  type CachedSignalRecord,
} from '@/lib/live-signals';

export interface MacroMetric {
  label: string;
  indicator: string;
  value: number | null;
  valueText: string;
  year: string | null;
  sourceLabel: string;
  sourceUrl: string;
}

export interface MacroCountrySnapshot {
  code: string;
  name: string;
  metrics: {
    gdpGrowth: MacroMetric;
    gdpPerCapita: MacroMetric;
    inflation: MacroMetric;
    population: MacroMetric;
    policyRate: MacroMetric;
  };
}

export interface MacroComparisonSnapshot {
  countries: MacroCountrySnapshot[];
  fetchedAt: string;
  stale: boolean;
}

const MACRO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const COUNTRY_ALIASES: Record<string, { code: string; name: string }> = {
  thailand: { code: 'TH', name: 'Thailand' },
  thai: { code: 'TH', name: 'Thailand' },
  bangkok: { code: 'TH', name: 'Thailand' },
  singapore: { code: 'SG', name: 'Singapore' },
  vietnam: { code: 'VN', name: 'Vietnam' },
  indonesia: { code: 'ID', name: 'Indonesia' },
  malaysia: { code: 'MY', name: 'Malaysia' },
  philippines: { code: 'PH', name: 'Philippines' },
  china: { code: 'CN', name: 'China' },
  japan: { code: 'JP', name: 'Japan' },
  korea: { code: 'KR', name: 'South Korea' },
  'korea south': { code: 'KR', name: 'South Korea' },
  usa: { code: 'US', name: 'United States' },
  us: { code: 'US', name: 'United States' },
  america: { code: 'US', name: 'United States' },
  'united states': { code: 'US', name: 'United States' },
};

const INDICATORS = {
  gdpGrowth: {
    indicator: 'NY.GDP.MKTP.KD.ZG',
    label: 'GDP Growth',
  },
  gdpPerCapita: {
    indicator: 'NY.GDP.PCAP.CD',
    label: 'GDP per Capita',
  },
  inflation: {
    indicator: 'FP.CPI.TOTL.ZG',
    label: 'Inflation',
  },
  population: {
    indicator: 'SP.POP.TOTL',
    label: 'Population',
  },
} as const;

const POLICY_RATE_NOTES: Record<
  string,
  {
    valueText: string;
    sourceLabel: string;
    sourceUrl: string;
  }
> = {
  TH: {
    valueText: 'See Bank of Thailand policy-rate page',
    sourceLabel: 'Bank of Thailand',
    sourceUrl: 'https://www.bot.or.th/en/thai-economy/monetary-policy/policy-rate.html',
  },
  SG: {
    valueText: 'MAS uses an exchange-rate band, not a single policy rate',
    sourceLabel: 'Monetary Authority of Singapore',
    sourceUrl: 'https://www.mas.gov.sg/monetary-policy',
  },
  VN: {
    valueText: 'See State Bank of Vietnam refinancing-rate notices',
    sourceLabel: 'State Bank of Vietnam',
    sourceUrl: 'https://www.sbv.gov.vn/',
  },
  ID: {
    valueText: 'See Bank Indonesia BI-Rate page',
    sourceLabel: 'Bank Indonesia',
    sourceUrl: 'https://www.bi.go.id/en/moneter/bi-rate/default.aspx',
  },
  MY: {
    valueText: 'See Bank Negara Malaysia OPR page',
    sourceLabel: 'Bank Negara Malaysia',
    sourceUrl: 'https://www.bnm.gov.my/opr-decisions-and-statements',
  },
  PH: {
    valueText: 'See BSP policy-setting announcements',
    sourceLabel: 'Bangko Sentral ng Pilipinas',
    sourceUrl: 'https://www.bsp.gov.ph/SitePages/PriceStability/MonetaryPolicy.aspx',
  },
  CN: {
    valueText: 'See PBOC policy tools and benchmark-rate notices',
    sourceLabel: "People's Bank of China",
    sourceUrl: 'http://www.pbc.gov.cn/en/3688110/index.html',
  },
  JP: {
    valueText: 'See Bank of Japan monetary-policy statements',
    sourceLabel: 'Bank of Japan',
    sourceUrl: 'https://www.boj.or.jp/en/mopo/mpmdeci/index.htm',
  },
  KR: {
    valueText: 'See Bank of Korea Base Rate decisions',
    sourceLabel: 'Bank of Korea',
    sourceUrl: 'https://www.bok.or.kr/eng/main/contents.do?menuNo=400185',
  },
  US: {
    valueText: 'See Federal Reserve target range',
    sourceLabel: 'Federal Reserve',
    sourceUrl: 'https://www.federalreserve.gov/monetarypolicy/openmarket.htm',
  },
};

function formatMetricValue(indicator: keyof typeof INDICATORS, value: number | null) {
  if (value == null || Number.isNaN(value)) {
    return 'Unavailable';
  }

  if (indicator === 'population') {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  if (indicator === 'gdpPerCapita') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }

  return `${value.toFixed(1)}%`;
}

function getWorldBankIndicatorUrl(countryCode: string, indicator: string) {
  return `https://api.worldbank.org/v2/country/${countryCode.toLowerCase()}/indicator/${indicator}?format=json&mrv=1`;
}

async function fetchLatestWorldBankMetric(
  countryCode: string,
  indicator: keyof typeof INDICATORS
): Promise<MacroMetric> {
  const { indicator: indicatorCode, label } = INDICATORS[indicator];
  const sourceUrl = getWorldBankIndicatorUrl(countryCode, indicatorCode);
  const response = await fetch(sourceUrl, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`World Bank returned ${response.status} for ${countryCode}/${indicatorCode}`);
  }

  const payload = (await response.json()) as [unknown, Array<{ value: number | null; date: string }>];
  const data = Array.isArray(payload) && Array.isArray(payload[1]) ? payload[1][0] : null;
  const value = data && typeof data.value === 'number' ? data.value : null;
  const year = data && typeof data.date === 'string' ? data.date : null;

  return {
    label,
    indicator: indicatorCode,
    value,
    valueText: formatMetricValue(indicator, value),
    year,
    sourceLabel: 'World Bank Indicators API',
    sourceUrl,
  };
}

function buildPolicyMetric(countryCode: string): MacroMetric {
  const note = POLICY_RATE_NOTES[countryCode] ?? {
    valueText: 'Official policy source linked',
    sourceLabel: 'Central bank source',
    sourceUrl: 'https://www.worldbank.org/',
  };

  return {
    label: 'Policy Rate',
    indicator: 'policy-rate',
    value: null,
    valueText: note.valueText,
    year: null,
    sourceLabel: note.sourceLabel,
    sourceUrl: note.sourceUrl,
  };
}

async function fetchCountrySnapshot(country: { code: string; name: string }): Promise<MacroCountrySnapshot> {
  const [gdpGrowth, gdpPerCapita, inflation, population] = await Promise.all([
    fetchLatestWorldBankMetric(country.code, 'gdpGrowth'),
    fetchLatestWorldBankMetric(country.code, 'gdpPerCapita'),
    fetchLatestWorldBankMetric(country.code, 'inflation'),
    fetchLatestWorldBankMetric(country.code, 'population'),
  ]);

  return {
    code: country.code,
    name: country.name,
    metrics: {
      gdpGrowth,
      gdpPerCapita,
      inflation,
      population,
      policyRate: buildPolicyMetric(country.code),
    },
  };
}

function sortAndDedupeCountries(countries: Array<{ code: string; name: string }>) {
  const seen = new Set<string>();
  return countries
    .filter(country => {
      if (seen.has(country.code)) {
        return false;
      }
      seen.add(country.code);
      return true;
    })
    .sort((left, right) => left.code.localeCompare(right.code));
}

export function extractCountryMatches(text: string) {
  const lower = text.toLowerCase();
  const matches = Object.entries(COUNTRY_ALIASES)
    .filter(([alias]) => lower.includes(alias))
    .map(([, country]) => country);

  const unique = sortAndDedupeCountries(matches);
  if (unique.length > 0) {
    return unique.slice(0, 3);
  }

  return [
    COUNTRY_ALIASES.thailand,
    COUNTRY_ALIASES.singapore,
  ];
}

function buildCacheArea(countries: Array<{ code: string }>) {
  return countries.map(country => country.code).sort().join('-');
}

function mapCachedMacroRecord(
  record: CachedSignalRecord<MacroComparisonSnapshot> | null
): MacroComparisonSnapshot | null {
  if (!record) {
    return null;
  }

  return {
    ...record.payload,
    fetchedAt: record.fetchedAt,
    stale: record.status !== 'fresh',
  };
}

export async function getMacroComparisonSnapshot(transcript: string): Promise<MacroComparisonSnapshot> {
  const countries = extractCountryMatches(transcript);
  const area = buildCacheArea(countries);
  const cached = await getCachedSignalRecord<MacroComparisonSnapshot>('macro-comparison', area);

  if (cached && isCacheFresh(cached.fetchedAt, MACRO_CACHE_TTL_MS)) {
    return mapCachedMacroRecord(cached) as MacroComparisonSnapshot;
  }

  try {
    const snapshots = await Promise.all(countries.map(country => fetchCountrySnapshot(country)));
    const fetchedAt = new Date().toISOString();
    const fresh: MacroComparisonSnapshot = {
      countries: snapshots,
      fetchedAt,
      stale: false,
    };

    await upsertCachedSignalRecord<MacroComparisonSnapshot>({
      slug: 'macro-comparison',
      area,
      payload: fresh,
      sourceLabel: 'World Bank Indicators API',
      sourceUpdatedAt: fetchedAt,
      fetchedAt,
      status: 'fresh',
    });

    return fresh;
  } catch (error) {
    if (cached) {
      return {
        ...(mapCachedMacroRecord(cached) as MacroComparisonSnapshot),
        stale: true,
      };
    }

    throw error;
  }
}

export function getMacroCitations(snapshot: MacroComparisonSnapshot): MeetingCitation[] {
  return snapshot.countries.flatMap(country => {
    return [
      country.metrics.gdpGrowth,
      country.metrics.gdpPerCapita,
      country.metrics.inflation,
      country.metrics.population,
      country.metrics.policyRate,
    ].map(metric => ({
      label: `${country.name} · ${metric.label}`,
      url: metric.sourceUrl,
      note: metric.sourceLabel,
    }));
  });
}
