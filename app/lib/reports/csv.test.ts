// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { buildCsv } from './csv';

describe('buildCsv', () => {
  it('lays out the title, the details and each table, for Excel in Spanish', () => {
    const csv = buildCsv({
      title: 'Reporte de estadísticas',
      details: [['Periodo', '1 – 14 oct 2026']],
      tables: [
        {
          title: 'Motivos de consulta',
          headers: ['Motivo', 'Citas'],
          rows: [
            ['Primera consulta', 6],
            ['Control; seguimiento', 4],
            ['Dijo "urgente"', 1],
          ],
        },
      ],
    });

    // A byte-order mark so the accents survive, a semicolon between fields.
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv.slice(1).split('\r\n')).toEqual([
      'Reporte de estadísticas',
      'Periodo;1 – 14 oct 2026',
      '',
      'Motivos de consulta',
      'Motivo;Citas',
      'Primera consulta;6',
      '"Control; seguimiento";4',
      '"Dijo ""urgente""";1',
      '',
    ]);
  });
});
