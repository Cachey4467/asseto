#!/usr/bin/env python3
"""
外汇汇率定时任务模块
"""

import schedule
import logging
import os
from datetime import datetime, timedelta, timezone
from app.core.database import Database, ForeignExchangeRateManager
from app.util.time_utils import format_date_utc8
from app.util.get_currency_rate import work_on

logger = logging.getLogger(__name__)

def _fetch_daily_exchange_rates(db: Database):
    """获取每日外汇汇率"""
    # 清理超过30天的旧汇率数据
    rate_manager = ForeignExchangeRateManager(db)
    try:
        deleted_count = rate_manager.cleanup_old_exchange_rates(30)
        logger.info(f"清理了 {deleted_count} 条过期汇率数据")
    except Exception as e:
        logger.warning(f"清理过期汇率数据失败: {e}")
    
    # 设置日期范围（昨天到今天）
    start_date = format_date_utc8(datetime.now(timezone.utc) - timedelta(days=1))
    end_date = format_date_utc8()
    
    # 需要获取的货币列表
    currencies = ["USD", "HKD"]
    
    for currency in currencies:
        try:
            logger.info(f"获取 {currency} 汇率...")
            
            # 使用work_on函数获取汇率（会自动保存到缓存）
            buy_in_price, sell_out_price = work_on(start_date, end_date, currency, rate_manager)
            
            logger.info(f"{currency} 汇率获取成功: 买入价={buy_in_price}, 卖出价={sell_out_price}")
            
        except Exception as e:
            logger.error(f"获取 {currency} 汇率失败: {e}")
    
    logger.info("每日外汇汇率获取完成")

def fetch_daily_exchange_rates():
    """获取每日外汇汇率"""
    logger.info("开始获取每日外汇汇率...")
    
    try:
        # 初始化数据库管理器
        with Database() as db:
            _fetch_daily_exchange_rates(db)
        
    except Exception as e:
        logger.error(f"获取外汇汇率时发生错误: {e}")

def setup_currency_rate_scheduler():
    """设置外汇汇率定时任务"""
    logger.info("设置外汇汇率定时任务...")
    
    # 设置时区为Asia/Shanghai (+8)
    os.environ['TZ'] = 'Asia/Shanghai'
    
    # 每天12点执行（北京时间）
    schedule.every().day.at("12:00").do(fetch_daily_exchange_rates)
    
    logger.info("外汇汇率定时任务设置完成，每天12:00执行（北京时间）")
