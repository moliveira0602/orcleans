export interface MappedLead {
  name: string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  category: string;
  address: string;
  status: string;
  closingTime: string;
  photo: string;
  googleMapsUrl: string;
  orderUrl: string;
  services: string[];
  raw: Record<string, any>;
}

const GOOGLE_MAPS_COLUMN_MAP: Record<string, keyof MappedLead | string> = {
  'hfpxzc href':  'googleMapsUrl',
  'qBF1Pd':       'name',
  'MW4etd':       'rating',
  'UY7F9':        'reviewCount',
  'AJB7ye 2':     'priceRange',
  'W4Efsd':       'category',
  'W4Efsd 3':     'address',
  'W4Efsd 6':     'address2',
  'W4Efsd 4':     'status',
  'W4Efsd 5':     'closingTime',
  'FQ2IWe src':   'photo',
  'ah5Ghc':       'service1',
  'ah5Ghc 2':     'service2',
  'ah5Ghc 3':     'service3',
  'A1zNzb href':  'orderUrl',
};

export function isGoogleMapsExcel(columns: string[]): boolean {
  const gmCols = Object.keys(GOOGLE_MAPS_COLUMN_MAP);
  const matches = columns.filter(c => gmCols.includes(c));
  return matches.length >= 5; // at least 5 known columns = it's a Google Maps export
}

export function mapGoogleMapsRow(row: Record<string, any>): MappedLead {
  const get = (key: string) => {
    const val = row[key];
    return val === '·' || val === null || val === undefined ? '' : String(val).trim();
  };

  const reviewRaw = get('UY7F9').replace(/[()]/g, '').trim();
  const ratingRaw = get('MW4etd').replace(',', '.');

  const services = [get('ah5Ghc'), get('ah5Ghc 2'), get('ah5Ghc 3')]
    .filter(Boolean)
    .filter(s => s !== '·');

  const addressParts = [get('W4Efsd 3'), get('W4Efsd 6')].filter(Boolean);

  return {
    name: get('qBF1Pd'),
    rating: parseFloat(ratingRaw) || 0,
    reviewCount: parseInt(reviewRaw) || 0,
    priceRange: get('AJB7ye 2').replace(/\u00a0/g, ' '),
    category: get('W4Efsd'),
    address: addressParts.join(', '),
    status: get('W4Efsd 4'),
    closingTime: get('W4Efsd 5').replace('⋅', '').trim(),
    photo: get('FQ2IWe src'),
    googleMapsUrl: get('hfpxzc href'),
    orderUrl: get('A1zNzb href'),
    services,
    raw: row,
  };
}