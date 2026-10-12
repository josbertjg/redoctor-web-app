// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { supportChannels, whatsappLink } from './support';

describe('support channels', () => {
  it('reads the WhatsApp line and the phones from the environment format', () => {
    const channels = supportChannels('Hola, quiero acceso', {
      whatsapp: 'Redoctor|+584227362867',
      phones: 'Soporte 1|+584145598216, Soporte 2|+584245582129',
    });

    expect(channels.whatsapp).toEqual({
      label: 'Redoctor',
      number: '0422 736 2867',
      href: 'https://wa.me/584227362867?text=Hola%2C%20quiero%20acceso',
    });
    expect(channels.phones).toEqual([
      {
        label: 'Soporte 1',
        number: '0414 559 8216',
        href: 'tel:+584145598216',
      },
      {
        label: 'Soporte 2',
        number: '0424 558 2129',
        href: 'tel:+584245582129',
      },
    ]);
  });

  it('leaves out what is missing', () => {
    expect(supportChannels('x', { whatsapp: '', phones: '' })).toEqual({
      whatsapp: null,
      phones: [],
    });
  });

  it('writes the message into the WhatsApp link', () => {
    expect(whatsappLink('+58 422-736.28.67', '¡Hola! 👋')).toBe(
      'https://wa.me/584227362867?text=%C2%A1Hola!%20%F0%9F%91%8B',
    );
  });
});
