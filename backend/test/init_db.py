#!/usr/bin/env python3
"""
数据库初始化脚本
"""

import os
import sys
from datetime import datetime, timezone, timedelta

# 添加backend目录到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import Database, AccountManager, TransactionManager
import uuid

def init_database():
    """初始化数据库"""
    print("开始初始化数据库...")
    
    # 创建数据库实例
    db = Database()
    account_manager = AccountManager(db)
    transaction_manager = TransactionManager(db)
    
    print("数据库连接成功！")
    
    # 创建示例账户
    print("\n创建示例账户...")
    
    # 示例账户1：现金账户
    cash_account = {
        'id': str(uuid.uuid4()),
        'userId': 'default_user',
        'type': 'cash',
        'parentId': None,
        'description': '现金账户',
        'quantity': 5000.00,
        'cost': 1.00,
        'marketPrice': 1.00,
        'currency': 'CNY',
        'isActive': True
    }
    
    # 示例账户2：银行账户
    bank_account = {
        'id': str(uuid.uuid4()),
        'userId': 'default_user',
        'type': 'bank',
        'parentId': None,
        'description': '工商银行储蓄卡',
        'quantity': 100000.00,
        'cost': 1.00,
        'marketPrice': 1.00,
        'currency': 'CNY',
        'isActive': True
    }
    
    # 示例账户3：投资账户
    investment_account = {
        'id': str(uuid.uuid4()),
        'userId': 'default_user',
        'type': 'investment',
        'parentId': None,
        'description': '股票投资账户',
        'quantity': 50000.00,
        'cost': 1.00,
        'marketPrice': 1.00,
        'currency': 'CNY',
        'isActive': True
    }
    
    # 添加账户到数据库
    try:
        account_manager.create_account(cash_account)
        print(f"✓ 创建现金账户: {cash_account['description']}")
        
        account_manager.create_account(bank_account)
        print(f"✓ 创建银行账户: {bank_account['description']}")
        
        account_manager.create_account(investment_account)
        print(f"✓ 创建投资账户: {investment_account['description']}")
        
    except Exception as e:
        print(f"创建账户失败: {e}")
        return
    
    # 创建示例交易记录
    print("\n创建示例交易记录...")
    
    # 示例交易1：工资收入
    salary_transaction = {
        'id': str(uuid.uuid4()),
        'userId': 'default_user',
        'accountId': bank_account['id'],
        'description': '工资收入',
        'date': datetime.now(timezone(timedelta(hours=8))).strftime('%Y-%m-%d %H:%M:%S+08:00'),
        'direction': 0,  # 入账
        'quantity': 8000.00,
        'price': 1.00,
        'currency': 'CNY'
    }
    
    # 示例交易2：购物支出
    shopping_transaction = {
        'id': str(uuid.uuid4()),
        'userId': 'default_user',
        'accountId': cash_account['id'],
        'description': '超市购物',
        'date': datetime.now(timezone(timedelta(hours=8))).strftime('%Y-%m-%d %H:%M:%S+08:00'),
        'direction': 1,  # 出账
        'quantity': 200.00,
        'price': 1.00,
        'currency': 'CNY'
    }
    
    # 示例交易3：股票投资
    stock_transaction = {
        'id': str(uuid.uuid4()),
        'userId': 'default_user',
        'accountId': investment_account['id'],
        'description': '购买股票',
        'date': datetime.now(timezone(timedelta(hours=8))).strftime('%Y-%m-%d %H:%M:%S+08:00'),
        'direction': 0,  # 入账（投资）
        'quantity': 10000.00,
        'price': 1.00,
        'currency': 'CNY'
    }
    
    # 添加交易记录到数据库
    try:
        transaction_manager.create_transaction(salary_transaction)
        print(f"✓ 创建交易记录: {salary_transaction['description']}")
        
        transaction_manager.create_transaction(shopping_transaction)
        print(f"✓ 创建交易记录: {shopping_transaction['description']}")
        
        transaction_manager.create_transaction(stock_transaction)
        print(f"✓ 创建交易记录: {stock_transaction['description']}")
        
    except Exception as e:
        print(f"创建交易记录失败: {e}")
        return
    
    print("\n数据库初始化完成！")
    print("\n示例数据:")
    print("- 3个账户（现金、银行、投资）")
    print("- 3条交易记录（工资收入、购物支出、股票投资）")
    print("\n可以使用以下命令测试API:")
    print("python test_api.py")

def show_database_info():
    """显示数据库信息"""
    print("数据库信息:")
    print(f"数据库文件: {os.path.abspath('finance.db')}")
    
    if os.path.exists('finance.db'):
        file_size = os.path.getsize('finance.db')
        print(f"文件大小: {file_size} 字节")
    else:
        print("数据库文件不存在")

if __name__ == "__main__":
    print("=" * 50)
    print("资金管理系统数据库初始化工具")
    print("=" * 50)
    
    show_database_info()
    
    choice = input("\n是否要初始化数据库并添加示例数据？(y/n): ")
    
    if choice.lower() in ['y', 'yes', '是']:
        init_database()
    else:
        print("取消初始化操作")