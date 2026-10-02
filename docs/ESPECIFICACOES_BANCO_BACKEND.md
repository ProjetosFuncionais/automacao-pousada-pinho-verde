# Especificações do Banco de Dados e Backend — Pousada Pinho Verde

Documento técnico de arquitetura e especificação do **Sistema de Vouchers e Gestão de Reservas da Pousada Pinho Verde**. Projetado para servir como referência principal de continuidade no VS Code com auxílio do Claude.

---

## 1. Visão Geral da Arquitetura

O sistema adota uma arquitetura em três camadas desacopladas com separação estrita de responsabilidades:

```text
[ Navegador: React + TypeScript ]
       │
       ├── 1. Login / Sessão (HTTPS) ────────────► [ Supabase Auth ]
       │      (Usa apenas SUPABASE_URL e SUPABASE_ANON_KEY)
       │
       └── 2. Operações de Reserva + JWT Bearer ─► [ API REST Python Flask ]
                                                          │
                                                          ├── Valida Token JWT no Supabase Auth
                                                          ├── Verifica Profile Ativo (tabela profiles)
                                                          ├── Aplica Regras de Negócio e Validações
                                                          └── Executa Queries (SUPABASE_SERVICE_ROLE_KEY)
                                                                     │
                                                                     ▼
                                                       [ Supabase PostgreSQL (RLS Ativo) ]
```

**Princípio Central de Segurança:** O frontend utiliza o SDK do Supabase **exclusivamente** para autenticação (`signInWithPassword`, `signOut`, `getSession`). Nenhuma query de banco de dados (`supabase.from('reservas')`) é feita pelo navegador. Todas as operações de negócio trafegam pela API Flask, onde a chave `SUPABASE_SERVICE_ROLE_KEY` fica protegida no servidor.

---

## 2. Estrutura do Backend Flask

```text
backend/
├── app/
│   ├── __init__.py                 # Application Factory (create_app) e registro de Blueprints/erros
│   ├── config.py                   # Carregamento e validação de variáveis de ambiente
│   ├── extensions.py               # Instanciação segura dos clientes Supabase (Anon e Service Role)
│   ├── middleware/
│   │   └── auth_middleware.py      # Decorator @require_auth (valida Bearer token e profile ativo)
│   ├── repositories/
│   │   ├── profile_repository.py   # Consultas à tabela public.profiles
│   │   └── reserva_repository.py   # Operações CRUD e filtros na tabela public.reservas
│   ├── routes/
│   │   ├── health_routes.py        # GET /api/health
│   │   ├── auth_routes.py          # GET /api/me
│   │   └── reserva_routes.py       # Rotas /api/reservas, cancelamento e geração de voucher
│   ├── schemas/
│   │   └── reserva_schema.py       # Validação de payload, normalização e regras de domínio
│   ├── services/
│   │   ├── reserva_service.py      # Regras de negócio, cálculo de saldo e orquestração
│   │   └── voucher_service.py      # Montagem estruturada dos dados e políticas do voucher
│   └── utils/
│       ├── errors.py               # Exceções customizadas (APIError) e handler JSON padronizado
│       └── validators.py           # Validação de CPF, telefone, datas e valores monetários
├── tests/
│   ├── conftest.py                 # Fixtures do Pytest, app de teste e mocks de autenticação
│   ├── test_autenticacao.py        # Testes de proteção de rotas, token ausente/inválido e profile inativo
│   ├── test_calculo_saldo.py       # Testes de cálculo de saldo e limites financeiros
│   └── test_validacoes_reserva.py  # Testes de datas (checkout > checkin), pessoas > 0 e campos
├── .env.example                    # Modelo de variáveis de ambiente sem segredos reais
├── requirements.txt                # Dependências Python com versões fixadas
└── run.py                          # Ponto de entrada para execução do servidor Flask
```

---

## 3. Responsabilidade de Cada Pasta

- **`app/routes/`**: Camada HTTP (Controllers). Recebe requisições JSON, extrai parâmetros de rota/query, chama a camada de `services` e devolve respostas com o status HTTP adequado. Não contém SQL nem regras de negócio complexas.
- **`app/services/`**: Camada de Regras de Negócio. Garante que reservas canceladas não sejam editadas indevidamente, valida regras financeiras e temporais, calcula indicadores e estrutura o documento de voucher.
- **`app/repositories/`**: Camada de Persistência (Data Access Layer). Isola chamadas ao SDK Python do Supabase (`table("reservas").select(...)`). Se no futuro o acesso mudar para SQLAlchemy/Psycopg, apenas esta pasta será alterada.
- **`app/schemas/`**: Deserialização e validação rigorosa dos dados recebidos nos endpoints `POST` e `PUT`, acumulando erros por campo no dicionário `campos`.
- **`app/middleware/`**: Interceptação de segurança. Extrai o header `Authorization: Bearer <TOKEN>`, consulta o usuário no Supabase Auth, busca o registro correspondente em `public.profiles` e bloqueia usuários inativos (`403 Forbidden`).
- **`app/utils/`**: Funções puras de validação (CPF, datas ISO, valores decimais) e formatação padronizada de erros (`{"erro": ..., "mensagem": ..., "campos": {}}`).

---

## 4. Modelo Completo do Banco de Dados

O banco de dados PostgreSQL no Supabase é composto por duas tabelas no schema `public`, integradas à tabela nativa `auth.users`:

1. **`auth.users`** (Gerenciada pelo Supabase Auth)
2. **`public.profiles`** (Dados funcionais do colaborador da pousada)
3. **`public.reservas`** (Registros de reservas e hospedagens dos chalés)

---

## 5. Dicionário de Dados das Tabelas

### 5.1. Tabela `public.profiles`

| Coluna | Tipo | Nulo? | Padrão | Descrição / Regras |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | Não | — | **PK** e **FK** para `auth.users(id) ON DELETE CASCADE`. |
| `nome_completo` | `VARCHAR(150)` | Não | — | Nome completo do colaborador (mínimo 3 caracteres). |
| `perfil` | `VARCHAR(20)` | Não | `'recepcao'` | `CHECK (perfil IN ('admin', 'recepcao'))`. |
| `ativo` | `BOOLEAN` | Não | `TRUE` | Define se o funcionário possui acesso liberado à API. |
| `created_at` | `TIMESTAMPTZ` | Não | `NOW()` | Data/hora de criação do perfil. |

### 5.2. Tabela `public.reservas`

| Coluna | Tipo | Nulo? | Padrão | Descrição / Regras |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | Não | `gen_random_uuid()` | **PK**. Identificador único da reserva e do voucher. |
| `nome_completo` | `VARCHAR(150)` | Não | — | Nome completo do hóspede titular. |
| `cpf` | `VARCHAR(14)` | Não | — | CPF formatado (`000.000.000-00`) ou apenas dígitos. |
| `whatsapp` | `VARCHAR(20)` | Não | — | Telefone/WhatsApp de contato com DDD. |
| `endereco` | `TEXT` | Não | — | Endereço completo do hóspede. |
| `numero_chale` | `VARCHAR(50)` | Não | — | Identificação do chalé (ex.: `Chalé 03 - Araucária`). |
| `quantidade_pessoas` | `INTEGER` | Não | — | `CHECK (quantidade_pessoas > 0)`. |
| `data_checkin` | `DATE` | Não | — | Data de entrada (Check-in às 15h). |
| `data_checkout` | `DATE` | Não | — | `CHECK (data_checkout > data_checkin)` (Check-out às 12h). |
| `valor_total_hospedagem` | `NUMERIC(10,2)` | Não | — | `CHECK (valor_total_hospedagem >= 0)`. |
| `valor_total_pago` | `NUMERIC(10,2)` | Não | `0.00` | `CHECK (valor_total_pago >= 0 AND valor_total_pago <= valor_total_hospedagem)`. |
| `valor_total_receber` | `NUMERIC(10,2)` | Não | `GENERATED ALWAYS` | Calculado pelo banco: `valor_total_hospedagem - valor_total_pago`. |
| `descricao` | `TEXT` | Sim | `NULL` | Observações opcionais da reserva (ex.: berço extra, decoração). |
| `status` | `VARCHAR(20)` | Não | `'confirmada'` | `CHECK (status IN ('confirmada', 'cancelada'))`. |
| `criado_por` | `UUID` | Não | — | **FK** para `public.profiles(id) ON DELETE RESTRICT`. |
| `created_at` | `TIMESTAMPTZ` | Não | `NOW()` | Data/hora de registro da reserva. |
| `updated_at` | `TIMESTAMPTZ` | Não | `NOW()` | Atualizado via trigger a cada `UPDATE`. |

---

## 6. Relacionamentos

- **`auth.users (1) ─── (1) public.profiles`**: Todo funcionário cadastrado no Supabase Auth possui um registro correspondente em `public.profiles` compartilhando o mesmo `id` (UUID).
- **`public.profiles (1) ─── (N) public.reservas`**: Um funcionário (`profiles.id`) pode cadastrar várias reservas (`reservas.criado_por`). A cláusula `ON DELETE RESTRICT` impede a exclusão física de um perfil que já tenha emitido reservas; em caso de desligamento do colaborador, altera-se `profiles.ativo = FALSE`.

---

## 7. Regras de Negócio

1. **Hóspedes por acomodação (`quantidade_pessoas`)**: Deve ser um número inteiro estritamente maior que zero (`> 0`).
2. **Período de estadia**: A `data_checkout` deve ser estritamente posterior à `data_checkin` (`data_checkout > data_checkin`), garantindo no mínimo 1 diária.
3. **Integridade financeira**:
   - `valor_total_hospedagem >= 0`
   - `valor_total_pago >= 0`
   - `valor_total_pago <= valor_total_hospedagem` (não é permitido registrar pagamento superior ao valor total da hospedagem).
4. **Cálculo automático e imutabilidade do saldo**:
   - `valor_total_receber = valor_total_hospedagem - valor_total_pago`.
   - O campo nunca é aceito como entrada editável no payload da API e é definido como `GENERATED ALWAYS AS (...) STORED` no PostgreSQL.
5. **Preservação histórica no cancelamento**:
   - Cancelar uma reserva jamais executa `DELETE`. Apenas altera `status` para `'cancelada'` via `PATCH /api/reservas/<id>/cancelar`.
   - Reservas já canceladas não podem ser editadas nem canceladas novamente (`409 Conflict`).
6. **Emissão de Voucher**:
   - O voucher só existe para reservas persistidas no banco (que possuem `id` UUID válido).
   - O endpoint `GET /api/reservas/<id>/voucher` retorna os dados consolidados da reserva, cálculo de diárias e as políticas oficiais da Pousada Pinho Verde.

---

## 8. SQL Utilizado na Migration

O script completo encontra-se em `supabase/migrations/001_initial_schema.sql`. Os pontos principais incluem:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Coluna gerada automaticamente na tabela public.reservas:
valor_total_receber NUMERIC(10,2)
    GENERATED ALWAYS AS (valor_total_hospedagem - valor_total_pago) STORED,

-- Constraints de negócio no banco:
CONSTRAINT chk_reservas_quantidade_pessoas_positiva CHECK ( quantidade_pessoas > 0 ),
CONSTRAINT chk_reservas_datas_validas CHECK ( data_checkout > data_checkin ),
CONSTRAINT chk_reservas_valor_hospedagem_nao_negativo CHECK ( valor_total_hospedagem >= 0 ),
CONSTRAINT chk_reservas_valor_pago_nao_negativo CHECK ( valor_total_pago >= 0 ),
CONSTRAINT chk_reservas_valor_pago_menor_igual_total CHECK ( valor_total_pago <= valor_total_hospedagem ),
CONSTRAINT chk_reservas_status_valido CHECK ( status IN ('confirmada', 'cancelada') )
```

---

## 9. Lista dos Endpoints da API Flask

| Método | Rota | Autenticação | Descrição | Códigos HTTP |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Pública | Verifica disponibilidade da API. | `200` |
| `GET` | `/api/me` | Bearer Token | Retorna dados do usuário autenticado e seu `profile`. | `200`, `401`, `403` |
| `GET` | `/api/reservas` | Bearer Token | Lista reservas com busca (`?busca=`) e filtro (`?status=`). | `200`, `401`, `403` |
| `GET` | `/api/reservas/<id>` | Bearer Token | Retorna detalhes de uma reserva específica por UUID. | `200`, `400`, `401`, `404` |
| `POST` | `/api/reservas` | Bearer Token | Cadastra nova reserva validando todas as regras de negócio. | `201`, `400`, `401`, `422` |
| `PUT` | `/api/reservas/<id>` | Bearer Token | Atualiza dados de uma reserva ativa (`confirmada`). | `200`, `400`, `404`, `409`, `422` |
| `PATCH` | `/api/reservas/<id>/cancelar` | Bearer Token | Cancela uma reserva mantendo o histórico (`status = cancelada`). | `200`, `404`, `409` |
| `GET` | `/api/reservas/<id>/voucher` | Bearer Token | Gera estrutura completa do voucher pronta para exibição/impressão. | `200`, `404` |

---

## 10. Exemplos de Requisição e Resposta

### 10.1. `POST /api/reservas` (Requisição)

```json
{
  "nome_completo": "Mariana Costa Mendes",
  "cpf": "345.678.901-22",
  "whatsapp": "(35) 99812-3344",
  "endereco": "Rua das Hortênsias, 420, Bairro Jardim, São Paulo - SP",
  "numero_chale": "Chalé 02 - Manacá",
  "quantidade_pessoas": 2,
  "data_checkin": "2026-11-10",
  "data_checkout": "2026-11-14",
  "valor_total_hospedagem": 2400.00,
  "valor_total_pago": 1200.00,
  "descricao": "Lua de mel. Solicitaram travesseiros extras."
}
```

### 10.2. `POST /api/reservas` (Resposta `201 Created`)

```json
{
  "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "nome_completo": "Mariana Costa Mendes",
  "cpf": "345.678.901-22",
  "whatsapp": "(35) 99812-3344",
  "endereco": "Rua das Hortênsias, 420, Bairro Jardim, São Paulo - SP",
  "numero_chale": "Chalé 02 - Manacá",
  "quantidade_pessoas": 2,
  "data_checkin": "2026-11-10",
  "data_checkout": "2026-11-14",
  "valor_total_hospedagem": 2400.0,
  "valor_total_pago": 1200.0,
  "valor_total_receber": 1200.0,
  "descricao": "Lua de mel. Solicitaram travesseiros extras.",
  "status": "confirmada",
  "criado_por": "11111111-2222-3333-4444-555555555555",
  "created_at": "2026-10-02T12:00:00Z",
  "updated_at": "2026-10-02T12:00:00Z"
}
```

### 10.3. Exemplo de Erro de Validação (`422 Unprocessable Entity`)

```json
{
  "erro": "erro_validacao",
  "mensagem": "Existem campos inválidos nos dados enviados.",
  "campos": {
    "data_checkout": "A data de check-out deve ser posterior à data de check-in.",
    "valor_total_pago": "O valor pago não pode ser maior que o valor total da hospedagem."
  }
}
```

---

## 11. Autenticação e Autorização

1. O funcionário realiza login no React usando `supabase.auth.signInWithPassword({ email, password })`.
2. O Supabase Auth devolve um `session.access_token` (JWT assinado).
3. O frontend inclui o cabeçalho `Authorization: Bearer <access_token>` em todas as chamadas para a API Flask.
4. No Flask, o decorator `@require_auth`:
   - Verifica a presença e formato do cabeçalho `Authorization`.
   - Valida o token junto ao Supabase Auth (`supabase.auth.get_user(token)`).
   - Consulta `public.profiles` pelo `user.id`.
   - Caso o perfil não exista ou esteja com `ativo = False`, retorna `403 Forbidden` com o código `"usuario_inativo"`.
   - Injeta o usuário autenticado em `g.current_user` para uso nas rotas e serviços (ex.: preencher `criado_por`).

---

## 12. Variáveis de Ambiente

### Backend (`backend/.env.example`)
- `FLASK_ENV`: Ambiente de execução (`development` ou `production`).
- `PORT`: Porta HTTP do servidor Flask (padrão `5000`).
- `CORS_ORIGINS`: Origens permitidas no CORS (ex.: `http://localhost:3000,http://localhost:5173`).
- `SUPABASE_URL`: URL do projeto no Supabase.
- `SUPABASE_ANON_KEY`: Chave pública anônima do Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: Chave secreta de administração (uso exclusivo no backend Flask).

### Frontend (`frontend/.env.example`)
- `VITE_SUPABASE_URL`: URL do projeto no Supabase.
- `VITE_SUPABASE_ANON_KEY`: Chave pública anônima do Supabase.
- `VITE_API_BASE_URL`: URL da API Flask (ex.: `http://localhost:5000/api`).

---

## 13. Tratamento de Erros

Todas as respostas de erro da API Flask seguem rigorosamente o contrato JSON:

```json
{
  "erro": "codigo_do_erro",
  "mensagem": "Mensagem compreensível para o usuário final",
  "campos": {}
}
```

Principais códigos de erro padronizados:
- `requisicao_invalida` (`400`): JSON malformado ou UUID inválido na URL.
- `nao_autenticado` (`401`): Token Bearer ausente, expirado ou inválido.
- `usuario_inativo` (`403`): Funcionário sem perfil ativo na tabela `profiles`.
- `nao_encontrado` (`404`): Reserva ou recurso não localizado.
- `conflito_estado` (`409`): Tentativa de cancelar ou alterar reserva já cancelada.
- `erro_validacao` (`422`): Violação de regras de negócio ou campos obrigatórios.
- `erro_interno` (`500`): Falha inesperada tratada com segurança sem expor stacktraces ou segredos.

---

## 14. Medidas de Segurança

- **Isolamento da `SUPABASE_SERVICE_ROLE_KEY`**: Presente apenas no `.env` do backend Flask.
- **Row Level Security (RLS) Forçado**: `FORCE ROW LEVEL SECURITY` e `REVOKE ALL ON public.reservas FROM anon` garantem que a tabela `reservas` seja inacessível diretamente pelo navegador.
- **Higiene de Logs**: O middleware e os handlers de exceção nunca registram o conteúdo do header `Authorization`, tokens JWT, senhas ou chaves de serviço.
- **Dupla Validação**: Todas as validações feitas com Zod no frontend são integralmente repetidas no backend Python antes de qualquer operação no banco.
- **Imutabilidade Contábil**: O campo `valor_total_receber` é ignorado caso enviado no payload e calculado exclusivamente pelo banco/serviço.

---

## 15. Como Executar Backend e Frontend

### Backend (Flask)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # No Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # Preencher com as credenciais do projeto Supabase
python run.py
```

### Frontend (React + Vite)
```bash
# Na raiz ou dentro da pasta frontend/
npm install
cp .env.example .env       # Preencher VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY e VITE_API_BASE_URL
npm run dev
```

---

## 16. Como Criar o Primeiro Usuário no Supabase

1. Acesse o painel do seu projeto no **Supabase Dashboard**.
2. Vá em **SQL Editor**, cole o conteúdo de `supabase/migrations/001_initial_schema.sql` e clique em **Run**.
3. Vá em **Authentication → Users → Add User → Create New User**:
   - Informe o e-mail (ex.: `recepcao@pousadapinhoverde.com.br`) e uma senha forte.
   - Marque a opção **Auto Confirm User** e crie o usuário.
   - Copie o **User UID** gerado (ex.: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`).
4. Volte ao **SQL Editor** e crie o perfil ativo desse funcionário na tabela `public.profiles`:

```sql
INSERT INTO public.profiles (id, nome_completo, perfil, ativo)
VALUES (
    'COLE-AQUI-O-UUID-DO-USUARIO',
    'Ana Clara Ribeiro (Recepção)',
    'admin',
    TRUE
);
```

---

## 17. Como Testar a API

### Executar a suíte automatizada com Pytest
```bash
cd backend
pytest -v
```

### Testar manualmente via cURL
```bash
# 1. Healthcheck
curl -i http://localhost:5000/api/health

# 2. Listar reservas (substitua SEU_TOKEN_JWT)
curl -i -H "Authorization: Bearer SEU_TOKEN_JWT" http://localhost:5000/api/reservas
```

---

## 18. Melhorias Futuras

1. **Verificação automática de conflito de datas por chalé (Overbooking)**: Impedir duas reservas `confirmada` para o mesmo `numero_chale` com interseção entre `data_checkin` e `data_checkout` (usando constraint `EXCLUDE USING gist` com `daterange` no PostgreSQL).
2. **Histórico de pagamentos parciais**: Criar tabela `pagamentos_reserva` para registrar cada parcela paga (sinal de 50% via PIX, restante no cartão no check-in).
3. **Auditoria detalhada (Audit Log)**: Registrar quem alterou ou cancelou cada reserva e o motivo do cancelamento.
4. **Envio direto pelo WhatsApp**: Botão para compartilhar o link ou resumo do voucher formatado diretamente para o número de WhatsApp do hóspede.

---

## 19. Decisões Pendentes para Continuar no VS Code com o Claude

Ao abrir este projeto no VS Code com o Claude, alinhe os seguintes pontos de evolução com a gestão da Pousada Pinho Verde:

1. **Catálogo Fixo vs. Livre de Chalés**: Definir se `numero_chale` continuará sendo texto livre/seleção simples ou se haverá uma tabela `chales` com capacidade máxima de hóspedes e tarifa padrão por diária.
2. **Bloqueio de Overbooking no Banco**: Confirmar se a pousada deseja bloquear no banco de dados reservas simultâneas para o mesmo chalé no mesmo período ou permitir encaixes manuais pela gerência.
3. **Permissões Diferenciadas (`admin` vs `recepcao`)**: Definir se o perfil `recepcao` pode cancelar reservas a qualquer momento ou se o cancelamento próximo ao check-in exige perfil `admin`.
4. **Logotipo Oficial no Voucher**: Substituir o brasão vetorial da Pousada Pinho Verde no componente de Voucher pelo arquivo PNG/SVG oficial da marca caso exista.
