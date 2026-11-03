// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { toSupportContact } from './schemas/support';
import {
  hasSupport,
  noSupport,
  supportChannels,
  whatsappLink,
} from './support';

describe('support channels', () => {
  it('builds every WhatsApp and call line as the admin wrote them, in order', () => {
    const channels = supportChannels(
      {
        whatsapp: [
          { label: 'Redoctor', phone: '+58 424 0000002' },
          { label: 'Cobros', phone: '+58 412-0000003' },
        ],
        calls: [{ label: 'General', phone: '+58 414 0000001' }],
      },
      'Hola, quiero acceso',
    );

    expect(channels.whatsapp).toEqual([
      {
        label: 'Redoctor',
        number: '+58 424 0000002',
        href: 'https://wa.me/584240000002?text=Hola%2C%20quiero%20acceso',
      },
      {
        label: 'Cobros',
        number: '+58 412-0000003',
        href: 'https://wa.me/584120000003?text=Hola%2C%20quiero%20acceso',
      },
    ]);
    expect(channels.phones).toEqual([
      {
        label: 'General',
        number: '+58 414 0000001',
        href: 'tel:+584140000001',
      },
    ]);
    expect(hasSupport(channels)).toBe(true);
  });

  it('offers nothing when nobody filled the lines', () => {
    const channels = supportChannels(noSupport, 'x');

    expect(channels).toEqual({ whatsapp: [], phones: [] });
    expect(hasSupport(channels)).toBe(false);
  });

  it('writes the message into the WhatsApp link', () => {
    expect(whatsappLink('+58 422-736.28.67', '¡Hola! 👋')).toBe(
      'https://wa.me/584227362867?text=%C2%A1Hola!%20%F0%9F%91%8B',
    );
  });
});

describe('GET /config/support', () => {
  it('reads the lists, leaving out a line this version cannot use', () => {
    expect(
      toSupportContact({
        supportCallPhones: [
          { label: ' General ', phone: '+58 414 0000001' },
          { label: 'Sin número', phone: '04140000001' },
          'not a line',
        ],
        supportWhatsappPhones: [
          { label: 'Redoctor', phone: '+58 424 0000002' },
        ],
      }),
    ).toEqual({
      calls: [{ label: 'General', phone: '+58 414 0000001' }],
      whatsapp: [{ label: 'Redoctor', phone: '+58 424 0000002' }],
    });
  });
});
