import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { apiUrl } from '@/tests/msw/api-url';
import { server } from '@/tests/msw/server';
import { renderPanel } from '@/tests/panel';

import { PanelSummaryEmail } from './panel-summary-email';

describe('the daily summary’s email, on the panel’s home', () => {
  it('shows whether it comes by email and turns it off and on (REDOC-359)', async () => {
    const saved: unknown[] = [];
    server.events.on('request:start', ({ request }) => {
      if (
        request.method === 'PATCH' &&
        request.url.endsWith('/notifications/preferences')
      ) {
        void request
          .clone()
          .json()
          .then((body: unknown) => saved.push(body));
      }
    });
    const { container } = renderPanel(
      <PanelSummaryEmail />,
      pageNamespaces.panelHome,
    );

    const box = await screen.findByRole('checkbox', {
      name: 'Recibirlo también por correo',
    });
    expect(box).toBeChecked();
    expect(await axe(container)).toHaveNoViolations();

    await userEvent.click(box);
    await waitFor(() => {
      expect(saved).toEqual([{ dailySummaryEmail: false }]);
    });
    expect(box).not.toBeChecked();
  });

  it('says when it could not be saved, and keeps what the API has', async () => {
    server.use(
      http.patch(apiUrl('/notifications/preferences'), () =>
        HttpResponse.json({ code: 'ERR_1007' }, { status: 400 }),
      ),
    );
    renderPanel(<PanelSummaryEmail />, pageNamespaces.panelHome);

    const box = await screen.findByRole('checkbox', {
      name: 'Recibirlo también por correo',
    });
    await userEvent.click(box);

    expect(
      await screen.findByText(
        'No pudimos guardar el cambio. Revisa tu conexión e inténtalo de nuevo.',
      ),
    ).toBeInTheDocument();
    expect(box).toBeChecked();
  });
});
