import os
from datetime import timedelta

class AppConfig:
    """Flask应用配置类"""
    
    # 基础配置
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    # 数据库配置
    DATABASE_PATH = os.environ.get('DATABASE_PATH') or 'finance.db'
    
    # TinyDB配置
    TINYDB_CONFIG_PATH = os.environ.get('TINYDB_CONFIG_PATH') or 'config.json'
    print(TINYDB_CONFIG_PATH)
    print(DATABASE_PATH)
    
    # JSON配置
    JSON_AS_ASCII = False  # 支持中文
    JSONIFY_PRETTYPRINT_REGULAR = True  # 美化JSON输出
    
    # CORS配置
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
    
    # 会话配置
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
    
    # 日志配置
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    
    @staticmethod
    def init_app(app):
        """初始化应用配置"""
        pass

class DevelopmentConfig(AppConfig):
    """开发环境配置"""
    DEBUG = True
    DATABASE_PATH = 'finance_dev.db'
    TINYDB_CONFIG_PATH = 'config_dev.json'

class ProductionConfig(AppConfig):
    """生产环境配置"""
    DEBUG = False
    DATABASE_PATH = os.environ.get('DATABASE_PATH', 'finance_prod.db')
    
    @classmethod
    def init_app(cls, app):
        AppConfig.init_app(app)
        
        # 生产环境日志配置
        import logging
        from logging.handlers import RotatingFileHandler
        
        if not app.debug and not app.testing:
            if not os.path.exists('logs'):
                os.mkdir('logs')
            file_handler = RotatingFileHandler('logs/finance.log', maxBytes=10240, backupCount=10)
            file_handler.setFormatter(logging.Formatter(
                '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
            ))
            file_handler.setLevel(logging.INFO)
            app.logger.addHandler(file_handler)
            app.logger.setLevel(logging.INFO)
            app.logger.info('Finance startup')

class TestingConfig(AppConfig):
    """测试环境配置"""
    TESTING = True
    DATABASE_PATH = 'finance_test.db'
    WTF_CSRF_ENABLED = False

# 配置字典
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
} 