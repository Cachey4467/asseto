#!/usr/bin/env python3
"""
资金管理系统后端启动脚本（集成定时器）
"""

import os
import sys
import threading
import time
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

from app import create_app
from app.schedule.scheduler import start_scheduler

app = create_app()

def run_flask_app():
    """在单独的线程中运行Flask应用"""
    host = os.getenv('FLASK_HOST', '0.0.0.0')
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    print(f"启动资金管理系统后端服务...")
    print(f"服务地址: http://{host}:{port}")
    print(f"调试模式: {debug}")
    
    app.run(host=host, port=port, debug=debug, use_reloader=False)

def run_scheduler_thread():
    """在单独的线程中运行定时器"""
    print("启动定时任务调度器...")
    start_scheduler()

if __name__ == '__main__':
    # 设置Flask配置
    app.config['JSON_AS_ASCII'] = False  # 支持中文
    app.config['JSONIFY_PRETTYPRINT_REGULAR'] = True  # 美化JSON输出
    
    # 创建定时器线程
    scheduler_thread = threading.Thread(target=run_scheduler_thread, daemon=True)
    scheduler_thread.start()
    
    # 在主线程中运行Flask应用
    run_flask_app() 