# Sistema de Vouchers e Gestão de Reservas da Pousada Pinho Verde

Sistema web full stack desenvolvido para a recepção e administração da **Pousada Pinho Verde**, permitindo autenticação de colaboradores, cadastro e consulta de reservas de chalés, cálculo automático de saldo a receber, cancelamento com preservação de histórico e emissão de vouchers prontos para impressão ou salvamento em PDF.

---

## 1. Objetivo do Projeto

Centralizar a operação diária de reservas da Pousada Pinho Verde garantindo:
- Autenticação segura de funcionários via **Supabase Auth** com verificação de perfil ativo (`admin` ou `recepcao`).
- Cadastro e atualização de reservas com máscaras de CPF, WhatsApp e moeda (`R$`).
- Cálculo automático e imutável do saldo a receber (`valor_total_receber = valor_total_hospedagem - valor_total_pago`).
- Emissão de voucher oficial contendo todas as políticas de hospedagem, pagamento e cancelamento da pousada.
- Preservação integral do histórico (cancelamentos alteram o status para `cancelada` sem excluir registros do banco).

---

## 2. Tecnologias Utilizadas

### Frontend
- **React 19** com **Vite** e **TypeScript**
- **React Router DOM** (roteamento protegido)
- **React Hook Form** + **Zod** (validação de formulários e regras de negócio)
- **Tailwind CSS** (estilização responsiva e folha de impressão `@media print`)
- **@supabase/supabase-js** (utilizado exclusivamente para autenticação e gestão de sessão)

### Backend
- **Python 3.11+** com **Flask** (API REST)
- **Flask-CORS** (controle de origens permitidas)
- **python-dotenv** (gerenciamento de variáveis de ambiente)
- **supabase** (SDK Python oficial com `SUPABASE_SERVICE_ROLE_KEY` restrita ao servidor)
- **Pytest** (suíte de testes automatizados de saldo, datas, validações e autenticação)

### Banco de Dados e Autenticação
- **Supabase PostgreSQL** (com Row Level Security habilitado e coluna `GENERATED ALWAYS` para o saldo)
- **Supabase Auth** (JWT Bearer Token)

---

## 3. Estrutura das Pastas

```text
/
├── src/                                   # Código-fonte do Frontend React + TypeScript (ativo no Vite raiz)
│   ├── components/
│   │   ├── ConfirmCancelModal.tsx         # Modal de confirmação de cancelamento
│   │   ├── Layout.tsx                     # Sidebar, cabeçalho e estrutura de página
│   │   └── ProtectedRoute.tsx             # Proteção de rotas para usuários autenticados e ativos
│   ├── hooks/
│   │   └── useAuth.tsx                    # Contexto de sessão Supabase Auth + validação de profile
│   ├── pages/
│   │   ├── AccessDeniedOrNotFoundPage.tsx # Telas 403 (Acesso Negado) e 404 (Não Encontrado)
│   │   ├── DashboardPage.tsx              # Resumo financeiro e reservas recentes
│   │   ├── LoginPage.tsx                  # Tela de login com validação Zod
│   │   ├── ReservaDetailPage.tsx          # Detalhes completos da reserva
│   │   ├── ReservaFormPage.tsx            # Cadastro e edição com máscaras e saldo em tempo real
│   │   ├── ReservasListPage.tsx           # Lista de reservas com busca e filtro por status
│   │   └── VoucherPage.tsx                # Visualização e impressão/PDF do voucher oficial
│   ├── schemas/
│   │   └── reservaSchema.ts               # Schemas Zod para login e reserva
│   ├── services/
│   │   ├── api.ts                         # Cliente HTTP para a API Flask com Bearer Token
│   │   └── supabaseClient.ts              # Inicialização do Supabase Auth no cliente
│   ├── types/
│   │   └── reserva.ts                     # Interfaces TypeScript (Reserva, Profile, VoucherData)
│   ├── utils/
│   │   └── formatters.ts                  # Máscaras de CPF, WhatsApp, BRL e cálculo de diárias
│   ├── App.tsx                            # Definição das rotas da aplicação
│   ├── index.css                          # Estilos globais e regras @media print
│   └── main.tsx                           # Ponto de montagem React
├── frontend/                              # Espelho de configuração para estrutura monorepo no VS Code
│   ├── .env.example
│   └── package.json
├── backend/                               # API REST Python Flask
│   ├── app/
│   │   ├── middleware/
│   │   │   └── auth_middleware.py         # Decorator @require_auth
│   │   ├── repositories/
│   │   │   ├── profile_repository.py      # Acesso à tabela public.profiles
│   │   │   └── reserva_repository.py      # Acesso à tabela public.reservas
│   │   ├── routes/
│   │   │   ├── auth_routes.py             # GET /api/me
│   │   │   ├── health_routes.py           # GET /api/health
│   │   │   └── reserva_routes.py          # CRUD /api/reservas, cancelar e voucher
│   │   ├── schemas/
│   │   │   └── reserva_schema.py          # Validações de payload no servidor
│   │   ├── services/
│   │   │   ├── reserva_service.py         # Regras de negócio de reservas
│   │   │   └── voucher_service.py         # Montagem do voucher e políticas da pousada
│   │   ├── utils/
│   │   │   ├── errors.py                  # Exceção APIError e respostas JSON padronizadas
│   │   │   └── validators.py              # Validador de CPF, datas, moeda e cálculo de saldo
│   │   ├── __init__.py                    # Application Factory (create_app)
│   │   ├── config.py                      # Variáveis de ambiente do Flask
│   │   └── extensions.py                  # Clientes Supabase Admin e Auth
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_autenticacao.py
│   │   ├── test_calculo_saldo.py
│   │   └── test_validacoes_reserva.py
│   ├── .env.example
│   ├── requirements.txt
│   └── run.py
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql         # Migration SQL completa (tabelas, CHECKs, trigger, RLS)
├── docs/
│   └── ESPECIFICACOES_BANCO_BACKEND.md    # Documentação arquitetural e dicionário de dados
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 4. Requisitos para Execução

- **Node.js** 20+ e **npm**
- **Python** 3.11+ e **pip**
- Conta e projeto criado no **Supabase** (para produção/integração real)

---

## 5. Configuração do Supabase

1. Crie um novo projeto no [Supabase Dashboard](https://supabase.com/dashboard).
2. No menu lateral, acesse **SQL Editor**, copie todo o conteúdo de `supabase/migrations/001_initial_schema.sql` e execute (**Run**).
3. Acesse **Authentication → Users → Add User → Create New User** e crie o primeiro colaborador (marque *Auto Confirm User*).
4. Copie o `UUID` do usuário criado e registre seu perfil ativo no **SQL Editor**:

```sql
INSERT INTO public.profiles (id, nome_completo, perfil, ativo)
VALUES (
    'UUID-DO-USUARIO-AQUI',
    'Helena Martins (Recepção)',
    'admin',
    TRUE
);
```

---

## 6. Variáveis de Ambiente

### Backend (`backend/.env`)
Copie `backend/.env.example` para `backend/.env` e preencha:
```ini
FLASK_ENV="development"
PORT="5000"
CORS_ORIGINS="http://localhost:3000,http://localhost:5173"
SUPABASE_URL="https://seu-projeto.supabase.co"
SUPABASE_ANON_KEY="sua-chave-publica-anon-key"
SUPABASE_SERVICE_ROLE_KEY="sua-chave-secreta-service-role-key"
```

### Frontend (`.env`)
Copie `.env.example` para `.env` e preencha:
```ini
VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
VITE_SUPABASE_ANON_KEY="sua-chave-publica-anon-key"
VITE_API_BASE_URL="http://localhost:5000/api"
```

> **Regra de Segurança:** Jamais coloque a `SUPABASE_SERVICE_ROLE_KEY` no `.env` do frontend.

---

## 7. Instalação e Comandos para Executar

### Executar o Backend Flask
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python run.py
```
O servidor Flask ficará disponível em `http://localhost:5000`.

### Executar o Frontend React (Vite)
```bash
npm install
npm run dev
```
A aplicação web ficará disponível em `http://localhost:3000`.

---

## 8. Comandos de Teste

Para executar a suíte de testes automatizados do backend com **Pytest**:
```bash
cd backend
pytest -v
```

Para validar a tipagem e compilação do frontend TypeScript:
```bash
npm run lint
npm run build
```

---

## 9. Usuários e Dados Fictícios para Desenvolvimento

Quando executado sem variáveis externas do Supabase configuradas (modo de demonstração local/preview), o sistema disponibiliza contas fictícias de teste na tela de login e 5 reservas fictícias pré-carregadas:

- **Recepção Ativa**: `recepcao@pousadapinhoverde.com.br` / senha: `senha123`
- **Administração Ativa**: `admin@pousadapinhoverde.com.br` / senha: `senha123`
- **Colaborador Inativo (Teste de bloqueio 403)**: `inativo@pousadapinhoverde.com.br` / senha: `senha123`
# automacao-pousada-pinho-verde
