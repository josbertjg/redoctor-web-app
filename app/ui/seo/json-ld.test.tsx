import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { JsonLd } from './json-ld';

describe('JsonLd', () => {
  it('renders the document as a data block the page carries', () => {
    const { container } = render(
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Physician',
          name: 'Ana <Pérez>',
        }}
      />,
    );

    const script = container.querySelector('script');
    expect(script).toHaveAttribute('type', 'application/ld+json');
    expect(script?.innerHTML).toBe(
      '{"@context":"https://schema.org","@type":"Physician","name":"Ana \\u003cPérez\\u003e"}',
    );
    expect(JSON.parse(script?.innerHTML ?? '')).toMatchObject({
      name: 'Ana <Pérez>',
    });
  });
});
