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

