# Deploy mínimo no EasyPanel (ARM64)

Este perfil instala somente o app DeskcommCRM. Banco, Auth, Storage e Realtime ficam no Supabase Cloud; rate limit e idempotência ficam no Upstash Redis REST.

## Imagem

- Registry: `ghcr.io`
- Imagem: `ghcr.io/werlleybatista01/deskcommcrm:arm64-latest`
- Plataforma: `linux/arm64`
- Porta interna: `3000`
- Health check: `/api/v1/health`
- Réplicas iniciais: `1`
- Limite inicial: `512 MB RAM` e `0.50 CPU`

A imagem é compilada pelo GitHub Actions em runner ARM64. Não compilar na VPS.

## Variáveis obrigatórias do primeiro boot

Preencher diretamente no EasyPanel; nunca salvar valores reais neste repositório.

- `NODE_ENV=production`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_ADMIN_URL`
- `INTERNAL_SECRET`
- `CPF_ENCRYPTION_KEY`
- `WAHA_BYO_ENCRYPTION_KEY`
- `AI_CRED_AES_KEY`
- `IMPERSONATE_COOKIE_SECRET`
- `LGPD_SIGNING_KEY`
- `EVENT_LOG_WORKER_ENABLED=false`
- `INTERNAL_AGENT_RUN_STUB=false`
- `NUVEMSHOP_ENABLED=false`
- `SENTRY_DSN=off`

## Integrações mantidas desativadas no primeiro boot

Deixar vazias:

- `WAHA_API_BASE_URL`
- `WAHA_API_KEY`
- `WAHA_WEBHOOK_BASE_URL`
- `AI_GATEWAY_API_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `NUVEMSHOP_APP_ID`
- `NUVEMSHOP_CLIENT_ID`
- `NUVEMSHOP_CLIENT_SECRET`

Com WAHA vazio, o app inicia e o health check retorna `degraded` para WhatsApp, sem impedir a validação de Supabase, Redis, autenticação e interface.

## Não instalar

- PostgreSQL local
- Redis local
- serverless-redis-http
- outro WAHA
- Caddy
- modelo de IA local

## Ordem controlada

1. Aplicar migrations no Supabase dedicado.
2. Criar o usuário proprietário.
3. Publicar a imagem ARM64 no GHCR.
4. Criar somente o app no EasyPanel.
5. Configurar domínio HTTPS gerado pelo EasyPanel.
6. Validar health check, login e navegação básica.
7. Medir CPU e RAM no Beszel.
8. Adicionar scheduler leve.
9. Validar e só então integrar WAHA.
10. Ativar IA e Nuvemshop em etapas posteriores.
