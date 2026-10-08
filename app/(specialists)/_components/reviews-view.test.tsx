import { screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import {
  buildReview,
  buildReviewsResponse,
  buildSpecialistReviews,
} from '@/tests/factories/reviews';
import { renderWithIntl } from '@/tests/render';

import { ReviewsView } from './reviews-view';

describe('ReviewsView', () => {
  it('summarizes the rating and lists the latest reviews', async () => {
    const { container } = renderWithIntl(
      <ReviewsView
        reviews={buildSpecialistReviews()}
        specialistName="Ana Pérez"
      />,
    );

    expect(screen.getByText('Calificación general')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '4,5 de 5 estrellas' }),
    ).toBeInTheDocument();
    expect(screen.getByText('5 estrellas: 50 %')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: '2 opiniones' }),
    ).toBeInTheDocument();

    const [first, second] = screen
      .getAllByRole('listitem')
      .filter((item) =>
        within(item).queryByRole('img', { name: /de 5 estrellas/ }),
      );
    if (!first || !second) throw new Error('Expected two reviews');
    expect(within(first).getByText('María José R.')).toBeInTheDocument();
    expect(within(first).getByText('20/09/2026')).toBeInTheDocument();
    expect(
      within(second).getByText('Esta reseña no tiene comentarios.'),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('never names an anonymous author', () => {
    renderWithIntl(
      <ReviewsView
        reviews={buildSpecialistReviews(
          buildReviewsResponse([buildReview({ isAnonymous: true })]),
        )}
        specialistName="Ana Pérez"
      />,
    );

    expect(screen.getByText('Usuario de Redoctor')).toBeInTheDocument();
    expect(screen.queryByText(/María/)).toBe(null);
    expect(
      screen.getByRole('heading', { name: '1 opinión' }),
    ).toBeInTheDocument();
  });

  it('invites the first review when there is none', () => {
    renderWithIntl(
      <ReviewsView
        reviews={buildSpecialistReviews(buildReviewsResponse([]))}
        specialistName="Ana Pérez"
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Aún no hay reseñas disponibles' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '¡Sé uno de los primeros pacientes en compartir su experiencia con Ana Pérez!',
      ),
    ).toBeInTheDocument();
  });
});
