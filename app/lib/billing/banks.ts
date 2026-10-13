/*
 * The banks a specialist may have paid from, the app's list
 * (lib/features/billing/infrastructure/config/venezuelan_banks.dart). A
 * local list because the API publishes no catalog; the report sends the
 * 4-digit code, which is what the admin matches against the statement.
 */

export type VenezuelanBank = {
  /** The bank's 4-digit code, as the receipt prints it. */
  code: string;
  name: string;
  /** What it used to be called, for whoever still calls it that. */
  formerName?: string;
};

/**
 * Ordered by estimated use among health specialists, not alphabetically:
 * the first ones cover most cases.
 */
export const venezuelanBanks: readonly VenezuelanBank[] = [
  { code: '0134', name: 'Banesco' },
  { code: '0102', name: 'Banco de Venezuela' },
  { code: '0105', name: 'Banco Mercantil' },
  { code: '0108', name: 'BBVA Provincial' },
  { code: '0191', name: 'Banco Nacional de Crédito (BNC)' },
  { code: '0172', name: 'Bancamiga' },
  { code: '0104', name: 'Banco Venezolano de Crédito' },
  { code: '0163', name: 'Banco del Tesoro' },
  {
    code: '0175',
    name: 'Banco Digital de los Trabajadores (BDT)',
    formerName: 'Banco Bicentenario',
  },
  { code: '0114', name: 'Bancaribe' },
  { code: '0171', name: 'Banco Activo' },
  { code: '0115', name: 'Banco Exterior' },
  { code: '0174', name: 'Banplus' },
  { code: '0138', name: 'Banco Plaza' },
  { code: '0168', name: 'Bancrecer' },
  { code: '0151', name: 'BFC Banco Fondo Común' },
  { code: '0128', name: 'Banco Caroní' },
  { code: '0137', name: 'Banco Sofitasa' },
  { code: '0157', name: 'DelSur Banco Universal' },
  { code: '0156', name: '100% Banco' },
  { code: '0178', name: 'N58 Banco Digital' },
  { code: '0169', name: 'R4 Banco Microfinanciero' },
  { code: '0146', name: 'Bangente' },
  { code: '0177', name: 'Banfanb' },
  { code: '0173', name: 'Banco Internacional de Desarrollo' },
  { code: '0166', name: 'Banco Agrícola de Venezuela' },
  { code: '0601', name: 'Instituto Municipal de Crédito Popular' },
];

/** `(0134) Banesco`, as the receipt writes it. */
export function bankLabel(bank: VenezuelanBank): string {
  return `(${bank.code}) ${bank.name}`;
}

/** Lower case and without accents, so «Caroni» finds «Caroní». */
const fold = (text: string) =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/** The banks whose label, or former name, contains the words typed. */
export function searchBanks(query: string): VenezuelanBank[] {
  const needle = fold(query);
  if (needle === '') return [...venezuelanBanks];
  return venezuelanBanks.filter(
    (bank) =>
      fold(bankLabel(bank)).includes(needle) ||
      (bank.formerName !== undefined && fold(bank.formerName).includes(needle)),
  );
}

export function bankByCode(code: string): VenezuelanBank | undefined {
  return venezuelanBanks.find((bank) => bank.code === code);
}
