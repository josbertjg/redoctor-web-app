import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MotionProvider } from './provider';
import { StaggeredText } from './staggered-text';

describe('StaggeredText', () => {
  it('reads as plain text and animates letter by letter', () => {
    const { container } = render(
      <MotionProvider>
        <h2>
          <StaggeredText
            segments={[
              { text: 'Así de ' },
              { text: 'simple', className: 'accent' },
              { text: '.' },
            ]}
          />
        </h2>
      </MotionProvider>,
    );

    // Assistive technology gets the sentence once, whole.
    expect(
      screen.getByRole('heading', { name: 'Así de simple.' }),
    ).toBeInTheDocument();

    // The letters are decoration: hidden from it, one span each, words kept together.
    const animated = container.querySelector('[aria-hidden="true"]');
    expect(animated).not.toBeNull();
    const letters =
      animated?.querySelectorAll('span.inline-block > span') ?? [];
    expect(letters).toHaveLength('Asídesimple.'.length);
    expect(
      animated?.querySelectorAll(':scope > span.inline-block'),
    ).toHaveLength(3);
    expect(
      [...letters].filter((letter) => letter.classList.contains('accent')),
    ).toHaveLength(6);
  });
});
