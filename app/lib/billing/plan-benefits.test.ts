import { describe, expect, it } from 'vitest';

import { planBenefits } from './plan-benefits';

describe('planBenefits', () => {
  it('derives what a plan includes from its limits', () => {
    expect(
      planBenefits({ maxActiveClinics: 1, canExportReports: false }),
    ).toEqual([{ key: 'search' }, { key: 'oneClinic' }]);
    expect(
      planBenefits({ maxActiveClinics: 3, canExportReports: true }),
    ).toEqual([
      { key: 'search' },
      { key: 'manyClinics', count: 3 },
      { key: 'exportReports' },
    ]);
  });

  it('reads no limit as unlimited clinics', () => {
    expect(
      planBenefits({ maxActiveClinics: null, canExportReports: true }),
    ).toEqual([
      { key: 'search' },
      { key: 'unlimitedClinics' },
      { key: 'exportReports' },
    ]);
    expect(
      planBenefits({ maxActiveClinics: undefined, canExportReports: false }),
    ).toEqual([{ key: 'search' }, { key: 'unlimitedClinics' }]);
  });
});
