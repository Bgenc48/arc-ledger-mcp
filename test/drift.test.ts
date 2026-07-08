import { describe, it, expect } from 'vitest';
import { NOTICES, lookupNotice } from '../src/data/notices';
import { IRS_NOTICES } from '../../src/data/irsNotices';
import { consultations } from '../src/pricing';

/**
 * Guards against the worker's notice registry drifting away from the website's
 * IRS_NOTICES landing-page data. Every notice that has a public landing page
 * MUST be covered here, point at that page, and agree on the deadline days.
 */
describe('notice registry stays in sync with the website', () => {
  const siteDeadlineDays: Record<string, number> = { cp2000: 30, cp14: 21, cp3219a: 90, lt11: 30 };

  for (const [slug, data] of Object.entries(IRS_NOTICES)) {
    it(`covers the site notice ${data.code}`, () => {
      const profile = lookupNotice(data.code);
      expect(profile, `worker registry is missing ${data.code}`).not.toBeNull();
      expect(profile!.hasLandingPage).toBe(true);
      expect(profile!.slug).toBe(slug);
      if (slug in siteDeadlineDays) {
        expect(profile!.deadlineDays).toBe(siteDeadlineDays[slug]);
      }
    });
  }

  it('the $199 notice-review price matches the site single source of truth', () => {
    // The offer price on the CP2000 landing page is the $199 notice review.
    expect(IRS_NOTICES.cp2000!.offer.price).toBe('$199');
    expect(consultations.irsNoticeReview).toBe(199);
  });

  it('covers the full task-required notice set', () => {
    const required = ['CP2000', 'CP2501', 'CP14', 'CP501', 'CP503', 'CP504', 'CP3219A', 'LT11', 'LT38', 'CP161'];
    for (const code of required) {
      expect(NOTICES[code], `missing required notice ${code}`).toBeDefined();
    }
  });
});
