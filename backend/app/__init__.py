from flask import Flask
from flask_cors import CORS
from .api.v1.routes import api_bp
from .api.v1.config_routes import config_bp
from .core.app_config import AppConfig

def create_app(config_class=AppConfig):
    """Application factory pattern"""
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Enable CORS
    CORS(app)

    app.register_blueprint(api_bp, url_prefix='/api/v1')
    app.register_blueprint(config_bp, url_prefix='/api/v1/config')
    return app 