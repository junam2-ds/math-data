import Papa from 'papaparse';
import {
  ColumnProfile,
  ColumnType,
  Dataset,
  DescriptiveStats,
  GroupSummary,
  HistogramBin,
  MissingStrategy,
  OutlierStrategy,
  PiiWarning,
} from '../types/project';

export function isMissingValue(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  const s = String(val).trim();
  return s === '' || s === 'NA' || s === 'N/A' || s === 'null' || s === 'NaN' || s === '-';
}

export function parseNumericValue(val: unknown): number | null {
  if (isMissingValue(val)) return null;
  const cleaned = String(val).trim().replace(/,/g, '').replace(/%$/, '');
  if (cleaned === '') return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export async function decodeCsvFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const utf8Text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  // Check for UTF-8 replacement character  which commonly appears on EUC-KR / CP949 Korean public data CSVs
  const replacementCount = (utf8Text.match(/\uFFFD/g) || []).length;
  if (replacementCount > 2) {
    try {
      return new TextDecoder('euc-kr').decode(buffer);
    } catch {
      return utf8Text;
    }
  }
  // Remove UTF-8 BOM if present
  return utf8Text.replace(/^\uFEFF/, '');
}

export function parseCsvText(csvText: string, fileName: string): Dataset {
  const parsed = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });

  const headers = parsed.meta.fields?.filter((h) => h.length > 0) ?? [];
  const rows = (parsed.data || []).filter((row) =>
    headers.some((h) => !isMissingValue(row[h]))
  );

  const profiles = profileColumns(headers, rows);
  const numericCols = profiles.filter((p) => p.type === 'numeric');
  const categoricalCols = profiles.filter((p) => p.type !== 'numeric');

  const defaultTarget = numericCols[0]?.name || headers[0] || '';
  const defaultSecondary = numericCols[1]?.name || '';
  const defaultGroup = categoricalCols[0]?.name || '';

  return {
    id: `csv_${Date.now()}`,
    title: fileName.replace(/\.(csv|txt)$/i, ''),
    source: '공공데이터포털(직접 업로드 CSV)',
    category: '사용자 업로드',
    description: `업로드된 CSV 파일(${rows.length}행, ${headers.length}열)입니다.`,
    unitHint: '',
    defaultTargetCol: defaultTarget,
    defaultGroupCol: defaultGroup,
    defaultSecondaryCol: defaultSecondary,
    headers,
    rows,
  };
}

function isTemporalString(s: string): boolean {
  return (
    /^\d{4}[-./]\d{1,2}([-./]\d{1,2})?$/.test(s) ||
    /^\d{4}년(\s*\d{1,2}월)?$/.test(s) ||
    /^\d{1,2}:\d{2}(:\d{2})?$/.test(s) ||
    /^\d{1,2}시$/.test(s)
  );
}

export function profileColumns(
  headers: string[],
  rows: Record<string, string>[]
): ColumnProfile[] {
  return headers.map((name) => {
    const rawValues = rows.map((r) => r[name]);
    const nonMissing = rawValues.filter((v) => !isMissingValue(v)).map((v) => String(v).trim());
    const missingCount = rows.length - nonMissing.length;
    const uniqueCount = new Set(nonMissing).size;

    const numericValues: number[] = [];
    let temporalMatches = 0;

    for (const v of nonMissing) {
      const n = parseNumericValue(v);
      if (n !== null) {
        numericValues.push(n);
      } else if (isTemporalString(v)) {
        temporalMatches++;
      }
    }

    let type: ColumnType = 'categorical';
    if (nonMissing.length > 0 && numericValues.length / nonMissing.length >= 0.75) {
      type = 'numeric';
    } else if (nonMissing.length > 0 && temporalMatches / nonMissing.length >= 0.6) {
      type = 'temporal';
    }

    let outlierCount = 0;
    if (type === 'numeric' && numericValues.length >= 4) {
      const sorted = [...numericValues].sort((a, b) => a - b);
      const q1 = quantile(sorted, 0.25);
      const q3 = quantile(sorted, 0.75);
      const iqr = q3 - q1;
      const lower = q1 - 1.5 * iqr;
      const upper = q3 + 1.5 * iqr;
      outlierCount = numericValues.filter((v) => v < lower || v > upper).length;
    }

    return {
      name,
      type,
      totalCount: rows.length,
      missingCount,
      uniqueCount,
      sampleValues: nonMissing.slice(0, 4),
      outlierCount,
    };
  });
}

export function scanForPii(headers: string[], rows: Record<string, string>[]): PiiWarning[] {
  const warnings: PiiWarning[] = [];
  const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;
  const rrnRegex = /\b\d{6}-[1-4]\d{6}\b/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (const col of headers) {
    let phoneHits = 0;
    let rrnHits = 0;
    let emailHits = 0;

    for (const r of rows.slice(0, 200)) {
      const v = String(r[col] ?? '').trim();
      if (!v) continue;
      if (phoneRegex.test(v)) phoneHits++;
      if (rrnRegex.test(v)) rrnHits++;
      if (emailRegex.test(v)) emailHits++;
    }

    if (phoneHits > 0) {
      warnings.push({ column: col, type: '휴대전화번호 패턴', sampleCount: phoneHits });
    }
    if (rrnHits > 0) {
      warnings.push({ column: col, type: '주민등록번호 패턴', sampleCount: rrnHits });
    }
    if (emailHits > 0) {
      warnings.push({ column: col, type: '이메일 주소 패턴', sampleCount: emailHits });
    }
  }

  return warnings;
}

export function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * p;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export function extractCleanedNumericSeries(
  rows: Record<string, string>[],
  column: string,
  missingStrategy: MissingStrategy,
  outlierStrategy: OutlierStrategy
): {
  values: number[];
  rowPairs: { row: Record<string, string>; value: number }[];
  rawN: number;
  missingCount: number;
  removedCount: number;
} {
  const rawNums: (number | null)[] = rows.map((r) => parseNumericValue(r[column]));
  const validInitial = rawNums.filter((v): v is number => v !== null);
  const missingCount = rawNums.length - validInitial.length;

  let fillVal: number | null = null;
  if (validInitial.length > 0) {
    if (missingStrategy === 'mean') {
      fillVal = validInitial.reduce((a, b) => a + b, 0) / validInitial.length;
    } else if (missingStrategy === 'median') {
      const s = [...validInitial].sort((a, b) => a - b);
      fillVal = quantile(s, 0.5);
    }
  }

  let workingPairs: { row: Record<string, string>; value: number }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const val = rawNums[i];
    if (val !== null) {
      workingPairs.push({ row: rows[i], value: val });
    } else if (fillVal !== null && (missingStrategy === 'mean' || missingStrategy === 'median')) {
      workingPairs.push({ row: rows[i], value: fillVal });
    }
  }

  let removedCount = rows.length - workingPairs.length;

  if (outlierStrategy === 'iqr_trim' && workingPairs.length >= 4) {
    const sorted = workingPairs.map((p) => p.value).sort((a, b) => a - b);
    const q1 = quantile(sorted, 0.25);
    const q3 = quantile(sorted, 0.75);
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;
    const before = workingPairs.length;
    workingPairs = workingPairs.filter((p) => p.value >= lower && p.value <= upper);
    removedCount += before - workingPairs.length;
  }

  return {
    values: workingPairs.map((p) => p.value),
    rowPairs: workingPairs,
    rawN: rows.length,
    missingCount,
    removedCount,
  };
}

export function computeDescriptiveStats(
  values: number[],
  rawN: number,
  missingCount: number,
  removedCount: number
): DescriptiveStats {
  const n = values.length;
  if (n === 0) {
    return {
      n: 0,
      rawN,
      missingCount,
      removedCount,
      mean: 0,
      median: 0,
      mode: null,
      variance: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
      skewness: 0,
      lowerFence: 0,
      upperFence: 0,
      outlierValues: [],
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;
  const median = quantile(sorted, 0.5);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outlierValues = sorted.filter((v) => v < lowerFence || v > upperFence);

  const sqDiffs = values.reduce((acc, v) => acc + (v - mean) ** 2, 0);
  const variance = n > 1 ? sqDiffs / (n - 1) : 0;
  const stdDev = Math.sqrt(variance);

  // Mode (rounded to 1 decimal if continuous to avoid noisy all-unique)
  const freq = new Map<number, number>();
  let maxFreq = 0;
  let modeVal: number | null = null;
  for (const v of values) {
    const rounded = Math.round(v * 10) / 10;
    const f = (freq.get(rounded) || 0) + 1;
    freq.set(rounded, f);
    if (f > maxFreq) {
      maxFreq = f;
      modeVal = rounded;
    }
  }
  if (maxFreq <= 1) modeVal = null;

  let skewness = 0;
  if (n >= 3 && stdDev > 0) {
    const m3 = values.reduce((acc, v) => acc + ((v - mean) / stdDev) ** 3, 0) / n;
    skewness = m3;
  }

  return {
    n,
    rawN,
    missingCount,
    removedCount,
    mean,
    median,
    mode: modeVal,
    variance,
    stdDev,
    min: sorted[0],
    max: sorted[n - 1],
    q1,
    q3,
    iqr,
    skewness,
    lowerFence,
    upperFence,
    outlierValues,
  };
}

export function normalPdf(x: number, mean: number, stdDev: number): number {
  if (stdDev <= 0) return 0;
  const z = (x - mean) / stdDev;
  return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
}

// Standard Normal CDF using Abramowitz & Stegun approximation (max error ~7.5e-8)
export function standardNormalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const absZ = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * absZ);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erf = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ);
  return 0.5 * (1 + sign * erf);
}

export function normalProbability(
  threshold: number,
  mean: number,
  stdDev: number,
  direction: 'gte' | 'lte'
): number {
  if (stdDev <= 0) {
    return direction === 'gte' ? (mean >= threshold ? 1 : 0) : mean <= threshold ? 1 : 0;
  }
  const z = (threshold - mean) / stdDev;
  const cdf = standardNormalCdf(z);
  return direction === 'gte' ? 1 - cdf : cdf;
}

export function buildHistogramBins(
  values: number[],
  mean: number,
  stdDev: number,
  binCount = 8
): HistogramBin[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const effectiveMin = span === 0 ? min - 1 : min;
  const effectiveMax = span === 0 ? max + 1 : max;
  const width = (effectiveMax - effectiveMin) / binCount;

  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => {
    const start = effectiveMin + i * width;
    const end = start + width;
    const mid = (start + end) / 2;
    return {
      start,
      end,
      mid,
      count: 0,
      density: 0,
      normalPdf: normalPdf(mid, mean, stdDev),
    };
  });

  for (const v of values) {
    let idx = Math.floor((v - effectiveMin) / width);
    if (idx < 0) idx = 0;
    if (idx >= binCount) idx = binCount - 1;
    bins[idx].count += 1;
  }

  for (const b of bins) {
    b.density = b.count / (values.length * width);
  }

  return bins;
}

function logGamma(z: number): number {
  const c = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.1208650973866179e-2,
    -0.5395239384953e-5,
  ];
  let x = z;
  let y = z;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    ser += c[j] / ++y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

export function binomialPmf(k: number, n: number, p: number): number {
  if (n <= 0 || k < 0 || k > n) return 0;
  if (p <= 0) return k === 0 ? 1 : 0;
  if (p >= 1) return k === n ? 1 : 0;
  const logComb = logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
  const logProb = logComb + k * Math.log(p) + (n - k) * Math.log(1 - p);
  return Math.exp(logProb);
}

export function computeGroupSummaries(
  rowPairs: { row: Record<string, string>; value: number }[],
  groupCol: string,
  threshold: number,
  direction: 'gte' | 'lte'
): GroupSummary[] {
  if (!groupCol) return [];
  const map = new Map<string, number[]>();
  for (const pair of rowPairs) {
    const rawGroup = pair.row[groupCol];
    const key = isMissingValue(rawGroup) ? '미분류' : String(rawGroup).trim();
    const list = map.get(key) || [];
    list.push(pair.value);
    map.set(key, list);
  }

  const summaries: GroupSummary[] = [];
  for (const [group, vals] of map.entries()) {
    const sorted = [...vals].sort((a, b) => a - b);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const median = quantile(sorted, 0.5);
    const variance =
      vals.length > 1
        ? vals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (vals.length - 1)
        : 0;
    const exceedCount = vals.filter((v) =>
      direction === 'gte' ? v >= threshold : v <= threshold
    ).length;

    summaries.push({
      group,
      count: vals.length,
      mean,
      median,
      stdDev: Math.sqrt(variance),
      exceedRate: exceedCount / vals.length,
    });
  }

  return summaries.sort((a, b) => b.mean - a.mean).slice(0, 12);
}

export function computePearsonCorrelation(
  rows: Record<string, string>[],
  colX: string,
  colY: string
): { points: { x: number; y: number; label: string }[]; r: number | null } {
  const points: { x: number; y: number; label: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const x = parseNumericValue(rows[i][colX]);
    const y = parseNumericValue(rows[i][colY]);
    if (x !== null && y !== null) {
      const firstKey = Object.keys(rows[i])[0];
      points.push({ x, y, label: String(rows[i][firstKey] || `#${i + 1}`) });
    }
  }

  if (points.length < 3) return { points, r: null };
  const meanX = points.reduce((a, p) => a + p.x, 0) / points.length;
  const meanY = points.reduce((a, p) => a + p.y, 0) / points.length;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (const p of points) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return { points, r: den > 0 ? num / den : null };
}

export function formatNum(val: number, decimals = 2): string {
  if (!Number.isFinite(val)) return '-';
  return val.toLocaleString('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
