import { randomUUID } from 'node:crypto';

import { getResponse, http, HttpResponse, type HttpHandler } from 'msw';
import { z } from 'zod';

import {
  patientCompletionBodySchema,
  patientRegistrationBodySchema,
  specialistRegistrationBodySchema,
} from '@/app/lib/schemas/identity';
import { claimBodySchema } from '@/app/lib/schemas/invitations';
import { reviewBodySchema } from '@/app/lib/schemas/reviews';

import { uidOfToken, type Person } from './fake-provider';
import {
  buildAppointment,
  slotAt,
  takenStartTime,
  type AppointmentPayload,
} from '../factories/appointments';
import {
  buildMeResponse,
  buildNewAccountMeResponse,
  buildSpecialistMeResponse,
  patientFacet,
  specialistFacet,
} from '../factories/identity';
import { buildCreatedReview } from '../factories/reviews';
import { apiUrl, errorEnvelope } from '../msw/api-url';

import type { buildInvitationResponse } from '../factories/invitations';
import type { BrowserContext, Route, WebSocketRoute } from '@playwright/test';

/*
 * The API, answered in the browser for the signed-in specs: what a person
 * does on one page is there on the next one (an invitation claimed, an
 * appointment confirmed, a sign-up finished), and everything else is the
 * unit tests' MSW handlers, built from the same factories and contract.
 * The browser cannot call api-dev today anyway (its CORS, REDOC-362).
 */

export type Me = ReturnType<typeof buildMeResponse>;
export type InvitationPayload = ReturnType<typeof buildInvitationResponse>;

/** Who is calling, as the bearer's ID token says: the handlers read it here. */
const callerHeader = 'x-e2e-caller';

// The handlers build their URLs from it (tests/msw/api-url.ts), as the
// e2e build's browser calls api-dev.
process.env.NEXT_PUBLIC_API_URL ??= 'https://api-dev.redoctorapp.com/api/v1';

/** The unit tests' handlers, loaded once the URL above is set. */
let unitHandlers: Promise<{ handlers: HttpHandler[]; bearer: string }> | null =
  null;
function loadUnitHandlers() {
  unitHandlers ??= Promise.all([
    import('../msw/handlers'),
    import('../msw/handlers/identity'),
  ]).then(([all, identity]) => ({
    handlers: all.handlers,
    bearer: identity.validToken,
  }));
  return unitHandlers;
}

const refusal = (status: number, code: string, message: string) =>
  HttpResponse.json(errorEnvelope(code, message), { status });
const unauthorized = () => refusal(401, 'ERR_1001', 'Unauthorized');
const forbidden = () => refusal(403, 'ERR_1003', 'Forbidden');
const badRequest = () => refusal(400, 'ERR_1002', 'Validation failed');
const conflict = (code: string) => refusal(409, code, 'Conflict');

const rescheduleBody = z.strictObject({
  date: z.iso.date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
});
const cancelBody = z.strictObject({ reason: z.string().optional() });
const completeBody = z.strictObject({ noShow: z.boolean().optional() });

/** A call the page made, as the API answered it. */
export type ApiCall = {
  method: string;
  path: string;
  status: number;
  caller: string | null;
};

export class FakeApi {
  /** What `/identity/me` answers for each Firebase account. */
  private readonly accounts = new Map<string, Me>();
  readonly invitations = new Map<string, InvitationPayload>();
  readonly appointments = new Map<string, AppointmentPayload>();
  /** The finished consultations still to rate. */
  readonly toRate = new Set<string>();
  /** Accounts whose next `/identity/me` the API refuses (a 401). */
  private readonly refusing = new Set<string>();
  /** Every call the page made, in order. */
  readonly calls: ApiCall[] = [];

  /** A patient whose sign-up is done. */
  patient(person: Person, overrides: Partial<Me> = {}): Me {
    return this.account(
      person,
      buildMeResponse({ id: randomUUID(), ...overrides }),
    );
  }

  /** A specialist whose sign-up is done, with no patient side. */
  specialist(person: Person, overrides: Partial<Me> = {}): Me {
    return this.account(
      person,
      buildSpecialistMeResponse({ id: randomUUID(), ...overrides }),
    );
  }

  private account(person: Person, me: Me): Me {
    const named: Me = {
      ...me,
      email: person.email,
      displayName: me.displayName === null ? null : person.name,
      photoUrl: null,
    };
    this.accounts.set(person.uid, named);
    return named;
  }

  /**
   * What the API answers for an account. One it has never seen is brand
   * new: the API makes it on its first read, with no sign-up behind it.
   */
  meOf(uid: string): Me {
    const known = this.accounts.get(uid);
    if (known) return known;
    const created = buildNewAccountMeResponse({
      id: randomUUID(),
      photoUrl: null,
    });
    this.accounts.set(uid, created);
    return created;
  }

  /** The API stops accepting this person's session once (a 401 on `/me`). */
  expire(person: Person): void {
    this.refusing.add(person.uid);
  }

  /** Whether the page called the API this way (path without `/api/v1`). */
  called(method: string, path: string | RegExp): boolean {
    return this.calls.some(
      (call) =>
        call.method === method &&
        (typeof path === 'string' ? call.path === path : path.test(call.path)),
    );
  }

  async install(context: BrowserContext): Promise<void> {
    const unit = await loadUnitHandlers();
    const handlers = [...this.handlers(unit.handlers), ...unit.handlers];
    await context.route(
      (url) => url.pathname.startsWith('/api/v1/'),
      (route) => this.answer(route, handlers, unit.bearer),
    );
    await context.routeWebSocket(/\/socket\.io\//, quietChannel);
  }

  private async answer(route: Route, handlers: HttpHandler[], bearer: string) {
    const request = route.request();
    const cors = {
      'access-control-allow-origin': request.headers().origin ?? '*',
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'authorization, content-type',
      'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
      vary: 'Origin',
    };
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }

    const url = new URL(request.url());
    const path = url.pathname.slice('/api/v1'.length);
    const headers = new Headers(request.headers());
    const token = /^Bearer (.+)$/.exec(headers.get('authorization') ?? '')?.[1];
    const caller = token === undefined ? null : uidOfToken(token);
    if (caller !== null) {
      headers.set(callerHeader, caller);
      // The unit tests' handlers know one bearer: every signed-in account.
      headers.set('authorization', `Bearer ${bearer}`);
    }
    const body = request.postData();
    const response =
      (await getResponse(
        handlers,
        new Request(`${apiUrl(path)}${url.search}`, {
          method: request.method(),
          headers,
          ...(body === null || request.method() === 'GET' ? {} : { body }),
        }),
      )) ??
      refusal(404, 'ERR_E2E', `No handler for ${request.method()} ${path}`);

    this.calls.push({
      method: request.method(),
      path,
      status: response.status,
      caller,
    });
    const answered: Record<string, string> = { ...cors };
    response.headers.forEach((value, name) => {
      answered[name] = value;
    });
    await route.fulfill({
      status: response.status,
      headers: answered,
      body: Buffer.from(await response.arrayBuffer()),
    });
  }

  /** The handlers that keep what the page did, ahead of the unit tests'. */
  private handlers(unit: HttpHandler[]): HttpHandler[] {
    const callerOf = (request: Request): Me | null => {
      const uid = request.headers.get(callerHeader);
      return uid === null ? null : this.meOf(uid);
    };
    const setMe = (request: Request, me: Me) => {
      const uid = request.headers.get(callerHeader);
      if (uid !== null) this.accounts.set(uid, me);
    };
    /** A specialist's account: every appointment of this store is in their agenda. */
    const isSpecialist = (me: Me) => me.profiles?.specialist?.exists === true;
    /** An appointment of this store, read by its patient or its specialist. */
    const own = (request: Request, id: string) => {
      const appointment = this.appointments.get(id);
      if (!appointment) return undefined;
      const me = callerOf(request);
      if (me === null) return { refusal: unauthorized() };
      if (appointment.patientUserId !== me.id && !isSpecialist(me)) {
        return { refusal: forbidden() };
      }
      return { appointment, me };
    };
    const save = (appointment: AppointmentPayload) => {
      this.appointments.set(appointment.id, appointment);
      return HttpResponse.json({ appointment });
    };

    return [
      http.get(apiUrl('/identity/me'), ({ request }) => {
        const uid = request.headers.get(callerHeader);
        if (uid !== null && this.refusing.delete(uid)) return unauthorized();
        const me = callerOf(request);
        return me === null ? unauthorized() : HttpResponse.json(me);
      }),

      http.post(apiUrl('/identity/register'), async ({ request }) => {
        const me = callerOf(request);
        if (me === null) return unauthorized();
        const json: unknown = await request.json();
        // A specialist's sign-up (the web's since 2026-11-03): the app
        // registers the specialties next.
        const specialist = specialistRegistrationBodySchema.safeParse(json);
        if (specialist.success) {
          const created: Me = {
            ...me,
            displayName: `${specialist.data.firstName} ${specialist.data.lastName}`,
            role: 'SPECIALIST',
            registrationStatus: 'PENDING_COMPLETE_SPECIALIST',
            profiles: {
              patient: { exists: false },
              specialist: specialistFacet({ status: 'PENDING_SPECIALTIES' }),
            },
            visibilityStatus: 'PROFILE_INCOMPLETE',
          };
          setMe(request, created);
          return HttpResponse.json(created);
        }
        const body = patientRegistrationBodySchema.safeParse(json);
        if (!body.success) return badRequest();
        const registered: Me = {
          ...me,
          displayName: `${body.data.firstName} ${body.data.lastName}`,
          role: 'PATIENT',
          registrationStatus: 'PENDING_COMPLETE_PATIENT',
          profiles: {
            patient: patientFacet({ status: 'PENDING_PERSONAL_DATA' }),
            specialist: { exists: false },
          },
        };
        setMe(request, registered);
        return HttpResponse.json(registered);
      }),

      http.post(
        apiUrl('/identity/complete-registration'),
        async ({ request }) => {
          const me = callerOf(request);
          if (me === null) return unauthorized();
          const body = patientCompletionBodySchema.safeParse(
            await request.json(),
          );
          if (!body.success) return badRequest();
          if (me.registrationStatus !== 'PENDING_COMPLETE_PATIENT') {
            return forbidden();
          }
          const completed: Me = {
            ...me,
            registrationStatus: 'COMPLETED',
            profiles: {
              patient: patientFacet(),
              specialist: { exists: false },
            },
          };
          setMe(request, completed);
          return HttpResponse.json(completed);
        },
      ),

      http.get(apiUrl('/scheduling/invitations/:token'), ({ params }) => {
        const invitation = this.invitations.get(String(params.token));
        return invitation ? HttpResponse.json(invitation) : undefined;
      }),

      http.post(
        apiUrl('/scheduling/invitations/:token/claim'),
        async ({ request, params }) => {
          const token = String(params.token);
          const current = this.invitations.get(token);
          if (!current) return undefined;
          const me = callerOf(request);
          if (me === null) return unauthorized();
          const body = claimBodySchema.safeParse(await request.json());
          if (!body.success) return badRequest();
          if (current.invitation.status !== 'PENDING') {
            return conflict('ERR_4010');
          }
          if (me.registrationStatus !== 'COMPLETED') {
            return refusal(403, 'ERR_2010', 'Registration incomplete');
          }
          const claimed = claimInvitation(current, me, body.data);
          this.invitations.set(token, claimed);
          this.appointments.set(
            claimed.appointment.id,
            appointmentOf(claimed, body.data),
          );
          return HttpResponse.json(claimed);
        },
      ),

      http.get(apiUrl('/scheduling/appointments'), ({ request }) => {
        const me = callerOf(request);
        if (me === null) return unauthorized();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const appointments = [...this.appointments.values()].filter(
          (appointment) =>
            appointment.patientUserId === me.id &&
            (status === null || appointment.status === status) &&
            (from === null || appointment.slot.date >= from) &&
            (to === null || appointment.slot.date <= to),
        );
        return HttpResponse.json({ appointments });
      }),

      http.get(
        apiUrl('/scheduling/appointments/:appointmentId'),
        ({ request, params }) => {
          const found = own(request, String(params.appointmentId));
          if (found === undefined) return undefined;
          return 'refusal' in found
            ? found.refusal
            : HttpResponse.json({ appointment: found.appointment });
        },
      ),

      http.post(
        apiUrl('/scheduling/appointments/:appointmentId/confirm'),
        ({ request, params }) => {
          const found = own(request, String(params.appointmentId));
          if (found === undefined) return undefined;
          if ('refusal' in found) return found.refusal;
          if (found.appointment.canConfirmNow !== true) {
            return conflict('ERR_4013');
          }
          return save({
            ...found.appointment,
            status: 'CONFIRMED',
            persistedStatus: 'CONFIRMED',
            canConfirmNow: false,
            confirmedAt: new Date().toISOString(),
          });
        },
      ),

      http.post(
        apiUrl('/scheduling/appointments/:appointmentId/cancel'),
        async ({ request, params }) => {
          const found = own(request, String(params.appointmentId));
          if (found === undefined) return undefined;
          if ('refusal' in found) return found.refusal;
          const body = cancelBody.safeParse(await request.json());
          if (!body.success) return badRequest();
          return save({
            ...found.appointment,
            status: 'CANCELLED',
            persistedStatus: 'CANCELLED',
            cancelledBy: 'PATIENT',
            cancelReason: body.data.reason ?? null,
            cancelledAt: new Date().toISOString(),
            canConfirmNow: false,
          });
        },
      ),

      http.post(
        apiUrl('/scheduling/appointments/:appointmentId/reschedule'),
        async ({ request, params }) => {
          const found = own(request, String(params.appointmentId));
          if (found === undefined) return undefined;
          if ('refusal' in found) return found.refusal;
          const body = rescheduleBody.safeParse(await request.json());
          if (!body.success) return badRequest();
          if (body.data.startTime === takenStartTime) {
            return conflict('ERR_4002');
          }
          const { appointment } = found;
          const start = new Date(
            `${body.data.date}T${body.data.startTime}:00-04:00`,
          );
          return save({
            ...appointment,
            slot: slotAt(start),
            status: 'PENDING_CONFIRMATION',
            persistedStatus: 'PENDING_CONFIRMATION',
            isRescheduled: true,
            canConfirmNow: false,
            confirmationWindowOpensAt: new Date(
              start.getTime() - 24 * 3_600_000,
            ).toISOString(),
            rescheduleHistory: [
              ...(appointment.rescheduleHistory ?? []),
              {
                by: 'PATIENT',
                from: {
                  date: appointment.slot.date,
                  startTime: appointment.slot.startTime,
                },
                to: body.data,
              },
            ],
          });
        },
      ),

      // The specialist's side (the designer's panel, phase 3): their agenda
      // from this store, and the closes they make. A store with no
      // appointment leaves the agenda to the unit tests' handler.
      http.get(apiUrl('/scheduling/specialist/appointments'), ({ request }) => {
        const me = callerOf(request);
        if (me === null) return unauthorized();
        if (this.appointments.size === 0 || !isSpecialist(me)) {
          return undefined;
        }
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const appointments = [...this.appointments.values()].filter(
          (appointment) =>
            (status === null || appointment.status === status) &&
            (from === null || appointment.slot.date >= from) &&
            (to === null || appointment.slot.date <= to),
        );
        return HttpResponse.json({
          appointments,
          total: appointments.length,
          page: 1,
          pageSize: 100,
        });
      }),

      http.post(
        apiUrl('/scheduling/specialist/appointments/:appointmentId/complete'),
        async ({ request, params }) => {
          const found = own(request, String(params.appointmentId));
          if (found === undefined) return undefined;
          if ('refusal' in found) return found.refusal;
          const body = completeBody.safeParse(await request.json());
          if (!body.success) return badRequest();
          const status = body.data.noShow === true ? 'NO_SHOW' : 'COMPLETED';
          return save({
            ...found.appointment,
            status,
            persistedStatus: status,
            canConfirmNow: false,
          });
        },
      ),

      http.post(
        apiUrl('/scheduling/specialist/appointments/:appointmentId/cancel'),
        async ({ request, params }) => {
          const found = own(request, String(params.appointmentId));
          if (found === undefined) return undefined;
          if ('refusal' in found) return found.refusal;
          const body = cancelBody.safeParse(await request.json());
          if (!body.success) return badRequest();
          return save({
            ...found.appointment,
            status: 'CANCELLED',
            persistedStatus: 'CANCELLED',
            cancelledBy: 'SPECIALIST',
            cancelReason: body.data.reason ?? null,
            cancelledAt: new Date().toISOString(),
            canConfirmNow: false,
          });
        },
      ),

      // The booking: the unit tests' handler checks it and answers as the
      // API does; the appointment it makes is the patient's from then on.
      http.post(apiUrl('/scheduling/appointments'), async ({ request }) => {
        const me = callerOf(request);
        if (me === null) return unauthorized();
        const answered = await getResponse(unit, request.clone());
        if (answered?.status !== 201) return answered;
        const { appointment } = (await answered.json()) as {
          appointment: AppointmentPayload;
        };
        const booked = {
          ...appointment,
          id: randomUUID(),
          patientUserId: me.id,
          createdByUserId: me.id,
        };
        this.appointments.set(booked.id, booked);
        return HttpResponse.json({ appointment: booked }, { status: 201 });
      }),

      http.get(apiUrl('/reviews/pending'), ({ request }) => {
        const me = callerOf(request);
        if (me === null) return unauthorized();
        const appointments = [...this.toRate]
          .map((id) => this.appointments.get(id))
          .filter(
            (appointment): appointment is AppointmentPayload =>
              appointment?.patientUserId === me.id,
          );
        return HttpResponse.json({ appointments });
      }),

      http.post(
        apiUrl('/reviews/appointments/:appointmentId'),
        async ({ request, params }) => {
          const id = String(params.appointmentId);
          const found = own(request, id);
          if (found === undefined) return undefined;
          if ('refusal' in found) return found.refusal;
          if (!this.toRate.has(id)) return conflict('ERR_4501');
          const body = reviewBodySchema.safeParse(await request.json());
          if (!body.success) return badRequest();
          this.toRate.delete(id);
          return HttpResponse.json(
            {
              review: buildCreatedReview({
                appointmentId: id,
                rating: body.data.rating,
                comment: body.data.comment ?? null,
              }),
            },
            { status: 201 },
          );
        },
      ),
    ];
  }
}

type Claim = z.infer<typeof claimBodySchema>;

/** The invitation once this account holds it. */
function claimInvitation(
  current: InvitationPayload,
  me: Me,
  claim: Claim,
): InvitationPayload {
  const confirmed =
    claim.confirm === true && current.appointment.canConfirmNow === true;
  return {
    invitation: {
      ...current.invitation,
      status: 'ACCEPTED',
      relationship: claim.relationship,
      acceptedByUserId: me.id,
      acceptedAt: new Date().toISOString(),
    },
    appointment: {
      ...current.appointment,
      patientUserId: me.id,
      forSelf: claim.relationship === 'SELF',
      status: confirmed ? 'CONFIRMED' : 'PENDING_CONFIRMATION',
      canConfirmNow: confirmed ? false : current.appointment.canConfirmNow,
    },
  };
}

/** The claimed invitation's appointment, as `/a/{id}` reads it. */
function appointmentOf(
  claimed: InvitationPayload,
  claim: Claim,
): AppointmentPayload {
  const { invitation, appointment } = claimed;
  const start = new Date(appointment.slot.startsAtUtc);
  const confirmed = appointment.status === 'CONFIRMED';
  return buildAppointment(
    {
      id: appointment.id,
      patientUserId: invitation.acceptedByUserId ?? null,
      createdByUserId: null,
      specialistId: appointment.specialistId,
      forSelf: claim.relationship === 'SELF',
      attendee:
        claim.relationship === 'SELF'
          ? appointment.attendee
          : {
              ...appointment.attendee,
              dateOfBirth: claim.dateOfBirth ?? invitation.invitedDateOfBirth,
              sex: claim.sex ?? invitation.invitedSex,
            },
      price: appointment.price,
      specialistName: appointment.specialistName,
      officeName: appointment.officeName,
      officeAddress: appointment.officeAddress,
      reasonName: appointment.reasonName,
      status: appointment.status,
      persistedStatus: appointment.status,
      canConfirmNow: appointment.canConfirmNow,
      confirmedAt: confirmed ? new Date().toISOString() : null,
    },
    start,
  );
}

/**
 * The notifications' live channel (Socket.IO over a WebSocket): it opens,
 * lets the namespace in and stays quiet, as the API's does with no notice.
 */
function quietChannel(ws: WebSocketRoute) {
  ws.send(
    `0${JSON.stringify({
      sid: 'e2e',
      upgrades: [],
      pingInterval: 25_000,
      pingTimeout: 60_000,
      maxPayload: 1_000_000,
    })}`,
  );
  ws.onMessage((message) => {
    const text = typeof message === 'string' ? message : message.toString();
    const connect = /^40(\/[^,]*),/.exec(text);
    if (connect?.[1] !== undefined) {
      ws.send(`40${connect[1]},${JSON.stringify({ sid: 'e2e-channel' })}`);
    }
  });
}
