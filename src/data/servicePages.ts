export type ServicePage = { name: string; path: string };
export type ServiceCategory = { category: string; items: ServicePage[] };

export const serviceSubPages: ServiceCategory[] = [
  {
    category: 'Tax Returns',
    items: [
      { name: 'Individual Tax Services', path: '/services/individual-tax/' },
      { name: 'Business Tax & Compliance', path: '/services/business-tax/' },
      { name: 'Tax Preparation Overview', path: '/services/tax-preparation/' },
      { name: 'Tax Extension', path: '/services/tax-extension/' },
    ],
  },
  {
    category: 'Tax Advisory & IRS Help',
    items: [
      { name: 'Tax Planning', path: '/services/tax-planning/' },
      { name: 'Tax Review', path: '/services/tax-review/' },
      { name: 'Tax Resolution', path: '/services/tax-resolution/' },
      { name: 'IRS Health Check', path: '/services/irs-health-check/' },
      { name: 'IRS Watchdog', path: '/services/irs-watchdog/' },
      { name: 'Notice Rescue (Secure Upload)', path: '/services/notice-rescue/' },
      { name: 'Return Checkup (Secure Upload)', path: '/services/return-checkup/' },
      { name: 'S-Corp Health Check', path: '/services/s-corp-health-check/' },
      { name: 'Accountable Plan Setup', path: '/services/accountable-plan/' },
      { name: 'R&D Tax Credit Review', path: '/services/rd-tax-credit/' },
    ],
  },
  {
    category: 'Bookkeeping & Accounting',
    items: [
      { name: 'Bookkeeping & Monthly Accounting', path: '/services/bookkeeping/' },
      { name: 'E-Commerce & Amazon Seller Services', path: '/services/ecommerce/' },
      { name: 'Creator & Influencer Tax Services', path: '/services/creator-tax/' },
      { name: 'Arc Creator Plans (Monthly)', path: '/creators/' },
      { name: 'International Bookkeeping', path: '/services/international-bookkeeping/' },
    ],
  },
  {
    category: 'Business Formation & Compliance',
    items: [
      { name: 'Business Formation (LLC/Corp)', path: '/services/business-formation/' },
      { name: 'LLC Tax Services', path: '/services/llc-tax-services/' },
      { name: 'EIN Application', path: '/services/ein-application/' },
      { name: 'S Corp Election', path: '/services/s-corp-election/' },
      { name: 'Registered Agent', path: '/services/registered-agent/' },
      { name: 'Annual Compliance', path: '/services/annual-compliance/' },
      { name: 'State Tax Registration', path: '/services/state-tax-registration/' },
    ],
  },
  {
    category: 'International & Specialty',
    items: [
      { name: 'Cross-Border & International Tax', path: '/services/international-tax/' },
      { name: 'E-2 Visa Financial Compliance', path: '/services/e2-visa/' },
      { name: 'ITIN Application', path: '/services/itin-application/' },
      { name: 'Cost Segregation', path: '/services/cost-segregation/' },
    ],
  },
];

export const turkishServiceSubPages: ServiceCategory[] = [
  {
    category: 'Vergi Beyannameleri',
    items: [
      { name: 'Bireysel Vergi Hizmetleri', path: '/tr/hizmetler/bireysel-vergi/' },
      { name: '\u0130\u015fletme Vergi ve Uyum', path: '/tr/hizmetler/isletme-vergi/' },
      { name: 'LLC Vergi Hizmetleri', path: '/tr/hizmetler/llc-vergi/' },
      { name: 'Gig Ekonomisi Vergi', path: '/tr/hizmetler/gig-ekonomisi-vergi/' },
      { name: '\u0130\u00e7erik \u00dcreticisi Vergi', path: '/tr/hizmetler/icerik-ureticisi-vergi/' },
      { name: 'Vergi Haz\u0131rlama', path: '/tr/hizmetler/vergi-hazirlama/' },
    ],
  },
  {
    category: 'Vergi Dan\u0131\u015fmanl\u0131\u011f\u0131 ve IRS Yard\u0131m\u0131',
    items: [
      { name: 'Vergi Planlama', path: '/tr/hizmetler/vergi-planlama/' },
      { name: 'Vergi \u0130nceleme', path: '/tr/hizmetler/vergi-inceleme/' },
      { name: 'Vergi \u00c7\u00f6z\u00fcm\u00fc', path: '/tr/hizmetler/vergi-cozumleri/' },
      { name: 'IRS Sağlık Kontrolü', path: '/tr/hizmetler/irs-saglik-kontrolu/' },
      { name: 'IRS İzleme', path: '/tr/hizmetler/irs-izleme/' },
      { name: 'IRS Mektup Çözümü (Güvenli Yükleme)', path: '/tr/hizmetler/irs-mektup-cozumu/' },
      { name: 'Beyanname Kontrolü (Güvenli Yükleme)', path: '/tr/hizmetler/beyanname-kontrolu/' },
      { name: 'S-Corp Sağlık Kontrolü', path: '/tr/hizmetler/s-corp-saglik-kontrolu/' },
      { name: 'Accountable Plan Kurulumu', path: '/tr/hizmetler/harcama-plani/' },
      { name: 'Ar-Ge Vergi Kredisi İncelemesi', path: '/tr/hizmetler/ar-ge-vergi-kredisi/' },
    ],
  },
  {
    category: 'Muhasebe',
    items: [
      { name: 'Muhasebe ve Defter Tutma', path: '/tr/hizmetler/muhasebe/' },
      { name: 'Uluslararası Muhasebe', path: '/tr/hizmetler/uluslararasi-muhasebe/' },
      { name: 'E-Ticaret ve Amazon', path: '/tr/hizmetler/e-ticaret/' },
    ],
  },
  {
    category: '\u015eirket Kurma ve Uyum',
    items: [
      { name: 'Kayıtlı Temsilci', path: '/tr/hizmetler/kayitli-temsilci/' },
      { name: 'Yıllık Uyum', path: '/tr/hizmetler/yillik-uyum/' },
      { name: 'EIN Başvurusu', path: '/tr/hizmetler/ein-basvurusu/' },
      { name: 'S Corp Seçimi', path: '/tr/hizmetler/s-corp-secimi/' },
      { name: 'Vergi Uzatma', path: '/tr/hizmetler/vergi-uzatma/' },
      { name: 'Eyalet Vergi Kaydı', path: '/tr/hizmetler/eyalet-vergi-kaydi/' },
    ],
  },
  {
    category: 'Uluslararas\u0131 ve \u00d6zel',
    items: [
      { name: 'Uluslararas\u0131 Vergi', path: '/tr/hizmetler/uluslararasi-vergi/' },
      { name: 'E-2 Vize Mali Uyum', path: '/tr/hizmetler/e2-vize/' },
      { name: 'ITIN Başvurusu', path: '/tr/hizmetler/itin-basvurusu/' },
      { name: 'Maliyet Ayrıştırma', path: '/tr/hizmetler/maliyet-ayristirma/' },
    ],
  },
  {
    category: 'Amerika\'da Şirket Kurma',
    items: [
      { name: 'Amerika\'da Şirket Kurmak', path: '/tr/amerikada-sirket-kurmak/' },
      { name: 'Şirket Kurma Fiyatları', path: '/tr/fiyatlar-sirket-kurma/' },
      { name: 'Amazon FBA LLC', path: '/tr/amazon-sirket-kurma/' },
      { name: 'E-Ticaret LLC', path: '/tr/e-ticaret-llc/' },
      { name: 'Freelancer LLC', path: '/tr/freelancer-llc/' },
      { name: 'Uber Black LLC', path: '/tr/uber-black-llc/' },
      { name: 'E-2 Vize Şirket', path: '/tr/e2-vize-sirket/' },
      { name: 'Gayrimenkul LLC', path: '/tr/gayrimenkul-yatirim-llc/' },
      { name: 'Wyoming LLC', path: '/tr/wyoming-llc-kurulumu/' },
      { name: 'Form 5472 Rehberi', path: '/tr/form-5472-nedir/' },
    ],
  },
];
