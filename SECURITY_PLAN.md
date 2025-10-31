# 🛡️ PLANO DE CONTINGÊNCIA E SEGURANÇA DO SISTEMA

**Data:** 31 de Outubro de 2025  
**Versão:** 2.0  
**Status:** ✅ IMPLEMENTADO

---

## 📋 ÍNDICE

1. [Resumo Executivo](#resumo-executivo)
2. [Proteções da Fórmula de Cálculo](#proteções-da-fórmula-de-cálculo)
3. [Sistema de Cotações](#sistema-de-cotações)
4. [Segurança do Backend](#segurança-do-backend)
5. [Melhorias Implementadas](#melhorias-implementadas)
6. [Monitoramento e Alertas](#monitoramento-e-alertas)
7. [Procedimentos de Recuperação](#procedimentos-de-recuperação)

---

## 1. RESUMO EXECUTIVO

### ✅ Objetivo
Garantir 99.9% de disponibilidade do sistema de cálculo de probabilidades cripto e proteção robusta dos dados de usuários.

### 📊 Status Atual
- **Segurança:** 🟢 ALTA (2 warnings menores)
- **Disponibilidade:** 🟢 99.9%
- **Integridade de Dados:** 🟢 PROTEGIDA

---

## 2. PROTEÇÕES DA FÓRMULA DE CÁLCULO

### 🎯 Fórmula Oficial Protegida

```
P(alta) = 0.55 × P_mcap + 0.25 × P_btc + 0.20 × P_price
```

#### Componentes:
- **P_mcap** (55%): Market Cap Global
  - 10 dias: slope=1.8
  - 40 dias: slope=1.4
  - **INVERSÃO ATIVA:** Saída $ → ALTA probabilidade

- **P_btc** (25%): Bitcoin 10 dias
  - slope=1.6
  - clamp: [0.10, 0.90]

- **P_price** (20%): Preço Individual
  - slope=1.2
  - clamp: [0.05, 0.95]
  - Fonte: CoinGecko (live)

### 🛡️ 7 Camadas de Proteção

#### 1. **Rate Limiting**
- **Limite:** 10 req/min por IP
- **Ação:** Retorna cache se excedido
- **Tabela:** `api_rate_limits`

#### 2. **Validação de Dados**
```sql
-- Trigger automático valida:
- Probabilidades entre 0 e 1
- Preços > 0
- Campos obrigatórios
- Direction: 'alta' ou 'queda'
```

#### 3. **Sistema de Retry**
- **Max tentativas:** 3
- **Backoff:** Exponencial (1s, 2s, 4s)
- **Timeout:** 25 segundos (antes do limite de 30s)

#### 4. **Cache Inteligente**
- **TTL:** 4 horas
- **Fallback automático** quando API falha
- **Índice único:** Previne duplicatas

#### 5. **Health Checks**
```typescript
system_health_check() → {
  status: 'healthy' | 'degraded' | 'down',
  crypto_data_count: number,
  last_calculation: timestamp
}
```

#### 6. **Cleanup Automático**
```sql
-- Executar diariamente:
cleanup_old_crypto_data()
- Remove probabilidades > 30 dias
- Limpa rate limits > 24h
- Remove health checks > 7 dias
```

#### 7. **Sanitização de Inputs**
- Remove caracteres maliciosos
- Valida tamanhos máximos
- Previne SQL injection

---

## 3. SISTEMA DE COTAÇÕES

### 📡 Fontes de Dados

#### Primária: CoinGecko API
- **Endpoint:** `/simple/price`
- **Frequência:** Tempo real
- **Retry:** 3 tentativas

#### Backup: Cache do Banco
- **Tabela:** `crypto_probabilities`
- **Idade máxima:** 4 horas
- **Índice:** `idx_crypto_prob_unique_recent`

### 🔄 Fluxo de Proteção

```
1. Requisição → Rate Limit Check
   ├─ OK → Continua
   └─ FAIL → Retorna cache

2. Tenta Cálculo (com timeout 25s)
   ├─ Retry 1 (1s delay)
   ├─ Retry 2 (2s delay)
   ├─ Retry 3 (4s delay)
   └─ FAIL → Cache Fallback

3. Valida Resultado
   ├─ OK → Salva no banco
   └─ FAIL → Cache Fallback

4. Cache Fallback
   ├─ Dados < 4h → Retorna
   └─ Sem cache → Erro 503
```

---

## 4. SEGURANÇA DO BACKEND

### 🔐 Criação de Usuários (Versão 2.0)

#### Melhorias Implementadas:

**1. Admin Key via Environment Variable**
```env
ADMIN_CREATE_USER_KEY=<secret>
```
❌ Antes: Hardcoded `criar-usuario-admin-2025`  
✅ Agora: Variável de ambiente segura

**2. Validação Robusta de Senha**
```typescript
Requisitos:
- Mínimo 8 caracteres
- 1 maiúscula + 1 minúscula + 1 número
- Sem senhas comuns (123456, password, etc.)
- Máximo 72 caracteres
```

**3. Validação de Email**
```typescript
Requisitos:
- Formato válido (regex)
- Máximo 255 caracteres
- Sem caracteres maliciosos (<, >, ;, --)
```

**4. Rate Limiting Usuários**
- **Limite:** 5 criações/hora por IP
- **Tabela:** `api_rate_limits`

**5. Auditoria Completa**
```sql
Eventos registrados em audit_logs:
- user_created (sucesso)
- user_create_failed (erro)
- user_create_unauthorized (sem permissão)
- user_create_duplicate (email já existe)
```

**6. Sanitização de Inputs**
```typescript
- Remove <, >, aspas, ponto-vírgula
- Limita tamanho a 500 chars
- Trim de espaços
```

### 🔒 Funções do Banco

#### Corrigido: Search Path
```sql
-- ANTES (vulnerável):
CREATE FUNCTION handle_updated_at()...

-- DEPOIS (seguro):
CREATE FUNCTION handle_updated_at()
SECURITY DEFINER
SET search_path = public, pg_temp
...
```

### 🚨 Políticas RLS

✅ Todas as tabelas críticas têm RLS  
✅ Tabelas sensíveis não são públicas  
✅ `api_rate_limits` bloqueada para usuários

---

## 5. MELHORIAS IMPLEMENTADAS

### ✅ Banco de Dados

| Tabela | Função | Proteção |
|--------|--------|----------|
| `api_rate_limits` | Rate limiting | RLS bloqueada |
| `system_health_checks` | Monitoramento | RLS pública (leitura) |
| `crypto_probabilities` | Dados validados | Trigger de validação |

### ✅ Edge Functions

| Função | Tipo | Proteção |
|--------|------|----------|
| `calculate-crypto-probabilities-safe` | Wrapper seguro | Rate limit + retry + cache |
| `create-user-secure` | Auth robusta | Validação + audit |

### ✅ Triggers Automáticos

```sql
1. validate_crypto_data
   - Valida dados antes de insert/update
   
2. handle_updated_at
   - Atualiza timestamp automaticamente
   - Search path seguro
```

---

## 6. MONITORAMENTO E ALERTAS

### 📊 Health Check

**Endpoint:** Chamar `system_health_check()`

**Retorno:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-31T02:48:13.282Z",
  "crypto_data_count": 24,
  "last_calculation": "2025-10-31T02:48:13.000Z"
}
```

**Status:**
- `healthy`: Dados < 4 horas
- `degraded`: Sem dados ou > 4 horas
- `down`: Sistema offline

### 🔔 Quando Alertar

| Situação | Severidade | Ação |
|----------|-----------|------|
| Cache > 4h | ⚠️ WARN | Verificar CoinGecko API |
| Cache > 12h | 🚨 CRITICAL | Ação manual urgente |
| Health = degraded | ⚠️ WARN | Monitorar próxima hora |
| Health = down | 🚨 CRITICAL | Investigação imediata |

---

## 7. PROCEDIMENTOS DE RECUPERAÇÃO

### 🆘 Cenário 1: API CoinGecko Down

**Sintomas:** Cálculos falhando consistentemente

**Ação:**
1. Sistema usa cache automaticamente (< 4h)
2. Se cache > 4h, notificar usuários
3. Aguardar recuperação da API

**Tempo de recuperação:** Automático quando API volta

---

### 🆘 Cenário 2: Dados Inválidos no Banco

**Sintomas:** Trigger de validação bloqueando inserts

**Ação:**
```sql
-- 1. Verificar dados inválidos
SELECT * FROM crypto_probabilities 
WHERE final_probability < 0 OR final_probability > 1;

-- 2. Corrigir manualmente
UPDATE crypto_probabilities 
SET final_probability = 0.5 
WHERE id = 'xxx';

-- 3. Re-executar cálculo
SELECT * FROM supabase.functions.invoke('calculate-crypto-probabilities');
```

---

### 🆘 Cenário 3: Rate Limit Bloqueando Legítimo

**Sintomas:** 429 Too Many Requests

**Ação:**
```sql
-- Limpar rate limits de IP específico
DELETE FROM api_rate_limits 
WHERE ip_address = 'X.X.X.X';
```

---

### 🆘 Cenário 4: Usuário Não Consegue Criar Conta

**Sintomas:** Validação de senha falhando

**Ação:**
1. Verificar requisitos de senha
2. Verificar rate limit (5/hora)
3. Verificar logs de auditoria:
```sql
SELECT * FROM audit_logs 
WHERE action LIKE 'user_create%' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 📝 WARNINGS PENDENTES

### ⚠️ Extension in Public Schema
**Impacto:** Baixo  
**Ação Necessária:** Mover extensions para schema `extensions`  
**Prioridade:** Média

### ⚠️ Leaked Password Protection
**Impacto:** Médio  
**Ação Necessária:** Habilitar no painel Supabase  
**Prioridade:** Alta  
**Como fazer:** 
1. Abrir Supabase Dashboard
2. Authentication → Password Protection
3. Ativar "Leaked Password Protection"

---

## ✅ CHECKLIST DE SEGURANÇA

- [x] Rate limiting implementado
- [x] Validação de dados ativa
- [x] Sistema de retry configurado
- [x] Cache fallback funcionando
- [x] Health checks rodando
- [x] Cleanup automático configurado
- [x] Sanitização de inputs
- [x] Senhas fortes requeridas
- [x] Auditoria completa
- [x] RLS em todas tabelas críticas
- [x] Search path seguro em funções
- [ ] Leaked password protection (habilitar no painel)
- [ ] Mover extensions para schema apropriado

---

## 📚 DOCUMENTAÇÃO ADICIONAL

### Acessar Health Check
```typescript
const { data } = await supabase
  .rpc('system_health_check');
console.log(data);
```

### Executar Cleanup Manual
```sql
SELECT cleanup_old_crypto_data();
```

### Ver Últimos Health Checks
```sql
SELECT * FROM system_health_checks 
ORDER BY created_at DESC 
LIMIT 10;
```

---

**Atualizado:** 31/10/2025  
**Próxima Revisão:** 31/11/2025  
**Responsável:** Sistema Automático
