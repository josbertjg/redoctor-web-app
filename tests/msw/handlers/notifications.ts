import { http, HttpResponse } from 'msw';

import { isStranger, unauthorized } from './identity';
import {
  buildInboxResponse,
  buildNotificationResponse,
} from '../../factories/notifications';
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

const noContent = () => new HttpResponse(null, { status: 204 });

/*
 * The inbox and what can be done with a notice, stateless: the tests that
 * care about what a write leaves behind read the request. The device
 * tokens of the push come before `/notifications/:notificationId`, which
 * would otherwise take `device-tokens` for an id.
 */
export const notificationsHandlers = [
  respond(false),
  respond(true),

  http.get(apiUrl('/notifications/'), ({ request }) => {
    if (isStranger(request)) return unauthorized();
    return HttpResponse.json(buildInboxResponse());
  }),

  http.patch(apiUrl('/notifications/read-all'), ({ request }) => {
    if (isStranger(request)) return unauthorized();
    return HttpResponse.json({ updated: 2 });
  }),

  http.patch(
    apiUrl('/notifications/:notificationId/read'),
    ({ request, params }) => {
      if (isStranger(request)) return unauthorized();
      return HttpResponse.json(
        buildNotificationResponse({
          id: String(params.notificationId),
          status: 'READ',
          readAt: '2026-10-14T21:00:00.000Z',
        }),
      );
    },
  ),

  http.post(apiUrl('/notifications/device-tokens'), ({ request }) => {
    if (isStranger(request)) return unauthorized();
    return noContent();
  }),

  http.delete(apiUrl('/notifications/device-tokens'), ({ request }) => {
    if (isStranger(request)) return unauthorized();
    return noContent();
  }),

  http.post(apiUrl('/notifications/device-tokens/heartbeat'), ({ request }) => {
    if (isStranger(request)) return unauthorized();
    return HttpResponse.json({ registered: true });
  }),

  http.delete(apiUrl('/notifications/:notificationId'), ({ request }) => {
    if (isStranger(request)) return unauthorized();
    return HttpResponse.json({ deleted: true });
  }),

  http.delete(apiUrl('/notifications/'), ({ request }) => {
    if (isStranger(request)) return unauthorized();
    return HttpResponse.json({ deleted: 3 });
  }),
];
