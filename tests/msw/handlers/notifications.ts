import { http, HttpResponse } from 'msw';

import { apiUrl, errorEnvelope } from '../api-url';

/** The only opt-out token the mock accepts. */
export const validOptOutToken = 'signed-token-123';

const respond = (dailySummaryEmail: boolean) =>
  http.post(
    apiUrl(
      `/notifications/daily-summary/${dailySummaryEmail ? 'subscribe' : 'unsubscribe'}`,
    ),
    ({ request }) => {
      const token = new URL(request.url).searchParams.get('token');
      if (token !== validOptOutToken) {
        return HttpResponse.json(
          errorEnvelope('ERR_8004', 'The unsubscribe link is not valid'),
          { status: 400 },
        );
      }
      return HttpResponse.json({ dailySummaryEmail });
    },
  );

export const notificationsHandlers = [respond(false), respond(true)];
