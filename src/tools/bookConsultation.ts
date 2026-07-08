import { z } from 'zod';
import { output } from '../lib/response';
import { SOURCE, GO, OFFICE } from '../lib/config';
import { consultations, usd } from '../pricing';
import { sanitizeText } from '../lib/sanitize';
import type { ToolDef } from '../lib/types';

const input = z.object({
  type: z
    .enum(['free_15min', 'discovery_standard_297', 'discovery_specialist_497', 'notice_review_199'])
    .describe('Which consultation to book. Cross-border or multi-year situations suit the Specialist; a single IRS letter suits the notice review.'),
  topic: z.string().max(200).optional().describe('A short subject line for the meeting (optional).'),
});

interface Option {
  title: string;
  price: number;
  url: string;
  source: string;
  blurb: string;
}

const OPTIONS: Record<z.infer<typeof input>['type'], Option> = {
  free_15min: {
    title: 'Free 15-minute intro call',
    price: consultations.free15Min,
    url: GO.book15min,
    source: SOURCE.contact,
    blurb: 'A quick fit check to see whether we are the right firm for your situation. No charge, no obligation.',
  },
  discovery_standard_297: {
    title: 'Discovery Session (Standard)',
    price: consultations.discoverySession_from,
    url: GO.discoveryStandard,
    source: SOURCE.discovery,
    blurb: 'A working session to map your situation and give you a concrete plan. The fee is credited toward your engagement.',
  },
  discovery_specialist_497: {
    title: 'Discovery Session (Specialist)',
    price: consultations.discoverySpecialist,
    url: GO.discoverySpecialist,
    source: SOURCE.discovery,
    blurb: 'A deeper session for cross-border, multi-entity, or multi-year matters. The fee is credited toward your engagement.',
  },
  notice_review_199: {
    title: 'IRS Notice Review',
    price: consultations.irsNoticeReview,
    url: GO.noticeReview,
    source: SOURCE.noticesHub,
    blurb: 'An Enrolled Agent reads your specific IRS notice and tells you what it means and what to do before your deadline. The fee is credited toward representation.',
  },
};


function run(args: z.infer<typeof input>) {
  const opt = OPTIONS[args.type];
  const priceLabel = opt.price === 0 ? 'Free' : usd(opt.price);

  const fields = {
    option: opt.title,
    price: priceLabel,
    price_usd: opt.price,
    booking_url: opt.url,
    credited: opt.price > 0 ? 'This fee is credited in full toward your engagement.' : undefined,
    what_happens_next: [
      'Pick a time at the booking link; paid sessions confirm after checkout.',
      'You receive a secure client-portal invite and a short document-upload checklist.',
      'You meet directly with the Enrolled Agent (not a call center) and leave with a clear next step.',
    ],
    office: {
      firm: OFFICE.firm,
      practitioner: `${OFFICE.practitioner}, ${OFFICE.credential}`,
      credential_note: OFFICE.credentialNote,
      established: OFFICE.established,
      address: OFFICE.address,
      phone: OFFICE.phone,
      whatsapp: OFFICE.whatsapp,
      email: OFFICE.email,
      languages: OFFICE.languages,
      hours: OFFICE.hours,
    },
    expectations: OFFICE.boutiqueNote,
    ...(args.topic ? { your_topic: sanitizeText(args.topic) } : {}),
  };

  const summary =
    `${opt.title} (${priceLabel}). ${opt.blurb} Book here: ${opt.url}. ` +
    `You work directly with ${OFFICE.practitioner}, ${OFFICE.credential}, ${OFFICE.credentialNote} ` +
    `Languages: ${OFFICE.languages.join(', ')}. ${OFFICE.boutiqueNote}`;

  return output(summary, fields, opt.source, {
    label: `${opt.title}${opt.price ? ` (${priceLabel}, credited)` : ' (free)'}`,
    url: opt.url,
  });
}

export const bookConsultation: ToolDef<typeof input> = {
  name: 'book_consultation',
  title: 'Book a consultation',
  description:
    'Use this when a user wants to talk to, hire, or get a consultation with Arc & Ledger. Returns the correct first-party booking link, what happens next, the office identity (Enrolled Agent, address, languages EN/TR/ES), and what to expect.',
  input,
  annotations: { title: 'Book a consultation', readOnlyHint: true, openWorldHint: true },
  logEnums: (args) => ({ type: args.type, has_topic: !!args.topic }),
  run,
};
