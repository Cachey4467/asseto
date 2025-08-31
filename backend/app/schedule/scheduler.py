#!/usr/bin/env python3
"""
主定时任务调度器 - 统一管理所有定时任务
"""

import schedule
import time
import logging
from app.schedule import setup_currency_rate_scheduler, setup_stock_price_scheduler, setup_longport_sync_scheduler, setup_total_asset_price_scheduler
from app.schedule.currency_rate_scheduler import fetch_daily_exchange_rates
from app.schedule.stock_price_scheduler import update_stock_prices
from app.schedule.longport_sync_scheduler import sync_all_user_longport_accounts
from app.schedule.total_asset_price_scheduler import calculate_total_asset_price

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scheduler.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def setup_all_schedulers():
    """设置所有定时任务"""
    logger.info("设置所有定时任务...")
    
    # 设置外汇汇率定时任务
    setup_currency_rate_scheduler()
    
    # 设置股票价格更新定时任务
    setup_stock_price_scheduler()
    
    # 设置长桥账户同步定时任务
    setup_longport_sync_scheduler()
    
    # 设置总资产价格统计定时任务
    setup_total_asset_price_scheduler()
    
    logger.info("所有定时任务设置完成")

def start_scheduler():
    """启动定时任务（用于后台运行）"""
    logger.info("启动定时任务调度器...")
    
    # 设置所有定时任务
    setup_all_schedulers()
    
    # 立即执行一次（用于测试）
    logger.info("立即执行一次所有任务...")
    fetch_daily_exchange_rates()
    update_stock_prices()
    sync_all_user_longport_accounts()
    # calculate_total_asset_price() 不需要每次运行的时候产生一条记录，每天定时就好
    
    # 运行调度器
    while True:
        try:
            schedule.run_pending()
            time.sleep(1)  # 每秒检查一次
        except Exception as e:
            logger.error(f"调度器运行错误: {e}")
            time.sleep(10)  # 出错时等待10秒再继续
