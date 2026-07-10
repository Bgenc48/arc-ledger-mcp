import { describe, it, expect } from 'vitest';
import { parseIsoDate, toIso, rollToBusinessDay, isBusinessDay } from '../src/lib/dates';

const roll = (iso: string) => toIso(rollToBusinessDay(parseIsoDate(iso)!));

describe('rollToBusinessDay (IRC 7503)', () => {
  it('rolls a Sunday statutory date to the following Monday', () => {
    // TY2025 Form 1120-S: statutory March 15, 2026 is a Sunday -> Monday March 16.
    expect(roll('2026-03-15')).toBe('2026-03-16');
  });

  it('rolls a Saturday statutory date to the following Monday', () => {
    // 2029-09-15 is a Saturday (not near Labor Day) -> Monday September 17.
    expect(roll('2029-09-15')).toBe('2029-09-17');
  });

  it('leaves an ordinary weekday deadline unchanged', () => {
    expect(roll('2027-03-15')).toBe('2027-03-15'); // Monday
    expect(roll('2027-04-15')).toBe('2027-04-15'); // Thursday
  });

  it('rolls April 15 through the weekend AND DC Emancipation Day', () => {
    // 2028-04-15 is Saturday; Emancipation Day (Apr 16) is Sunday, observed
    // Monday Apr 17; so the first free business day is Tuesday April 18, 2028.
    expect(roll('2028-04-15')).toBe('2028-04-18');
  });

  it('rolls off a fixed federal holiday that lands on a weekday', () => {
    // New Year's Day 2027 is Friday Jan 1 (a holiday) -> Monday January 4.
    expect(roll('2027-01-01')).toBe('2027-01-04');
  });

  it('recognizes weekends and holidays as non-business days', () => {
    expect(isBusinessDay(parseIsoDate('2026-03-15')!)).toBe(false); // Sunday
    expect(isBusinessDay(parseIsoDate('2028-04-17')!)).toBe(false); // Emancipation observed
    expect(isBusinessDay(parseIsoDate('2026-03-16')!)).toBe(true); // Monday, clear
  });
});
