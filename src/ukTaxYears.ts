export type TaxYearKey =
  | '2019/20'
  | '2020/21'
  | '2021/22'
  | '2022/23'
  | '2023/24'
  | '2024/25';

export type PayrollResult = {
  year: TaxYearKey;
  grossAnnual: number;
  personalAllowance: number;
  taxableAnnual: number;
  incomeTaxAnnual: number;
  niAnnual: number;
  netAnnual: number;
  netMonthly: number;
  takeHomePct: number;
  notes: string[];
};

type YearParams = {
  year: TaxYearKey;

  // Personal allowance
  personalAllowance: number;
  taperStart: number; // income where PA begins to taper
  taperEnd: number; // income where PA becomes 0

  // Income tax bands (England/Wales/NI)
  basicBandTaxable: number; // width of basic band
  higherThresholdTaxable: number; // taxable threshold where additional rate starts

  // NI (employee, Class 1) approximate annual thresholds
  niPrimaryThreshold: number;
  niUpperEarningsLimit: number;
  niMainRate: number;
  niAdditionalRate: number;

  notes?: string[];
};

const YEARS: Record<TaxYearKey, YearParams> = {
  // Sources: GOV.UK Income Tax rates/bands for recent years; HMRC-announced PA/basic band;
  // NI figures are approximate annualised thresholds for employee Class 1.
  // This app is informational; see disclaimer.

  '2019/20': {
    year: '2019/20',
    personalAllowance: 12500,
    taperStart: 100000,
    taperEnd: 125000, // PA full 12,500 tapers to 0
    basicBandTaxable: 37500,
    higherThresholdTaxable: 150000,
    niPrimaryThreshold: 8632, // ~£166/wk
    niUpperEarningsLimit: 50000, // ~£962/wk
    niMainRate: 0.12,
    niAdditionalRate: 0.02,
  },

  '2020/21': {
    year: '2020/21',
    personalAllowance: 12500,
    taperStart: 100000,
    taperEnd: 125000,
    basicBandTaxable: 37500,
    higherThresholdTaxable: 150000,
    niPrimaryThreshold: 9500, // ~£183/wk
    niUpperEarningsLimit: 50000, // ~£962/wk
    niMainRate: 0.12,
    niAdditionalRate: 0.02,
  },

  '2021/22': {
    year: '2021/22',
    personalAllowance: 12570,
    taperStart: 100000,
    taperEnd: 125140,
    basicBandTaxable: 37700,
    higherThresholdTaxable: 150000,
    niPrimaryThreshold: 9568, // ~£184/wk
    niUpperEarningsLimit: 50270, // ~£967/wk
    niMainRate: 0.12,
    niAdditionalRate: 0.02,
  },

  '2022/23': {
    year: '2022/23',
    personalAllowance: 12570,
    taperStart: 100000,
    taperEnd: 125140,
    basicBandTaxable: 37700,
    higherThresholdTaxable: 150000,
    // NI had mid-year changes (Health & Social Care Levy introduction then reversal).
    // We use a simplified blended/typical rate for the year.
    niPrimaryThreshold: 12570, // from July 2022 PT aligned with PA
    niUpperEarningsLimit: 50270,
    niMainRate: 0.1325,
    niAdditionalRate: 0.0325,
    notes: ['NI rates/thresholds changed mid-year in 2022/23; this is a simplified estimate.'],
  },

  '2023/24': {
    year: '2023/24',
    personalAllowance: 12570,
    taperStart: 100000,
    taperEnd: 125140,
    basicBandTaxable: 37700,
    higherThresholdTaxable: 125140,
    // NI main rate changed during 2023/24 (12% → 10% → 8%); using 10% as a simple approximation.
    niPrimaryThreshold: 12570,
    niUpperEarningsLimit: 50270,
    niMainRate: 0.10,
    niAdditionalRate: 0.02,
    notes: ['NI main rate changed during 2023/24; this is a simplified estimate.'],
  },

  '2024/25': {
    year: '2024/25',
    personalAllowance: 12570,
    taperStart: 100000,
    taperEnd: 125140,
    basicBandTaxable: 37700,
    higherThresholdTaxable: 125140,
    niPrimaryThreshold: 12570,
    niUpperEarningsLimit: 50270,
    niMainRate: 0.08,
    niAdditionalRate: 0.02,
  },
};

export const TAX_YEARS: { key: TaxYearKey; label: string }[] = [
  { key: '2024/25', label: '2024/25' },
  { key: '2023/24', label: '2023/24' },
  { key: '2022/23', label: '2022/23' },
  { key: '2021/22', label: '2021/22' },
  { key: '2020/21', label: '2020/21' },
  { key: '2019/20', label: '2019/20' },
];

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function calcPersonalAllowance(params: YearParams, grossAnnual: number) {
  const g = Math.max(0, grossAnnual);
  if (g <= params.taperStart) return params.personalAllowance;
  if (g >= params.taperEnd) return 0;
  const reduction = (g - params.taperStart) / 2;
  return clamp(params.personalAllowance - reduction, 0, params.personalAllowance);
}

function calcIncomeTax(params: YearParams, taxableAnnual: number) {
  const t = Math.max(0, taxableAnnual);
  const basic = Math.min(t, params.basicBandTaxable) * 0.2;

  const higherBase = Math.max(0, t - params.basicBandTaxable);
  const higherBandWidth = Math.max(0, params.higherThresholdTaxable - params.basicBandTaxable);
  const higher = Math.min(higherBase, higherBandWidth) * 0.4;

  const additional = Math.max(0, t - params.higherThresholdTaxable) * 0.45;
  return basic + higher + additional;
}

function calcEmployeeNI(params: YearParams, grossAnnual: number) {
  const g = Math.max(0, grossAnnual);
  const mainBase = Math.max(0, Math.min(g, params.niUpperEarningsLimit) - params.niPrimaryThreshold);
  const addBase = Math.max(0, g - params.niUpperEarningsLimit);
  return mainBase * params.niMainRate + addBase * params.niAdditionalRate;
}

export function payrollFromAnnualSalary(year: TaxYearKey, grossAnnual: number): PayrollResult {
  const params = YEARS[year];
  const gross = Math.max(0, grossAnnual);

  const pa = calcPersonalAllowance(params, gross);
  const taxable = Math.max(0, gross - pa);

  const incomeTax = calcIncomeTax(params, taxable);
  const ni = calcEmployeeNI(params, gross);

  const net = Math.max(0, gross - incomeTax - ni);
  const netMonthly = net / 12;

  return {
    year,
    grossAnnual: gross,
    personalAllowance: pa,
    taxableAnnual: taxable,
    incomeTaxAnnual: incomeTax,
    niAnnual: ni,
    netAnnual: net,
    netMonthly,
    takeHomePct: gross > 0 ? (net / gross) * 100 : 0,
    notes: params.notes ?? [],
  };
}
