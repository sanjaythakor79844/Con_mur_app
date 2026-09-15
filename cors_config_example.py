# ========================================
# CORS Configuration for Flask Backend
# ========================================
# Add this to: D:\Vinay\aaha-kiosk-main\CHWapp-main\app\__init__.py

from flask import Flask
from flask_cors import CORS  # ← ADD THIS IMPORT

def create_app():
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object('app.config.Config')
    
    # ✅ ADD THIS CORS CONFIGURATION BLOCK
    # -------------------------------------
    CORS(app, resources={
        r"/api/*": {
            "origins": [
                "http://localhost:8080",
                "http://127.0.0.1:8080",
                "http://10.205.201.225:8080"
            ],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": [
                "Content-Type", 
                "Authorization", 
                "X-Patient-ID"
            ],
            "expose_headers": ["Content-Type"],
            "supports_credentials": True,
            "max_age": 3600
        }
    })
    # -------------------------------------
    
    # Initialize extensions
    from app.extensions import db
    db.init_app(app)
    
    # Register blueprints
    from app.routes.main import main_bp
    app.register_blueprint(main_bp)
    
    # ... rest of your code ...
    
    return app


# ========================================
# ALTERNATIVE: Simple CORS (Development)
# ========================================
# If you want to quickly test without restrictions:

def create_app_simple():
    app = Flask(__name__)
    
    # Simple CORS - allows everything (development only!)
    CORS(app)
    
    # ... rest of your code ...
    
    return app
