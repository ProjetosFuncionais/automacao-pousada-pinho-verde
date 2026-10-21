# Documentação do Projeto — Sistema de Reservas e Vouchers da Pousada Pinho Verde

Documento de referência do projeto: o que é o sistema, o que foi construído, como ele está publicado e como executar cada processo do dia a dia (uso, manutenção e publicação).

Situação descrita em 21/10/2026 (troca do Supabase pelo Neon). Para o detalhe técnico de tabelas e endpoints, ver também [ESPECIFICACOES_BANCO_BACKEND.md](ESPECIFICACOES_BANCO_BACKEND.md).

---

## 1. O que é o sistema

Sistema web interno para a recepção e a administração da Pousada Pinho Verde. Ele substitui o controle manual de reservas e permite:

- entrar com e-mail e senha (somente colaboradores com perfil ativo);
- cadastrar, consultar, editar e cancelar reservas de chalés;
- calcular automaticamente o saldo a receber de cada reserva;
- emitir o voucher da hospedagem, pronto para imprimir ou salvar em PDF;
- acompanhar um painel com os totais das reservas confirmadas.

---

## 2. Situação atual

| Item | Situação |
| :--- | :--- |
| Site publicado | https://automacao-pousada-pinho-verde.vercel.app (tela e API no mesmo endereço) |
| Hospedagem | Vercel — frontend (Vite) e API (Flask) como dois serviços do mesmo projeto |
| Banco | PostgreSQL no Neon (plano gratuito), ligado ao projeto da Vercel |
| Login | Próprio, feito pela API Flask (senha em hash + token JWT) |
| Código | GitHub: `ProjetosFuncionais/automacao-pousada-pinho-verde`, branch `main` |
| Usuários cadastrados | Nenhum no banco novo até rodar `manage.py criar-usuario` (seção 8.4) |
| Reservas gravadas | Nenhuma no banco novo (os dados antigos ficaram no Supabase pausado) |
| Testes do backend | 23 testes, todos passando |
| Checagem de tipos do frontend | passando (`npm run lint`) |

Se a `DATABASE_URL` do `backend/.env` for a mesma do site publicado, o que é gravado rodando localmente vai para o mesmo banco do site no ar. O Neon permite criar um *branch* (cópia) do banco para testes, se for preciso.

A senha do admin não fica registrada em nenhum arquivo do projeto. Ela pode ser redefinida a qualquer momento (seção 8.5).

---

## 3. O que foi feito

A construção (3.1 a 3.3) é de 02/10/2026. A troca de banco (3.4) é de 21/10/2026.

### 3.1. Construção do sistema

1. **Primeiro commit** — README do projeto.
2. **Sistema completo** (54 arquivos) — frontend React, API Flask, migration do banco, testes e documentação técnica. Há sinais de que a base foi gerada no Google AI Studio (`metadata.json`, comentários no `vite.config.ts`, nome `react-example` no `package.json`) e depois trazida para o VS Code.
3. **Preparação para a Vercel** — criação do `vercel.json` com os dois serviços (frontend e API) e troca do endereço padrão da API no frontend de `http://localhost:5000/api` para `/api`, para que o site publicado chame a API no próprio domínio.
4. **Ajuste na impressão do voucher** — margem de página zerada para o navegador não imprimir URL, data e título; rodapé de autenticidade oculto na impressão.
5. **Limpeza da tela de login** — os campos vinham preenchidos com `recepcao@pousadapinhoverde.com.br` / `senha123`; agora abrem vazios. A mudança já está no site publicado.

### 3.2. Montagem do ambiente local (Mac Intel)

- O Python do sistema (3.9.6) não roda o backend. Foi instalado o `uv` e criado um ambiente Python 3.12 em `backend/.venv`.
- A API local roda na porta **5001**, porque a 5000 é ocupada pelo AirPlay Receiver do macOS. Os arquivos `.env` da raiz e de `backend/` apontam para ela.

### 3.3. Banco de dados e acesso (Supabase, até 21/10/2026)

- O sistema usava o Supabase para o banco e para o login. Havia 1 usuário admin e 1 reserva gravados.
- O projeto Supabase foi pausado por inatividade (plano gratuito) e o acesso à conta foi perdido. Esses dados ficaram lá.

### 3.4. Troca do Supabase pelo Neon (21/10/2026)

- Banco passou a ser PostgreSQL no **Neon**, com a mesma estrutura de tabelas e regras. Script em `backend/db/schema.sql`.
- O login deixou de usar o Supabase Auth: agora a própria API confere a senha (guardada em hash na tabela `profiles`) e devolve um token JWT.
- Usuários passam a ser criados e mantidos pelo comando `backend/manage.py` (seção 8.4).
- Foram removidos: a pasta `supabase/`, o `.mcp.json`, a biblioteca `@supabase/supabase-js` do frontend, a biblioteca `supabase` do backend, o `bun.lock` (não era usado; a Vercel instala com npm) e as variáveis do Supabase dos arquivos `.env`.
- O modo demonstração agora só liga com `VITE_DEMO_MODE=true`.
- Testado localmente contra um PostgreSQL real: criação das tabelas, login, cadastro, busca, edição, voucher, cancelamento e bloqueio de usuário inativo, inclusive pelo navegador.

---

## 4. Como o sistema é organizado

```text
[ Navegador: React ]
      │
      ├── login (e-mail e senha) ───────► [ API Flask ] → devolve um token
      │
      └── reservas e voucher (com token) ► [ API Flask ]
                                               │ valida o token
                                               │ confere se o perfil está ativo
                                               │ aplica as regras de negócio
                                               ▼
                                        [ PostgreSQL no Neon ]
```

- O navegador fala **só com a API Flask**, inclusive para o login. Ele nunca lê nem grava direto no banco.
- A API Flask é a única parte que tem o endereço e a senha do banco (`DATABASE_URL`).
- Na Vercel, qualquer endereço começando com `/api/` vai para o Flask; o restante vai para o site React.

### Pastas principais

| Pasta / arquivo | Conteúdo |
| :--- | :--- |
| `src/` | Frontend React + TypeScript (telas, formulários, chamadas à API) |
| `backend/app/` | API Flask: rotas, regras de negócio, acesso ao banco, validações |
| `backend/tests/` | Testes automatizados (Pytest) |
| `backend/db/schema.sql` | Script SQL que cria as tabelas e regras |
| `backend/manage.py` | Comandos para criar tabelas e gerenciar usuários |
| `docs/` | Documentação |
| `vercel.json` | Configuração da publicação |
| `frontend/` | Apenas cópias de configuração; o frontend ativo é o da raiz (`src/`) |

### Tecnologias

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS, React Router, React Hook Form + Zod.
- **Backend:** Python 3.12, Flask 3, Flask-CORS, psycopg (PostgreSQL), PyJWT (tokens de login), Pytest.
- **Banco:** PostgreSQL no Neon.

---

## 5. Telas e processos de uso

| Tela | Endereço | Para que serve |
| :--- | :--- | :--- |
| Login | `/login` | Entrada com e-mail e senha |
| Painel | `/dashboard` | Totais das reservas confirmadas e as 5 reservas mais recentes |
| Reservas | `/reservas` | Lista com busca e filtro por situação |
| Nova reserva / Edição | `/reservas/nova`, `/reservas/:id/editar` | Formulário da reserva |
| Detalhes | `/reservas/:id` | Dados completos, com atalhos para voucher, edição e cancelamento |
| Voucher | `/reservas/:id/voucher` | Voucher para imprimir ou salvar em PDF |
| Acesso negado / Não encontrado | `/acesso-negado` e endereços inexistentes | Avisos de erro |

### 5.1. Entrar no sistema

1. O colaborador informa e-mail e senha.
2. A API confere a senha e devolve um token de sessão, válido por 12 horas.
3. Em toda operação, a API confere o token e se o perfil continua ativo.
4. Se o perfil estiver inativo, o acesso é negado mesmo com a senha correta. Quando o token vence, o sistema volta para a tela de login.

### 5.2. Cadastrar uma reserva

1. Em **Nova reserva**, preencher: nome do hóspede, CPF, WhatsApp, endereço, chalé, quantidade de pessoas, check-in, check-out, valor total da hospedagem, valor já pago e observações (opcional).
2. CPF, WhatsApp e valores em reais recebem máscara automática. O número de diárias e o saldo a receber aparecem calculados enquanto se digita.
3. O chalé é escolhido de uma lista de 8 chalés definida no código (`LISTA_CHALES_SUGERIDOS`, em `src/services/api.ts`).
4. Ao salvar, a API valida tudo de novo e grava a reserva com situação `confirmada`, registrando qual colaborador a criou.

### 5.3. Consultar e editar

- A busca da lista procura por nome, CPF, WhatsApp, chalé ou código da reserva. O filtro separa confirmadas e canceladas.
- Reservas confirmadas podem ser editadas. Reservas canceladas não podem mais ser alteradas.

### 5.4. Cancelar uma reserva

- O cancelamento pede confirmação e apenas muda a situação para `cancelada`. Nada é apagado: a reserva continua na lista e no histórico.
- Uma reserva já cancelada não pode ser cancelada de novo nem editada.

### 5.5. Emitir o voucher

1. Abrir o voucher a partir da lista ou dos detalhes da reserva.
2. O voucher traz o código (`PPV-` + início do identificador da reserva), dados do hóspede, chalé, período, diárias, valores e as políticas da pousada.
3. O botão de impressão abre a impressão do navegador, onde também se escolhe "Salvar como PDF".

Políticas impressas no voucher: reembolso integral até 14 dias antes do check-in; sem reembolso fora do prazo ou em não comparecimento; check-in às 15h e check-out às 12h; possível taxa por permanência após o horário; proibido animais e fumar; 50% na reserva e o restante no check-in (PIX, dinheiro ou cartão em até 2 vezes).

---

## 6. Regras de negócio

1. Quantidade de pessoas maior que zero.
2. Check-out posterior ao check-in (mínimo de 1 diária).
3. Valores não negativos, e valor pago nunca maior que o valor total.
4. Saldo a receber = valor total − valor pago. Ninguém digita esse valor: o banco calcula sozinho e a API ignora qualquer saldo enviado.
5. CPF validado pelos dígitos verificadores; WhatsApp com DDD (10 ou 11 dígitos).
6. Cancelamento preserva o histórico; reserva cancelada fica bloqueada para edição.
7. Voucher só existe para reserva já gravada.

Essas regras são conferidas em três lugares: no formulário (Zod), na API (Python) e no banco (restrições `CHECK`).

---

## 7. API e banco de dados (resumo)

### Endpoints

| Método | Rota | Função |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Verifica se a API está no ar (pública) |
| `POST` | `/api/auth/login` | Login com e-mail e senha; devolve o token (pública) |
| `GET` | `/api/me` | Dados do colaborador logado |
| `GET` | `/api/reservas` | Lista reservas (`?busca=` e `?status=`) |
| `GET` | `/api/reservas/<id>` | Detalhes de uma reserva |
| `POST` | `/api/reservas` | Cria reserva |
| `PUT` | `/api/reservas/<id>` | Atualiza reserva confirmada |
| `PATCH` | `/api/reservas/<id>/cancelar` | Cancela reserva |
| `GET` | `/api/reservas/<id>/voucher` | Dados do voucher |

Todas, exceto `/api/health` e `/api/auth/login`, exigem o token de login. Erros seguem sempre o formato `{"erro": ..., "mensagem": ..., "campos": {}}`.

### Tabelas

- **`profiles`** — um registro por colaborador: e-mail, senha em hash, nome, perfil (`admin` ou `recepcao`) e se está ativo.
- **`reservas`** — dados do hóspede, chalé, datas, valores, saldo calculado, situação, quem criou e datas de criação/atualização.

### Segurança

- O endereço e a senha do banco (`DATABASE_URL`) e o segredo dos tokens (`JWT_SECRET`) existem apenas no backend. O frontend não tem nenhuma credencial.
- Senhas são guardadas só como hash (scrypt). Ninguém consegue ler a senha de um colaborador, só redefinir.
- No login, e-mail inexistente e senha errada têm a mesma resposta, para não revelar quem está cadastrado.
- Depois de 5 senhas erradas para o mesmo e-mail (ou 30 do mesmo IP) em 15 minutos, o login fica bloqueado por 15 minutos (tabela `tentativas_login`).
- As respostas da API não ficam em cache e trazem cabeçalhos de proteção (`no-store`, `nosniff`, `DENY`).
- Os arquivos `.env` não vão para o GitHub (estão no `.gitignore`).
- Tokens, senhas e chaves não são escritos nos registros de erro da API.

---

## 8. Processos de manutenção

### 8.1. Rodar na máquina local

```bash
# API (porta 5001)
cd backend
.venv/bin/python run.py

# Site (porta 3000), em outro terminal, na raiz do projeto
npm install
npm run dev
```

Atenção: se o `backend/.env` usar a mesma `DATABASE_URL` do site, rodar localmente grava no banco do site publicado.

### 8.2. Testar antes de publicar

```bash
cd backend && .venv/bin/python -m pytest -v   # 23 testes da API
npm run lint                                  # checagem de tipos do frontend
npm run build                                 # confirma que o site compila
```

Os testes cobrem: cálculo de saldo, bloqueio de valores inválidos, datas, quantidade de pessoas, CPF, bloqueio sem token, bloqueio de perfil inativo, login (senha certa, errada, usuário inexistente ou inativo) e tokens vencidos ou falsos.

### 8.3. Publicar uma alteração

1. Fazer a alteração e rodar os testes (8.2).
2. `git add`, `git commit` e `git push` na branch `main`.
3. A Vercel publica a nova versão. A alteração da tela de login entrou no ar poucos minutos após o push, o que indica publicação automática a cada push na `main`.
4. Conferir abrindo o site e acessando `/api/health`.

As variáveis de ambiente do site publicado (`DATABASE_URL` e `JWT_SECRET`) ficam no painel da Vercel, não no repositório. A `DATABASE_URL` é criada automaticamente quando o banco Neon é ligado ao projeto pela aba **Storage**.

### 8.4. Cadastrar um novo colaborador

Não existe tela de cadastro de usuários; é feito por comando, na pasta `backend`, com a `DATABASE_URL` do Neon no `backend/.env`:

```bash
.venv/bin/python manage.py criar-usuario email@exemplo.com "Nome do Colaborador" --perfil recepcao
```

O comando pede a senha duas vezes (mínimo 8 caracteres). Use `--perfil admin` para administradores. Para ver quem está cadastrado: `manage.py listar-usuarios`.

### 8.5. Redefinir a senha de um colaborador

```bash
.venv/bin/python manage.py redefinir-senha email@exemplo.com
```

A senha anterior deixa de valer na hora. Não é possível consultar a senha atual: o banco guarda apenas o hash.

### 8.6. Desligar um colaborador

```bash
.venv/bin/python manage.py desativar-usuario email@exemplo.com
```

O acesso é cortado na hora, mesmo que a pessoa esteja logada. Para liberar de novo: `ativar-usuario`. Não apagar o perfil: as reservas criadas por ele continuam vinculadas, e o banco impede a exclusão de quem já criou reservas.

### 8.7. Alterar a estrutura do banco

Alterar `backend/db/schema.sql` usando comandos que podem rodar mais de uma vez sem apagar dados (`CREATE ... IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) e rodar `manage.py init-db`. Também dá para executar SQL direto no **SQL Editor** do painel do Neon.

---

## 9. Modo de demonstração

Se o frontend for executado com `VITE_DEMO_MODE=true`, ele entra em modo de demonstração: aceita contas fictícias, mostra botões de preenchimento rápido na tela de login e usa 5 reservas fictícias guardadas no próprio navegador. Nada disso toca o banco real.

No site publicado e na máquina local essa variável não está definida, então esse modo fica desligado. As contas e a senha `senha123` citadas no README valem apenas para esse modo.

---

## 10. Pendências e limitações conhecidas

1. **Dados do Supabase não migrados** — o admin e a reserva antigos ficaram no Supabase pausado. Só voltam se o acesso à conta for recuperado.
2. **Perfis sem diferença na prática** — `admin` e `recepcao` têm exatamente as mesmas permissões; a API só verifica se o perfil está ativo.
3. **Sem bloqueio de reserva duplicada** — o sistema aceita duas reservas confirmadas para o mesmo chalé no mesmo período.
4. **Sem tela de gestão de usuários** — cadastro, senha e desligamento são feitos pelo `manage.py`.
5. **Lista de chalés fixa no código** — mudar nomes ou quantidade exige alterar o código e publicar.
6. **Banco único** — se o `.env` local usar o banco do site, testes locais gravam no banco de produção (dá para criar um branch de testes no Neon).
7. **Bloqueio de login por e-mail** — depois de 5 senhas erradas, o e-mail fica bloqueado por 15 minutos, inclusive para o dono da conta. É o preço da proteção contra quem tenta adivinhar senhas.
8. **Busca feita em memória** — a API carrega todas as reservas e filtra depois; funciona bem com pouco volume, mas deve ser revista se a base crescer.
9. **README desatualizado** — ainda cita a porta 5000 e não menciona a publicação na Vercel.
10. **Sobras da base original** — `package.json` com nome `react-example` e dependências não usadas pelo sistema (`@google/genai`, `express`, `motion`).

Melhorias já mapeadas na especificação técnica: histórico de pagamentos parciais, registro de quem alterou ou cancelou cada reserva, envio do voucher por WhatsApp e logotipo oficial no voucher.
