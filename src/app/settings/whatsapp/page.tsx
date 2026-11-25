'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useUser } from '@/firebase';

type LoginResponse = { authResponse?: { code?: string } };
type FacebookSdk = {
  init(options: { appId: string; version: string; autoLogAppEvents: boolean; xfbml: boolean }): void;
  login(callback: (response: LoginResponse) => void, options: Record<string, unknown>): void;
};
type Asset = { accountId: string; phoneNumberId?: string };
const appId = process.env.NEXT_PUBLIC_META_APP_ID ?? '';
const configId = process.env.NEXT_PUBLIC_META_SIGNUP_CONFIG_ID ?? '';
const version = process.env.NEXT_PUBLIC_META_GRAPH_API_VERSION ?? '';

export default function WhatsAppIntegrationPage() {
  const { user } = useUser();
  const [sdkReady, setSdkReady] = useState(false);
  const [status, setStatus] = useState('Prepare a sessão antes de conectar.');
  const [prepared, setPrepared] = useState(false);
  const session = useRef<string | null>(null);
  const code = useRef<string | null>(null);
  const asset = useRef<Asset | null>(null);
  const inFlight = useRef(false);
  const active = useRef(false);
  const sdk = () => (window as Window & { FB?: FacebookSdk }).FB;
  const configured = Boolean(appId && configId && /^v\d+\.\d+$/.test(version));

  async function post(body: Record<string, unknown>) {
    if (!user) throw new Error('unauthorized');
    const response = await fetch('/api/whatsapp/callback', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await user.getIdToken() },
      body: JSON.stringify(body), cache: 'no-store',
    });
    const result = await response.json();
    if (!response.ok) throw new Error('request_failed');
    return result;
  }

  async function finish() {
    if (!session.current || !code.current || !asset.current || inFlight.current || !active.current) return;
    inFlight.current = true;
    active.current = false;
    setPrepared(false);
    setStatus('Validando a conta e salvando a conexão...');
    const payload = { action: 'complete', event: 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING', state: session.current, code: code.current, ...asset.current };
    session.current = null; code.current = null; asset.current = null;
    try {
      const result = await post(payload);
      setStatus(result.status === 'pending_activation' ? 'Coexistência confirmada. Conexão salva, aguardando ativação.' : 'Não foi possível concluir.');
    } catch { setStatus('Não foi possível confirmar a coexistência. Prepare uma nova sessão.'); }
    finally { inFlight.current = false; }
  }

  useEffect(() => {
    function listen(event: MessageEvent) {
      if (!active.current || !['https://www.facebook.com', 'https://web.facebook.com', 'https://facebook.com'].includes(event.origin)) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;
        if (data.event !== 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
          if (data.event === 'CANCEL' || data.event === 'ERROR' || data.event === 'FINISH') {
            active.current = false; session.current = null; code.current = null; asset.current = null;
            setPrepared(false); setStatus('Cadastro interrompido ou não identificado como coexistência.');
          }
          return;
        }
        if (typeof data.data?.waba_id !== 'string') return;
        asset.current = { accountId: data.data.waba_id, phoneNumberId: typeof data.data.phone_number_id === 'string' ? data.data.phone_number_id : undefined };
        void finish();
      } catch { /* Ignore unrelated messages. */ }
    }
    window.addEventListener('message', listen);
    return () => window.removeEventListener('message', listen);
  }, [user]);

  async function prepare() {
    if (active.current || inFlight.current) return;
    setPrepared(false); session.current = null; code.current = null; asset.current = null;
    try { const result = await post({ action: 'start' }); session.current = result.state; setPrepared(true); setStatus('Sessão preparada. Conecte a conta existente.'); }
    catch { setStatus('Integração indisponível ou acesso não autorizado.'); }
  }

  function connect() {
    const fb = sdk();
    if (!fb || !prepared || !session.current || active.current || inFlight.current) return;
    active.current = true; setPrepared(false); setStatus('Conclua o cadastro oficial da Meta.');
    try {
      fb.login(response => {
        if (!active.current) return;
        if (!response.authResponse?.code) { active.current = false; session.current = null; setStatus('Cadastro não concluído.'); return; }
        code.current = response.authResponse.code; void finish();
      }, { config_id: configId, response_type: 'code', override_default_response_type: true,
        extras: { setup: {}, featureType: 'whatsapp_business_app_onboarding', sessionInfoVersion: '3', version: 'v4' } });
    } catch { active.current = false; session.current = null; setStatus('Não foi possível abrir o cadastro da Meta.'); }
  }

  return (
    <main className="mx-auto max-w-xl space-y-4 p-6">
      {configured && user && <Script src="https://connect.facebook.net/en_US/sdk.js" strategy="afterInteractive" onReady={() => {
        const fb = sdk(); if (!fb) return; fb.init({ appId, version, autoLogAppEvents: false, xfbml: false }); setSdkReady(true);
      }} />}
      <h1 className="text-2xl font-semibold">Integração WhatsApp — Coexistência</h1>
      <p>Conecte a conta comercial existente. Não escolha a migração padrão de telefone.</p>
      <p role="status" className="rounded border p-3">{configured ? status : 'Configuração da Meta ainda não disponível.'}</p>
      <button type="button" disabled={!configured || !user || !sdkReady || active.current || inFlight.current} onClick={prepare} className="rounded border px-4 py-2 disabled:opacity-50">Preparar sessão</button>
      <button type="button" disabled={!prepared || !sdkReady} onClick={connect} className="rounded border px-4 py-2 disabled:opacity-50">Conectar WhatsApp Business</button>
    </main>
  );
}
