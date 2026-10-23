# Sistema de Vouchers e Gestão de Reservas da Pousada Pinho Verde

Sistema web full stack desenvolvido para a recepção e administração da **Pousada Pinho Verde**, permitindo autenticação de colaboradores, cadastro e consulta de reservas de chalés, cálculo automático de saldo a receber, cancelamento com preservação de histórico e emissão de vouchers prontos para impressão ou salvamento em PDF.

---

## 1. Objetivo do Projeto
--
Centralizar a operação diária de reservas da Pousada Pinho Verde garantindo:
- Login próprio de funcionários (senha em hash + token JWT) com verificação de perfil ativo (`admin` ou `recepcao`).
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

### Backend
- **Python 3.11+** com **Flask** (API REST)
- **Flask-CORS** (controle de origens permitidas)
- **python-dotenv** (gerenciamento de variáveis de ambiente)
- **psycopg** (driver PostgreSQL, com `DATABASE_URL` restrita ao servidor)
- **PyJWT** + **werkzeug.security** (tokens de login e hash de senha)
- **Pytest** (suíte de testes automatizados de saldo, datas, validações e autenticação)

### Banco de Dados e Autenticação
- **PostgreSQL no Neon** (plano gratuito, ligado à Vercel; coluna `GENERATED ALWAYS` para o saldo)
- **Login pela própria API Flask** (JWT Bearer Token)

---

