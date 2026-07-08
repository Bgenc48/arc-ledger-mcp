/**
 * Shared employment-tax math. Rates are the standard FICA/SE splits; the wage
 * base comes from the site's versioned constants (SOCIAL_SECURITY_WAGE_BASE).
 * The 12.4%/2.9% split is only a comment in the site file, so we name it here.
 */
import {
  SE_TAX_MULTIPLIER,
  SOCIAL_SECURITY_WAGE_BASE,
  MEDICARE_SURTAX_RATE,
  MEDICARE_SURTAX_SINGLE,
} from '../rates';

export const SS_RATE = 0.124; // Social Security portion (6.2% employee + 6.2% employer)
export const MEDICARE_RATE = 0.029; // Medicare portion (1.45% + 1.45%), no wage cap

export interface EmploymentTax {
  socialSecurity: number;
  medicare: number;
  total: number;
}

/** Self-employment tax on Schedule C net profit (net x 92.35%, SS capped). */
export function selfEmploymentTax(netProfit: number): EmploymentTax {
  const base = Math.max(0, netProfit) * SE_TAX_MULTIPLIER;
  const socialSecurity = Math.min(base, SOCIAL_SECURITY_WAGE_BASE) * SS_RATE;
  const medicare = base * MEDICARE_RATE;
  return { socialSecurity, medicare, total: socialSecurity + medicare };
}

/** Combined employer+employee FICA on S-corp wages (SS capped, Medicare uncapped). */
export function ficaOnWages(wages: number): EmploymentTax {
  const w = Math.max(0, wages);
  const socialSecurity = Math.min(w, SOCIAL_SECURITY_WAGE_BASE) * SS_RATE;
  const medicare = w * MEDICARE_RATE;
  return { socialSecurity, medicare, total: socialSecurity + medicare };
}

/**
 * Additional Medicare Tax (IRC 1401(b)(2) / 3101(b)(2)): 0.9% on SE earnings or
 * wages above the filing-status threshold. Single-filer threshold used unless a
 * different one is passed; employee-side only (there is no employer match).
 * S-corp distributions are NOT subject to it, which is part of the S-corp math.
 */
export function additionalMedicareTax(
  earnings: number,
  threshold: number = MEDICARE_SURTAX_SINGLE,
): number {
  return Math.max(0, earnings - threshold) * MEDICARE_SURTAX_RATE;
}

export const round0 = (n: number): number => Math.round(n);
