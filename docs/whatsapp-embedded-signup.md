# Integração WhatsApp — Coexistência

## Implementação

- Página de cadastro: `/settings/whatsapp`.
- Endpoint autenticado SDK: `POST /api/whatsapp/callback`, ações start e complete.
- Retorno hospedado GET: apenas identificação do endpoint; troca de código desabilitada até validar contrato específico.
- A sessão é assinada, expira e tem consumo registrado atomicamente no Firestore.
- O servidor valida o administrador, troca o código com Meta, confirma o telefone esperado e verifica o modo de coexistência via Graph API.
- A conexão é salva criptografada e com status pending_activation. Não há registro padrão do telefone nem assinatura automática de webhooks.

## Variáveis de ambiente (Vercel, inicialmente Preview)

Públicas, somente identificadores:

- NEXT_PUBLIC_META_APP_ID
- NEXT_PUBLIC_META_SIGNUP_CONFIG_ID
- NEXT_PUBLIC_META_GRAPH_API_VERSION

Servidor:

- META_APP_ID
- META_APP_SECRET
- META_GRAPH_API_VERSION
- FIREBASE_AUTH_API_KEY
- WHATSAPP_ADMIN_UIDS (UIDs Firebase autorizados, separados por vírgula)
- WHATSAPP_EXPECTED_PHONE_DIGITS (número comercial completo, apenas dígitos)
- WHATSAPP_SIGNUP_ORIGIN (origem HTTPS exata da página)
- WHATSAPP_SIGNUP_STATE_KEY (32 bytes aleatórios codificados em Base64)
- WHATSAPP_TOKEN_ENCRYPTION_KEY (outra chave de 32 bytes em Base64)
- WHATSAPP_FIRESTORE_PROJECT_ID
- WHATSAPP_FIRESTORE_CLIENT_EMAIL
- WHATSAPP_FIRESTORE_PRIVATE_KEY
- WHATSAPP_SIGNUP_ENABLED (manter false até revisão e configuração)

Usar identidade de serviço restrita, preferencialmente banco isolado de teste.
Não incluir segredos no repositório, no navegador ou nos logs.
Coleções whatsapp-private-connections e whatsapp-private-sessions não devem
ser acessíveis aos clientes Firebase. As regras atuais não concedem acesso
a essas coleções. Revisar IAM, retenção e expiração antes de ativar.

## Validação necessária

1. Configurar Embedded Signup para coexistência no painel da Meta, usando a versão suportada.
2. Configurar origens HTTPS e parâmetros do SDK, sem usar migração padrão.
3. Configurar variáveis em Preview e validar build e autenticação.
4. Testar com conta autorizada e número de teste elegível; não usar número comercial antes da confirmação.
5. Confirmar coexistência, criar assinatura de webhooks e testar envio e recebimento conforme as permissões da Meta.
6. Revisar análise do aplicativo, cobrança e elegibilidade antes da ativação.

Referências:
- https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/implementation
- https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users
- https://firebase.google.com/docs/firestore/use-rest-api

A versão de produção permanece inalterada.
