# Integração WhatsApp — Coexistência

## Estado atual

A rota `/api/whatsapp/callback` está em preparação. O módulo
`src/lib/whatsapp/embedded-signup.server.ts` implementa a troca de código
por token empresarial, exclusivamente no servidor. A rota pública ainda não
executa a troca: falta validar o contrato do cadastro hospedado, a sessão
administrativa e o armazenamento seguro do token.

## Configuração de ambiente

Configurar na Vercel, exclusivamente no ambiente servidor:

- `META_APP_ID`
- `META_APP_SECRET`
- `META_GRAPH_API_VERSION` (versão efetivamente utilizada no painel)
- Identificador da configuração de Embedded Signup, após criação no painel.

Não colocar segredos no GitHub, no navegador, em variáveis NEXT_PUBLIC
ou em logs. Usar ambientes de teste separados da produção.

## Ativação

1. Confirmar a configuração de cadastro incorporado e a opção de conectar
   uma conta existente do WhatsApp Business.
2. Vincular o retorno à sessão autenticada de um administrador do CRM,
   com validação de estado e proteção contra repetição.
3. Persistir o token em armazenamento servidor de acesso restrito.
4. Confirmar os identificadores do ativo e a propriedade da conta.
5. Configurar a assinatura dos webhooks e testar recebimento e envio
   após autorização do responsável pela conta.
6. Para coexistência, não realizar o registro padrão do telefone.
7. Verificar a análise do aplicativo, a elegibilidade e a necessidade
   de pagamento antes de ativar o número comercial.

Referências oficiais:
- https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/overview
- https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-customers-as-a-tech-provider
- https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users

Nenhum número comercial deve ser migrado ou desconectado durante os testes.
