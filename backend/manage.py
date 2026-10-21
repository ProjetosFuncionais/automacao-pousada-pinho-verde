"""Comandos de administração do banco e dos usuários.

Uso (dentro da pasta backend, com DATABASE_URL no .env):
    python manage.py init-db
    python manage.py criar-usuario EMAIL "NOME COMPLETO" [--perfil admin|recepcao]
    python manage.py redefinir-senha EMAIL
    python manage.py desativar-usuario EMAIL
    python manage.py ativar-usuario EMAIL
    python manage.py listar-usuarios
"""
import argparse
import getpass
import sys
from pathlib import Path
from app.extensions import get_db
from app.repositories.profile_repository import ProfileRepository
from app.services.auth_service import AuthService

SCHEMA_PATH = Path(__file__).parent / "db" / "schema.sql"


def ler_senha() -> str:
    # Sem terminal (ex.: senha enviada por pipe), lê uma linha da entrada.
    if not sys.stdin.isatty():
        return sys.stdin.readline().rstrip("\n")
    senha = getpass.getpass("Senha (mínimo 8 caracteres): ")
    if senha != getpass.getpass("Repita a senha: "):
        sys.exit("As senhas não conferem.")
    return senha


def cmd_init_db(_args: argparse.Namespace) -> None:
    conexao = get_db()
    conexao.execute(SCHEMA_PATH.read_text(encoding="utf-8"))
    print("Tabelas criadas/atualizadas com sucesso.")


def cmd_criar_usuario(args: argparse.Namespace) -> None:
    if ProfileRepository.buscar_para_login(args.email):
        sys.exit(f"Já existe um usuário com o e-mail {args.email}.")
    try:
        senha_hash = AuthService.gerar_hash_senha(ler_senha())
    except ValueError as exc:
        sys.exit(str(exc))
    usuario = ProfileRepository.criar(args.email, args.nome, args.perfil, senha_hash)
    print(f"Usuário criado: {usuario['email']} ({usuario['perfil']}).")


def cmd_redefinir_senha(args: argparse.Namespace) -> None:
    try:
        senha_hash = AuthService.gerar_hash_senha(ler_senha())
    except ValueError as exc:
        sys.exit(str(exc))
    if not ProfileRepository.atualizar_senha(args.email, senha_hash):
        sys.exit(f"Nenhum usuário com o e-mail {args.email}.")
    print("Senha redefinida.")


def cmd_definir_ativo(ativo: bool):
    def executar(args: argparse.Namespace) -> None:
        if not ProfileRepository.definir_ativo(args.email, ativo):
            sys.exit(f"Nenhum usuário com o e-mail {args.email}.")
        print("Usuário ativado." if ativo else "Usuário desativado.")

    return executar


def cmd_listar_usuarios(_args: argparse.Namespace) -> None:
    usuarios = ProfileRepository.listar()
    if not usuarios:
        print("Nenhum usuário cadastrado.")
    for u in usuarios:
        situacao = "ativo" if u["ativo"] else "inativo"
        print(f"{u['email']:<40} {u['perfil']:<9} {situacao:<8} {u['nome_completo']}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Administração do sistema da Pousada Pinho Verde")
    sub = parser.add_subparsers(dest="comando", required=True)

    sub.add_parser("init-db", help="Cria ou atualiza as tabelas").set_defaults(func=cmd_init_db)

    p = sub.add_parser("criar-usuario", help="Cadastra um colaborador")
    p.add_argument("email")
    p.add_argument("nome")
    p.add_argument("--perfil", choices=["admin", "recepcao"], default="recepcao")
    p.set_defaults(func=cmd_criar_usuario)

    p = sub.add_parser("redefinir-senha", help="Troca a senha de um colaborador")
    p.add_argument("email")
    p.set_defaults(func=cmd_redefinir_senha)

    p = sub.add_parser("desativar-usuario", help="Bloqueia o acesso de um colaborador")
    p.add_argument("email")
    p.set_defaults(func=cmd_definir_ativo(False))

    p = sub.add_parser("ativar-usuario", help="Libera de novo o acesso de um colaborador")
    p.add_argument("email")
    p.set_defaults(func=cmd_definir_ativo(True))

    sub.add_parser("listar-usuarios", help="Mostra os colaboradores").set_defaults(func=cmd_listar_usuarios)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
