"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
import os
from flask import Flask, request, jsonify, url_for, send_from_directory
from flask_migrate import Migrate
from flask_swagger import swagger
from flask_jwt_extended import JWTManager
from datetime import timedelta
from sqlalchemy import inspect as sa_inspect
from api.utils import APIException, generate_sitemap
from api.models import db
from api.routes import api
from api.admin import setup_admin
from api.commands import setup_commands
from api.seed import ensure_seed, upgrade_to_wheel

# from models import Person

ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(
    os.path.realpath(__file__)), '../dist/')
app = Flask(__name__)
app.url_map.strict_slashes = False

# database condiguration
db_url = os.getenv("DATABASE_URL")
if db_url is not None:
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url.replace(
        "postgres://", "postgresql://")
else:
    # Sin DATABASE_URL se usa un archivo SQLite local (cumbre27.db en la raíz del proyecto)
    sqlite_path = os.path.abspath(os.path.join(os.path.dirname(os.path.realpath(__file__)), '..', 'cumbre27.db'))
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///" + sqlite_path.replace("\\", "/")

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
MIGRATE = Migrate(app, db, compare_type=True, render_as_batch=True)
db.init_app(app)

# JWT: sesiones de 30 días
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY") or os.getenv("FLASK_APP_KEY", "cambia-esta-clave")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=30)
jwt = JWTManager(app)


@jwt.unauthorized_loader
@jwt.invalid_token_loader
def jwt_missing(reason):
    return jsonify({"message": "Inicia sesión para continuar"}), 401


@jwt.expired_token_loader
def jwt_expired(header, payload):
    return jsonify({"message": "Tu sesión venció, entra de nuevo"}), 401

# El panel técnico de tablas solo existe en desarrollo; en producción quedaría abierto a cualquiera
if ENV == "development":
    setup_admin(app)

# add the admin
setup_commands(app)

# Add all endpoints form the API with a "api" prefix
app.register_blueprint(api, url_prefix='/api')

# Si las tablas ya existen (después de `pipenv run upgrade`) y no hay usuarios, se crea 1ALE
with app.app_context():
    try:
        tables = sa_inspect(db.engine)
        if tables.has_table("users") and tables.has_table("app_settings"):
            if ensure_seed():
                print(" * Level Up 2027: usuario 1ALE creado")
            elif upgrade_to_wheel():
                print(" * Level Up 2027: el plan de 1ALE quedó en blanco, con la Rueda de la Vida")
    except Exception as error:  # la base aún no está lista
        db.session.rollback()
        print(" * Level Up 2027: semilla pendiente ->", error)

# Handle/serialize errors like a JSON object


@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code

# generate sitemap with all your endpoints


@app.route('/')
def sitemap():
    if ENV == "development":
        return generate_sitemap(app)
    return send_from_directory(static_file_dir, 'index.html')

# any other endpoint will try to serve it like a static file
@app.route('/<path:path>', methods=['GET'])
def serve_any_other_file(path):
    if not os.path.isfile(os.path.join(static_file_dir, path)):
        path = 'index.html'
    response = send_from_directory(static_file_dir, path)
    response.cache_control.max_age = 0  # avoid cache memory
    return response


# this only runs if `$ python src/main.py` is executed
if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    app.run(host='0.0.0.0', port=PORT, debug=True)
