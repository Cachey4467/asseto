#!/usr/bin/env python3
"""
测试价格获取功能
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.price_fetch import PriceFetcher
from app.core.tinydb_config import TinyDBConfigManager


def test_price_fetch():
    """测试价格获取功能"""
    print("开始测试价格获取功能...")
    
    # 初始化价格获取器
    price_fetcher = PriceFetcher()
    
    # 测试设置LongPort配置
    print("\n1. 测试设置LongPort配置...")
    success = price_fetcher.set_longport_config(
        app_key="your_app_key_here",
        app_secret="your_app_secret_here", 
        access_token="your_access_token_here"
    )
    print(f"设置配置结果: {success}")
    
    # 测试获取LongPort配置
    print("\n2. 测试获取LongPort配置...")
    config = price_fetcher.get_longport_config()
    print(f"当前配置: {config}")
    
    # 测试获取单个股票价格
    print("\n3. 测试获取单个股票价格...")
    test_symbols = ["700.HK", "AAPL.US", "TSLA.US", "NFLX.US"]
    
    for symbol in test_symbols:
        try:
            price = price_fetcher.get_price_by_symbol(symbol)
            print(f"{symbol}: {price}")
        except Exception as e:
            print(f"{symbol}: 获取失败 - {str(e)}")
    
    # 测试获取多个资产价格
    print("\n4. 测试获取多个资产价格...")
    test_assets = [
        {
            'id': '1',
            'type': 'stock',
            'symbol': '700.HK',
            'currency': 'HKD',
            'remain_cost': 300.0
        },
        {
            'id': '2', 
            'type': 'stock',
            'symbol': 'AAPL.US',
            'currency': 'USD',
            'remain_cost': 150.0
        },
        {
            'id': '3',
            'type': 'cash',
            'symbol': 'CASH',
            'currency': 'CNY',
            'remain_cost': 10000.0
        }
    ]
    
    try:
        prices = price_fetcher.get_price(test_assets)
        print("获取到的价格:")
        for price_info in prices:
            print(f"  {price_info['symbol']}: {price_info['current_price']} {price_info['currency']}")
    except Exception as e:
        print(f"获取价格失败: {str(e)}")


def test_tinydb_config():
    """测试TinyDB配置管理"""
    print("\n开始测试TinyDB配置管理...")
    
    config_manager = TinyDBConfigManager()
    
    # 测试设置全局配置
    print("\n1. 测试设置全局配置...")
    test_config = {
        'longport_app_key': 'test_app_key',
        'longport_app_secret': 'test_app_secret',
        'longport_access_token': 'test_access_token'
    }
    
    success = config_manager.set_global_config(test_config)
    print(f"设置全局配置结果: {success}")
    
    # 测试获取全局配置
    print("\n2. 测试获取全局配置...")
    app_key = config_manager.get_global_config('longport_app_key')
    app_secret = config_manager.get_global_config('longport_app_secret')
    access_token = config_manager.get_global_config('longport_access_token')
    
    print(f"app_key: {app_key}")
    print(f"app_secret: {app_secret}")
    print(f"access_token: {access_token}")


if __name__ == "__main__":
    print("=== 价格获取功能测试 ===")
    
    # 测试TinyDB配置
    test_tinydb_config()
    
    # 测试价格获取（需要有效的API密钥）
    test_price_fetch()
    
    print("\n=== 测试完成 ===")

