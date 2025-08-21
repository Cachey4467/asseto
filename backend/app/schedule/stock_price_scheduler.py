#!/usr/bin/env python3
"""
股票价格更新定时任务模块
"""

import schedule
import logging
from typing import Set
from app.core.database import Database, AccountManager
from app.services.price_fetch import PriceFetcher

logger = logging.getLogger(__name__)

def _update_stock_prices(db: Database):
    """更新所有股票的价格"""
    try:
        # 获取所有股票账户
        account_manager = AccountManager(db)
        stock_accounts = account_manager.get_all_stock_accounts()
        
        if not stock_accounts:
            return
        
        # 提取所有股票代码并去重
        symbols: Set[str] = set()
        for account in stock_accounts:
            if account.get('symbol'):
                symbols.add(account['symbol'])
        
        if not symbols:
            return
        
        # 获取价格
        price_fetcher = PriceFetcher()
        symbols_list = list(symbols)
        prices = price_fetcher.get_price_of_symbols(symbols_list)
        
        if not prices:
            logger.warning("获取股票价格失败")
            return
        
        # 更新数据库中的marketPrice字段
        updated_count = 0
        for account in stock_accounts:
            symbol = account.get('symbol')
            if symbol and symbol in prices:
                new_price = prices[symbol]
                if new_price is not None:
                    # 更新marketPrice字段
                    account_manager.update_account(account['id'], {
                        'type': account['type'],
                        'parentId': account.get('parentId'),
                        'description': account.get('description'),
                        'quantity': account['quantity'],
                        'cost': account['cost'],
                        'marketPrice': str(new_price),  # 转换为字符串
                        'currency': account['currency'],
                        'isActive': account.get('isActive', True)
                    })
                    updated_count += 1
        
        logger.info(f"已更新 {updated_count} 个股票的价格")
        
    except Exception as e:
        logger.error(f"更新股票价格时发生错误: {e}")

def update_stock_prices():
    """更新股票价格"""
    try:
        # 初始化数据库管理器
        with Database() as db:
            _update_stock_prices(db)
        
    except Exception as e:
        logger.error(f"更新股票价格时发生错误: {e}")

def setup_stock_price_scheduler():
    """设置股票价格更新定时任务"""
    logger.info("设置股票价格更新定时任务...")
    
    # 每20秒执行一次
    schedule.every(30).seconds.do(update_stock_prices)
    
    logger.info("股票价格更新定时任务设置完成，每20秒执行一次")
