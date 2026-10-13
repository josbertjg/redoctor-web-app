// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { buildSpecialistReport } from '@/tests/factories/agenda';

import { specialistReportSchema } from './reports';

describe('specialistReportSchema', () => {
  it('reads the four sections of the API’s answer', () => {
    const report = specialistReportSchema.parse(buildSpecialistReport());

    expect(report.canExport).toBe(false);
    expect(report.appointments?.byStatus.COMPLETED).toBe(6);
    expect(report.income?.currencies[0]?.currency).toBe('USD');
    expect(report.reviews?.distribution['5']).toBe(4);
    expect(report.reasons?.items).toHaveLength(2);
  });

  it('reads a missing figure as zero and a missing list as empty, never a broken page', () => {
    const report = specialistReportSchema.parse({
      range: { from: '2026-10-01', to: '2026-10-14', granularity: 'hour' },
      appointments: { total: 3, series: 'not a list' },
      reviews: { average: 'n/a', count: 2 },
    });

    expect(report.range.granularity).toBe('day');
    expect(report.canExport).toBe(false);
    expect(report.appointments).toMatchObject({
      total: 3,
      byStatus: { COMPLETED: 0 },
      series: [],
      previous: { total: 0 },
    });
    expect(report.reviews).toMatchObject({
      average: null,
      count: 2,
      allTime: { average: null, count: 0 },
    });
    expect(report.income).toBeUndefined();
  });
});
