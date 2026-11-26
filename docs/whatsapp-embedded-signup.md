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
- FIREBASE_AUTH_API_KEY (ou NEXT_PUBLIC_FIREBASE_API_KEY existente)
- WHATSAPP_ADMIN_UIDS (UIDs Firebase autorizados, separados por vírgula)
- WHATSAPP_EXPECTED_PHONE_DIGITS (número comercial completo, apenas dígitos)
- WHATSAPP_SIGNUP_ORIGIN (origem HTTPS exata da página)
- WHATSAPP_SIGNUP_STATE_KEY (32 bytes aleatórios codificados em Base64)
- WHATSAPP_TOKEN_ENCRYPTION_KEY (outra chave de 32 bytes em Base64)
- WHATSAPP_FIRESTORE_PROJECT_ID
- WHATSAPP_FIRESTORE_CLIENT_EMAIL
- WHATSAPP_FIRESTORE_PRIVATE_KEY
- WHATSAPP_SIGNUP_ENABLED (manter false até revisão e configuração)

Usar a conta de serviço CRM WhatsApp, com acesso IAM restrito ao banco nomeado crm-whatsapp do projeto studio-4254367347-1a796 (São Paulo). Não usar o banco (default) nessa integração.
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

## Decisão de arquitetura — 26/11/2026

Aprovado pela responsável do Grupo Florencio: WhatsApp Business permanece a central de conversas; o CRM é a central de gestão e automação, sem cópia do histórico de mensagens.

- Não persistir texto integral de mensagens, arquivos, fotos, vídeos, áudios ou histórico de conversas no CRM/Firestore por padrão.
- O webhook valida a assinatura da Meta e processa somente os ativos explicitamente autorizados. Na fase de testes, o receptor independente guarda apenas contagens de mensagens/status, horário, ambiente e identificador técnico para evitar duplicidade.
- O conteúdo necessário à triagem poderá transitar temporariamente para um workflow N8N autorizado usando HTTPS e autenticação, sem registros de payload ou conteúdo nos logs. Não encaminhar nada antes de configurar e validar o destino.
- O CRM pode registrar apenas identificação necessária do cliente, último contato, status do atendimento, setor responsável, tarefas e pendências, e resumo objetivo quando necessário. Evitar incluir dados de saúde e outros dados excessivos em resumos.
- No N8N, desativar gravação de dados de execuções bem-sucedidas, falhas e manuais que contenham mensagens; desativar salvamento de progresso e revisar logs, filas, backups e retenção do ambiente. Falhas devem ser rastreáveis com metadados mínimos sem conteúdo. Não habilitar respostas automáticas antes da validação de entrega, idempotência e encaminhamento humano.
- Definir política de retenção para metadados antes da operação comercial. Não há histórico retrospectivo de mensagens no CRM.
- O banco adicional tem cobrança por uso; minimizar escritas/leitura e não replicar mídia.

## Estado técnico em 26/11/2026

- Leitura, escrita e limpeza de um registro sintético no Firestore dedicado: validadas na branch de testes.
- Receptor isolado: https://crm-florencio-whatsapp-teste.vercel.app/api/webhook, código em webhook-receiver/api/webhook.mjs. Este projeto é separado do CRM; o ambiente principal dele é usado somente para os ativos de teste.
- Verificação da URL e token aceita pela Meta. Notificação sintética assinada confirmada às 10:15:59, horário de Brasília.
- App CRM Grupo Florencio inscrito na conta de testes WABA 1177893114843156; número de teste Phone Number ID 1432881259912328.
- Mensagem de entrada real: evento recebido e registro técnico salvo às 10:24:50, horário de Brasília. Não se armazenou o corpo da mensagem.
- Pendências: conectar o N8N por endpoint autenticado, testar envio de resposta conforme elegibilidade da Meta, confirmar coexistência e revisar permissões e custos antes do número comercial. WHATSAPP_SIGNUP_ENABLED continua desativado.

Referências adicionais:
- https://firebase.google.com/docs/firestore/pricing
- https://docs.n8n.io/workflows/settings/

A versão de produção do CRM permanece inalterada.
