#!/usr/bin/env python3
"""
总资产价格统计定时任务模块
"""

import schedule
import logging
import uuid
import os
from decimal import Decimal
from datetime import datetime, timezone
from app.core.database import Database, AccountManager, PriceTracingManager, ForeignExchangeRateManager
from app.core.tinydb_config import TinyDBConfigManager
from app.util.get_currency_rate import convert_currency_amount
from app.util.time_utils import format_datetime_utc8

logger = logging.getLogger(__name__)

def _calculate_total_asset_price(db: Database):
    """计算所有用户的总资产价格"""
    try:
        # 获取配置管理器
        config_manager = TinyDBConfigManager()
        
        # 获取所有用户ID
        user_ids = config_manager.get_all_user_ids()
        
        if not user_ids:
            logger.info("没有找到用户，跳过总资产价格统计")
            return
        
        logger.info(f"开始统计 {len(user_ids)} 个用户的总资产价格...")
        
        # 初始化管理器
        account_manager = AccountManager(db)
        price_tracing_manager = PriceTracingManager(db)
        exchange_rate_manager = ForeignExchangeRateManager(db)
        
        # 获取当前时间
        current_time = format_datetime_utc8()
        
        # 遍历每个用户
        for user_id in user_ids:
            try:
                logger.info(f"统计用户 {user_id} 的总资产价格...")
                
                # 获取用户的所有活跃账户
                accounts = account_manager.get_accounts_by_user(user_id)
                
                if not accounts:
                    logger.info(f"用户 {user_id} 没有活跃账户，跳过")
                    continue
                
                total_price_cny = Decimal('0')
                processed_accounts = 0
                
                # 遍历每个账户，计算总价值
                for account in accounts:
                    try:
                        # 获取账户的市场价格
                        market_price = account.get('marketPrice')
                        if not market_price or market_price == '0':
                            market_price = account.get('cost', '0')
                        
                        quantity = Decimal(str(account.get('quantity', '0')))
                        price = Decimal(str(market_price))
                        currency = account.get('currency', 'CNY')
                        
                        # 计算该账户的总价值
                        account_total = quantity * price
                        
                        # 如果不是人民币，转换为人民币
                        if currency != 'CNY':
                            try:
                                account_total_cny = convert_currency_amount(
                                    account_total, 
                                    currency, 
                                    'CNY', 
                                    None, 
                                    exchange_rate_manager
                                )
                                logger.debug(f"账户 {account['symbol']}: {account_total} {currency} = {account_total_cny} CNY")
                            except Exception as e:
                                logger.warning(f"转换货币失败 {currency} -> CNY: {e}，使用原值")
                                account_total_cny = account_total
                        else:
                            account_total_cny = account_total
                        total_price_cny += account_total_cny
                        processed_accounts += 1
                        
                    except Exception as e:
                        logger.error(f"处理账户 {account.get('symbol', 'unknown')} 时发生错误: {e}")
                        continue
                
                if processed_accounts > 0:
                    # 记录总资产价格到PriceTracing表
                    try:
                        # 使用uuid4生成ID，accountId设为"0"表示总资产
                        price_data = {
                            'id': str(uuid.uuid4()),
                            'accountId': '0',  # 0表示总资产
                            'date': current_time,
                            'price': str(total_price_cny)
                        }
                        
                        # 添加价格数据点
                        price_tracing_manager.add_price_point(
                            price_data['accountId'],
                            price_data['date'],
                            price_data['price']
                        )
                        
                        logger.info(f"用户 {user_id} 总资产价格统计完成: {total_price_cny} CNY (处理了 {processed_accounts} 个账户)")
                        
                    except Exception as e:
                        logger.error(f"记录用户 {user_id} 总资产价格失败: {e}")
                else:
                    logger.info(f"用户 {user_id} 没有可处理的账户")
                
            except Exception as e:
                logger.error(f"统计用户 {user_id} 总资产价格时发生错误: {e}")
                continue
        
        logger.info("所有用户的总资产价格统计完成")
        
    except Exception as e:
        logger.error(f"计算总资产价格时发生错误: {e}")

def calculate_total_asset_price():
    """计算所有用户的总资产价格"""
    logger.info("开始计算所有用户的总资产价格...")
    
    try:
        # 初始化数据库管理器
        with Database() as db:
            _calculate_total_asset_price(db)
        
    except Exception as e:
        logger.error(f"计算总资产价格时发生错误: {e}")

def setup_total_asset_price_scheduler():
    """设置总资产价格统计定时任务"""
    logger.info("设置总资产价格统计定时任务...")
    
    # 设置时区为Asia/Shanghai (+8)
    os.environ['TZ'] = 'Asia/Shanghai'
    
    # 每天凌晨2点执行（北京时间）
    schedule.every().day.at("02:00").do(calculate_total_asset_price)
    
    logger.info("总资产价格统计定时任务设置完成，每天02:00执行（北京时间）")
