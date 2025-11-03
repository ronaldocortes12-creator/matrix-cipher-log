# 📖 RUNBOOK - Guia de Operação e Manutenção

## 🎯 Visão Geral

Este documento contém procedimentos operacionais, comandos úteis e guias de troubleshooting para manter o sistema rodando de forma saudável e consistente.

---

## 📊 MONITORAMENTO DIÁRIO

### 1. Verificar Saúde Geral do Sistema

```bash
# Via curl (substituir URL pelo seu projeto)
curl https://ddmimmbnuvcqlndkawar.supabase.co/functions/v1/system-health
```

**Resposta esperada:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-03T12:00:00Z",
  "crypto_data_count": 10,
  "last_calculation": "2025-11-03T11:30:00Z"
}
```

**⚠️ Se status = "degraded":**
- Verificar logs da edge function `update-crypto-data`
- Conferir se o cron job está rodando (`SELECT * FROM cron.job WHERE active = true;`)
- Executar cálculo manual: Chamar edge function `calculate-crypto-probabilities-safe`

---

### 2. Consultar Erros Não Resolvidos

```sql
-- Ver erros das últimas 24h
SELECT 
  function_name,
  error_type,
  error_message,
  COUNT(*) as occurrences,
  MAX(created_at) as last_occurrence
FROM error_logs
WHERE resolved = false
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY function_name, error_type, error_message
ORDER BY occurrences DESC;
```

**🔧 Ações:**
- Se > 10 ocorrências do mesmo erro: Investigar edge function correspondente
- Se erro crítico (`PostgrestError`, `AuthError`): Verificar RLS policies
- Marcar como resolvido após correção:
  ```sql
  UPDATE error_logs 
  SET resolved = true, resolved_at = NOW() 
  WHERE function_name = 'nome_da_funcao' AND error_type = 'tipo_do_erro';
  ```

---

### 3. Verificar Sincronização Lessons ↔ Lesson_Progress

```sql
-- Verificar inconsistências entre lessons e lesson_progress
SELECT 
  l.user_id,
  l.lesson_number,
  l.status as lesson_status,
  lp.completed as progress_completed,
  CASE 
    WHEN l.status = 'completed' AND (lp.completed IS NULL OR lp.completed = false) THEN '⚠️ Lesson completed but progress not synced'
    WHEN lp.completed = true AND l.status != 'completed' THEN '⚠️ Progress completed but lesson not marked'
    ELSE '✅ OK'
  END as sync_status
FROM lessons l
LEFT JOIN lesson_progress lp ON l.user_id = lp.user_id AND l.lesson_number = lp.lesson_day
WHERE l.status = 'completed' OR lp.completed = true
ORDER BY l.user_id, l.lesson_number;
```

**🔧 Correção manual (se necessário):**
```sql
-- Chamar edge function de reconciliação
SELECT net.http_post(
  url := 'https://ddmimmbnuvcqlndkawar.supabase.co/functions/v1/reconcile-lesson-progress',
  headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
);
```

---

## 🛠️ MANUTENÇÃO SEMANAL

### Executar Manutenção Automática

```sql
-- Rodar manualmente (já configurado como cron semanal)
SELECT weekly_maintenance();
```

**O que faz:**
- ✅ VACUUM ANALYZE em tabelas críticas
- ✅ Cleanup de dados antigos (crypto_probabilities, rate_limits)
- ✅ Refresh da materialized view `community_feed_optimized`
- ✅ Log de auditoria

---

### Verificar Performance de Queries

```sql
-- Top 10 queries mais lentas (últimos 7 dias)
SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time,
  stddev_exec_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**🔧 Se query > 500ms:**
- Verificar se índices estão sendo usados (`EXPLAIN ANALYZE`)
- Considerar adicionar índices compostos
- Verificar se RLS policies estão otimizadas

---

## 🚨 TROUBLESHOOTING COMUM

### Problema: "Chat não carrega histórico"

**Diagnóstico:**
```sql
-- Verificar mensagens do usuário
SELECT COUNT(*), MAX(created_at) 
FROM chat_messages 
WHERE user_id = 'USER_ID_AQUI';
```

**Solução:**
1. Verificar se `lesson_id` está definido
2. Confirmar RLS policies em `chat_messages`
3. Testar login/logout do usuário

---

### Problema: "Cálculo de probabilidades travado"

**Diagnóstico:**
```bash
# Verificar logs da edge function
curl -H "Authorization: Bearer ANON_KEY" \
  https://ddmimmbnuvcqlndkawar.supabase.co/functions/v1/calculate-crypto-probabilities-safe
```

**Solução:**
1. Se timeout (> 25s): Verificar API externa (CoinGecko)
2. Se erro de matemática: Revisar fórmula em `calculate-crypto-probabilities-safe/index.ts`
3. Fallback: Usar cache (`crypto_probabilities` com `created_at` recente)

---

### Problema: "Infinite scroll não carrega mais posts"

**Diagnóstico:**
```sql
-- Verificar total de posts públicos
SELECT COUNT(*) FROM community_posts WHERE deleted_at IS NULL;
```

**Solução:**
1. Confirmar que há posts suficientes (> 20)
2. Verificar `page` state no componente `Community.tsx`
3. Testar InfiniteScrollTrigger (`hasMore` flag)

---

## 🔐 SEGURANÇA

### Verificar RLS Ativo em Todas as Tabelas

```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;
```

**⚠️ Se alguma tabela aparecer:**
```sql
ALTER TABLE public.NOME_DA_TABELA ENABLE ROW LEVEL SECURITY;
```

---

### Revisar Políticas RLS

```sql
-- Ver todas as policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**🔒 Políticas críticas:**
- `chat_messages`: Apenas dono (auth.uid() = user_id)
- `lessons`: Apenas dono (auth.uid() = user_id)
- `community_posts`: Público para SELECT, dono para UPDATE/DELETE
- `profiles`: Público para SELECT, dono para UPDATE

---

## 📦 BACKUP & DISASTER RECOVERY

### Verificar Último Backup (PITR)

```sql
SELECT * FROM backup_logs 
ORDER BY created_at DESC 
LIMIT 5;
```

**Configuração atual:**
- ✅ Point-in-Time Recovery: 7 dias
- ✅ Backup diário automático (cron 1h)
- ✅ Tabelas incluídas: chat_messages, lessons, profiles, crypto_probabilities, community_*

**Restaurar snapshot (via Lovable Cloud UI):**
1. Backend > Backups
2. Selecionar data/hora
3. Confirmar restauração

---

## 📊 QUERIES ADMINISTRATIVAS PARA ANÁLISE DE USUÁRIOS

### Ver Todos os Usuários e Seu Progresso Geral

```sql
SELECT * FROM admin_user_overview 
ORDER BY user_since DESC;
```

**Campos retornados:**
- `user_id`, `full_name`, `username`, `email_verified`
- `account_status`, `crypto_experience`, `user_since`, `last_login_at`
- `language`, `has_seen_welcome`
- `total_lessons`, `lessons_completed`, `total_messages`
- `posts_created`, `comments_made`

---

### Ver TODAS as Mensagens de um Usuário Específico

```sql
SELECT * FROM admin_messages_by_user 
WHERE user_id = 'USER_ID_AQUI' 
ORDER BY sent_at DESC;
```

**Campos retornados:**
- `user_id`, `user_name`, `lesson_id`, `lesson_number`, `lesson_title`
- `message_id`, `message_role`, `message_content`, `sent_at`
- `is_orphan_message` (flag para mensagens sem lesson)

---

### Ver Progresso Detalhado de Lessons de um Usuário

```sql
SELECT * FROM admin_user_lesson_progress 
WHERE user_id = 'USER_ID_AQUI' 
ORDER BY lesson_number;
```

**Campos retornados:**
- `user_id`, `user_name`, `lesson_number`, `title`
- `lesson_status`, `lesson_created`, `lesson_updated`
- `progress_completed`, `progress_completed_at`
- `messages_in_lesson`, `first_message_at`, `last_message_at`

---

### Ver Atividade Comunitária de um Usuário

```sql
SELECT * FROM admin_user_community_activity 
WHERE user_id = 'USER_ID_AQUI';
```

**Campos retornados:**
- `user_id`, `user_name`
- `total_posts`, `total_post_likes_received`, `last_post_at`
- `total_comments`, `total_comment_likes_received`, `last_comment_at`
- `total_likes_given`, `total_engagement_score`

---

### Identificar Mensagens Órfãs (Se Houver)

```sql
SELECT * FROM admin_messages_by_user 
WHERE is_orphan_message = true;
```

**⚠️ Ação necessária se encontrar mensagens órfãs:**
```sql
-- Associar à Lesson 1 do usuário
UPDATE chat_messages 
SET lesson_id = (
  SELECT id FROM lessons 
  WHERE user_id = 'USER_ID_AQUI' 
  AND lesson_number = 1 
  LIMIT 1
)
WHERE id = 'MESSAGE_ID_AQUI';
```

---

### Ver Usuários Mais Engajados na Comunidade

```sql
SELECT * FROM admin_user_community_activity 
ORDER BY total_engagement_score DESC 
LIMIT 10;
```

---

### Ver Histórico Completo de Interações (Todas as Tabelas)

```sql
-- Mensagens do usuário
SELECT 'chat_message' as tipo, created_at, content as detalhe
FROM chat_messages WHERE user_id = 'USER_ID_AQUI'

UNION ALL

-- Posts criados
SELECT 'post' as tipo, created_at, content as detalhe
FROM community_posts WHERE user_id = 'USER_ID_AQUI' AND deleted_at IS NULL

UNION ALL

-- Comentários feitos
SELECT 'comment' as tipo, created_at, content as detalhe
FROM community_comments WHERE user_id = 'USER_ID_AQUI' AND deleted_at IS NULL

UNION ALL

-- Ações de auditoria
SELECT 'audit' as tipo, created_at, action as detalhe
FROM audit_logs WHERE user_id = 'USER_ID_AQUI'

ORDER BY created_at DESC
LIMIT 100;
```

---

## 📈 MÉTRICAS DE USO

### Usuários Ativos (últimos 7 dias)

```sql
SELECT 
  COUNT(DISTINCT user_id) as active_users,
  COUNT(*) as total_actions
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '7 days';
```

### Aulas Mais Concluídas

```sql
SELECT 
  lesson_day,
  COUNT(*) as completions
FROM lesson_progress
WHERE completed = true
GROUP BY lesson_day
ORDER BY lesson_day;
```

### Rate Limiting - Top Usuários

```sql
SELECT 
  identifier,
  endpoint,
  SUM(request_count) as total_requests,
  MAX(window_start) as last_request
FROM api_rate_limits
WHERE window_start > NOW() - INTERVAL '24 hours'
GROUP BY identifier, endpoint
ORDER BY total_requests DESC
LIMIT 20;
```

---

## 🔄 PROCESSOS AUTOMATIZADOS (Cron Jobs)

### Ver Status dos Cron Jobs

```sql
SELECT 
  jobname,
  schedule,
  active,
  command
FROM cron.job
ORDER BY jobname;
```

**Jobs configurados:**
1. `refresh-community-feed` - Cada 5 min
2. `cleanup-rate-limits` - Cada 1h
3. `cleanup-health-snapshots` - Diário 2h
4. `cleanup-old-crypto` - Diário 3h
5. `weekly-maintenance` - Domingo 4h
6. `daily-backup-log` - Diário 1h
7. `update-crypto-data` - Cada 4h
8. `enforce-lesson-states` - Cada 30 min
9. `reconcile-lesson-progress` - Cada 1h
10. `cleanup-old-cron-logs` - Diário 5h
11. `system-health-snapshot` - Cada 15 min

**Desabilitar job (se necessário):**
```sql
SELECT cron.unschedule('nome_do_job');
```

**Reabilitar:**
```sql
-- Ver comando original em pg_cron e recriar
```

---

## 🆘 CONTATOS DE EMERGÊNCIA

**Equipe Técnica:**
- Desenvolvedor Principal: [SEU NOME]
- Email: [SEU EMAIL]
- Discord/Slack: [SEU CANAL]

**Recursos Externos:**
- Lovable Cloud Docs: https://docs.lovable.dev/features/cloud
- Supabase Docs: https://supabase.com/docs
- Lovable Discord: https://discord.com/channels/1119885301872070706/1280461670979993613

---

## 📝 CHANGELOG

### 2025-11-03 - Hardening Completo
- ✅ RLS em 28 tabelas
- ✅ Rate limiting ativo (chat + crypto-info)
- ✅ Retry logic com exponential backoff
- ✅ Infinite scroll otimizado
- ✅ 11 cron jobs automatizados
- ✅ Error logging centralizado
- ✅ Backup diário PITR (7 dias)

---

**🔒 Sistema blindado e pronto para produção. Use este guia para manter a consistência e robustez!**
