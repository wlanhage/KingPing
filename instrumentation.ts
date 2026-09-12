import { registerOTel, OTLPHttpProtoTraceExporter } from '@vercel/otel';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { trace } from '@opentelemetry/api';
import type { Instrumentation } from 'next';
import {
  BETTERSTACK_TOKEN,
  BETTERSTACK_URL,
  HONEYCOMB_KEY,
  HONEYCOMB_URL,
  isConfigured,
} from '@/lib/telemetry';

export function register() {
  const spanProcessors = [];

  if (isConfigured(HONEYCOMB_URL, HONEYCOMB_KEY)) {
    spanProcessors.push(
      new BatchSpanProcessor(
        new OTLPHttpProtoTraceExporter({
          url: HONEYCOMB_URL,
          headers: { 'x-honeycomb-team': HONEYCOMB_KEY },
        }),
      ),
    );
  }

  if (isConfigured(BETTERSTACK_URL, BETTERSTACK_TOKEN)) {
    spanProcessors.push(
      new BatchSpanProcessor(
        new OTLPHttpProtoTraceExporter({
          url: BETTERSTACK_URL,
          headers: { Authorization: `Bearer ${BETTERSTACK_TOKEN}` },
        }),
      ),
    );
  }

  registerOTel({
    serviceName: 'rundpingisriket',
    // "auto" måste ligga kvar — listan ERSÄTTER @vercel/otels default, så utan
    // den försvinner fetch-instrumenteringen tyst.
    instrumentations: [
      'auto',
      // Prisma-spans blir barn till request-spanet: en seg leaderboard går att
      // spåra ner till SQL:en istället för att gissa.
      new PrismaInstrumentation(),
      // pg ligger ett lager under Prisma och är det enda som visar väntan på
      // connection poolen — den klassiska mystiken när allt "ser snabbt ut".
      new PgInstrumentation(),
      // Slack går via axios -> node:http, alltså inte fetch. Utan den här är
      // varje Slack-anrop ett hål i spåret.
      new HttpInstrumentation(),
    ],
    spanProcessors,
  });
}

// Next anropar den här för varje ohanterat fel i server/edge/klient. Utan den
// får spanet bara status "error" — här får det stacken och routen med sig.
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  const span = trace.getActiveSpan();
  if (!span) return;

  span.recordException(err as Error);
  span.setAttributes({
    'http.route': request.path,
    'next.router_kind': context.routerKind,
    'next.route_type': context.routeType,
  });
};
