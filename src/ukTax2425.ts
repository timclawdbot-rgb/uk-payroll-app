export type PayrollResult = {
  grossAnnual: number;
  personalAllowance: number;
  taxableAnnual: number;
  incomeTaxAnnual: number;
  niAnnual: number;
  netAnnual: number;
  netMonthly: number;
  takeHomePct: number;
};

// UK 2024/25 (approx, England/Wales/NI PAYE bands)
// Personal Allowance: £12,570 tapered above £100k (reduced £1 per £2) to zero at £125,140.
// Income tax bands on taxable income:
// - 20% up to £37,700 (basic rate band)
// - 40% next up to £125,140 taxable total (i.e. up to £112,570 above PA when PA full)
// - 45% above
// Employee NI (Class 1) 2024/25 main rate 8% between PT and UEL, 2% above UEL.
// - PT: £12,570
// - UEL: £50,270

const PA_FULL = 12570;
const PA_TAPER_START = 100000;
const PA_ZERO_AT = 125140;

const BASIC_BAND = 37700; // taxable income band

const NI_PT = 12570;
const NI_UEL = 50270;
const NI_MAIN = 0.08;
const NI_ADDITIONAL = 0.02;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function personalAllowance2425(grossAnnual: number) {
  if (grossAnnual <= PA_TAPER_START) return PA_FULL;
  if (grossAnnual >= PA_ZERO_AT) return 0;
  const reduction = (grossAnnual - PA_TAPER_START) / 2;
  return clamp(PA_FULL - reduction, 0, PA_FULL);
}

export function calcIncomeTax2425(taxableAnnual: number) {
  const t = Math.max(0, taxableAnnual);
  const basic = Math.min(t, BASIC_BAND) * 0.2;
  const higherBase = Math.max(0, t - BASIC_BAND);

  // We treat higher until 125,140 taxable, then additional.
  const higherBandLimit = PA_ZERO_AT; // taxable threshold where 45% begins
  const higher = Math.min(higherBase, Math.max(0, higherBandLimit - BASIC_BAND)) * 0.4;

  const additionalBase = Math.max(0, t - higherBandLimit);
  const additional = additionalBase * 0.45;

  return basic + higher + additional;
}

export function calcEmployeeNI2425(grossAnnual: number) {
  const g = Math.max(0, grossAnnual);

  const mainBase = Math.max(0, Math.min(g, NI_UEL) - NI_PT);
  const addBase = Math.max(0, g - NI_UEL);

  return mainBase * NI_MAIN + addBase * NI_ADDITIONAL;
}

export function payrollFromAnnualSalary2425(grossAnnual: number): PayrollResult {
  const gross = Math.max(0, grossAnnual);
  const pa = personalAllowance2425(gross);
  const taxable = Math.max(0, gross - pa);

  const incomeTax = calcIncomeTax2425(taxable);
  const ni = calcEmployeeNI2425(gross);

  const net = Math.max(0, gross - incomeTax - ni);
  const netMonthly = net / 12;

  const takeHomePct = gross > 0 ? (net / gross) * 100 : 0;

  return {
    grossAnnual: gross,
    personalAllowance: pa,
    taxableAnnual: taxable,
    incomeTaxAnnual: incomeTax,
    niAnnual: ni,
    netAnnual: net,
    netMonthly,
    takeHomePct,
  };
}
