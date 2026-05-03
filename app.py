

from flask import Flask, send_from_directory
from flask_login import LoginManager
from flask_cors import CORS

from config import Config
from models import db, Admin
from routes import api

app = Flask(__name__)
app.config.from_object(Config)

# CORS
CORS(app, supports_credentials=True)

# DB
db.init_app(app)

# Login Manager
login_manager = LoginManager()
login_manager.init_app(app)


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(Admin, int(user_id))


# Register API
app.register_blueprint(api, url_prefix="/api")


# Frontend Home
@app.route("/")
def home():
    return send_from_directory(
        "Test1/sky",
        "admin.html"
    )


# Static files
@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(
        "Test1/sky",
        path
    )


if __name__ == "__main__":
    with app.app_context():
        db.create_all()

    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )