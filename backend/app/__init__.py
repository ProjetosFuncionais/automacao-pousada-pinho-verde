from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.routes.auth_routes import auth_bp
from app.routes.health_routes import health_bp
from app.routes.reserva_routes import reserva_bp
from app.utils.errors import register_error_handlers


def create_app(testing: bool = False) -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    if testing:
        app.config["TESTING"] = True
        Config.TESTING = True

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": Config.CORS_ORIGINS,
                "methods": ["GET", "POST", "PUT", "PATCH", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
            }
        },
    )

    register_error_handlers(app)

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(reserva_bp)

    return app
