import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (params.has('error')) {
    return NextResponse.json({ status: 'cancelled', message: 'Cadastro nao concluido.' }, { status: 400, headers });
  }
  if (params.has('code')) {
    // Do not exchange or retain credentials until the hosted signup flow is validated.
    return NextResponse.json({ status: 'pending_configuration', message: 'Integracao ainda nao ativada.' }, { status: 503, headers });
  }
  return NextResponse.json({ status: 'ready', integration: 'whatsapp-embedded-signup' }, { headers });
}
