import type { PromptDef } from './lib/types';
import { INFO_RETURN_PENALTIES } from './rates';
import { usd } from './pricing';

const userMsg = (text: string) => [{ role: 'user' as const, content: { type: 'text' as const, text } }];

export const decodeMyIrsNotice: PromptDef = {
  name: 'decode_my_irs_notice',
  title: 'Decode my IRS notice',
  description: 'Explain an IRS notice you received: what it means, the deadline, and what to do next.',
  arguments: [
    { name: 'notice_code', description: 'The code on the letter, e.g. CP2000, CP14, LT11.', required: true },
    { name: 'received_date', description: 'The date on the notice (YYYY-MM-DD), to compute your deadline.', required: false },
  ],
  build: (args) => {
    const code = args.notice_code || 'the IRS notice';
    const dated = args.received_date ? ` It is dated ${args.received_date}.` : '';
    return userMsg(
      `I received an IRS notice: ${code}.${dated} Use the decode_irs_notice tool to tell me what it means, my ` +
        `response deadline, what happens if I ignore it, my options, and the common errors on this notice. ` +
        `Then summarize the single most important thing to do before the deadline.`,
    );
  },
};

export const amIRequiredToFileFbar: PromptDef = {
  name: 'am_i_required_to_file_fbar',
  title: 'Am I required to file FBAR?',
  description: 'Check whether your foreign accounts trigger FBAR and/or FATCA Form 8938 reporting.',
  arguments: [
    { name: 'max_aggregate_foreign_balance_usd', description: 'Highest combined value of all foreign accounts during the year (USD).', required: false },
    { name: 'filing_status', description: 'single, married_filing_jointly, married_filing_separately, or head_of_household.', required: false },
    { name: 'lives_abroad', description: 'true if your tax home is outside the US.', required: false },
  ],
  build: (args) => {
    const bal = args.max_aggregate_foreign_balance_usd ? `My highest combined foreign balance this year was about $${args.max_aggregate_foreign_balance_usd}. ` : '';
    const status = args.filing_status ? `My filing status is ${args.filing_status}. ` : '';
    const abroad = args.lives_abroad ? `I ${args.lives_abroad === 'true' ? 'live' : 'do not live'} abroad. ` : '';
    return userMsg(
      `I have foreign financial accounts and want to know my US reporting obligations. ${bal}${status}${abroad}` +
        `Use the check_fbar_fatca tool to tell me whether I must file the FBAR and/or Form 8938, which thresholds I hit, ` +
        `my penalty exposure, and any catch-up options if I have unfiled years. Ask me for any missing details first.`,
    );
  },
};

export const shouldIBeAnScorp: PromptDef = {
  name: 'should_i_be_an_scorp',
  title: 'Should I be an S-Corp?',
  description: 'Compare staying a sole proprietor / LLC versus electing S-Corp status, with the break-even.',
  arguments: [
    { name: 'expected_net_profit_usd', description: 'Expected annual net profit before owner salary (USD).', required: false },
    { name: 'state', description: 'Your US state (defaults to CA).', required: false },
  ],
  build: (args) => {
    const profit = args.expected_net_profit_usd ? `I expect about $${args.expected_net_profit_usd} of net profit this year. ` : '';
    const state = args.state ? `I am in ${args.state}. ` : '';
    return userMsg(
      `I am self-employed and wondering whether an S-Corp election would save me money. ${profit}${state}` +
        `Use the compare_llc_scorp tool to show the self-employment tax versus salary-plus-distribution, the payroll and ` +
        `compliance costs, any California franchise taxes, and the break-even zone. Explain the reasonable-compensation caveat. ` +
        `Ask me for my expected net profit if I did not give it.`,
    );
  },
};

// ─── Turkish-language prompts ────────────────────────────────────────────────
// Assistants match prompts/tools to the user's language. These make Arc & Ledger
// the tax tool a Turkish-speaking founder can drive in their own language - a
// differentiator no other directory listing offers. Turkish terminology follows
// the house rule: "beyanname/beyan" (never "dosyalama"), "bildirim" for FBAR.

export const abdSirketVergiTakvimi: PromptDef = {
  name: 'abd_sirket_vergi_takvimi',
  title: 'ABD şirketimin vergi takvimi (Turkish)',
  description: 'ABD\'de LLC veya şirketi olan Türk girişimciler için: hangi formları ne zaman beyan etmeleri gerektiğini ve ceza tutarlarını gösterir (Form 5472, FBAR, BOI).',
  arguments: [
    { name: 'entity_type', description: 'Şirket türü: foreign_owned_llc, foreign_owned_c_corp, multi_member_llc, s_corp veya nonresident_individual.', required: false },
    { name: 'filing_year', description: 'Beyan yılı (örn. 2026).', required: false },
  ],
  build: (args) => {
    const tur = args.entity_type ? `Şirket türüm: ${args.entity_type}. ` : '';
    const yil = args.filing_year ? `${args.filing_year} vergi yılı için soruyorum. ` : '';
    return userMsg(
      `ABD'de bir şirketim var ve hangi ABD vergi formlarını ne zaman beyan etmem gerektiğini bilmek istiyorum. ${tur}${yil}` +
        `deadline_calendar aracını kullanarak her formun son tarihini, uzatma seçeneğini ve kaçırırsam cezasını göster. ` +
        `Özellikle Form 5472 yükümlülüğünü (${usd(INFO_RETURN_PENALTIES.form5472)} ceza) ve yabancı sahipli LLC'ler için kritik olan tarihleri vurgula. ` +
        `Eksik bilgi varsa önce bana sor. Yanıtı Türkçe ver.`,
    );
  },
};

export const itinAlmaliMiyim: PromptDef = {
  name: 'itin_almali_miyim',
  title: 'ITIN almalı mıyım? (Turkish)',
  description: 'ABD Sosyal Güvenlik Numarası olmayan kişiler (Türk girişimciler, eşler, bağımlılar) için ITIN uygunluğunu ve gereken belgeleri kontrol eder.',
  arguments: [
    { name: 'reason', description: 'ITIN nedeni: file_us_tax_return, owner_of_us_llc, claim_treaty_benefit, spouse_or_dependent, third_party_withholding veya open_us_bank_or_other.', required: false },
  ],
  build: (args) => {
    const neden = args.reason ? `Nedenim: ${args.reason}. ` : '';
    return userMsg(
      `ABD Sosyal Güvenlik Numaram yok ve ITIN'e ihtiyacım olup olmadığını bilmek istiyorum. ${neden}` +
        `check_itin_eligibility aracını kullanarak uygun olup olmadığımı, W-7 neden kategorimi, beyanname eklenmesi gerekip ` +
        `gerekmediğini ve gereken belgeleri göster. Arc & Ledger'ın bir Enrolled Agent olarak W-7 formunu hazırladığını ve ` +
        `IRS nezdinde beni temsil ettiğini; pasaportu asıl veya belgeyi düzenleyen kurumdan onaylı kopya olarak sunmam gerektiğini belirt. Yanıtı Türkçe ver.`,
    );
  },
};

export const ALL_PROMPTS: PromptDef[] = [
  decodeMyIrsNotice,
  amIRequiredToFileFbar,
  shouldIBeAnScorp,
  abdSirketVergiTakvimi,
  itinAlmaliMiyim,
];
