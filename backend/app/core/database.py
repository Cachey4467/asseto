import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Optional
from decimal import Decimal
from ..util.time_utils import get_current_time_utc8, format_datetime_utc8, isoformat_utc8

from .app_config import AppConfig

def _ensure_initialized(db_path: str = 'finance.db') -> None:
    """确保数据库文件与表结构已初始化。"""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    # 与旧实现保持一致的 PRAGMA
    cursor.execute("PRAGMA timezone = '+08:00'")
        
    # 创建Accounts表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Accounts (
            id VARCHAR(64) PRIMARY KEY,
            userId VARCHAR(64) NOT NULL,
            symbol VARCHAR(64) NOT NULL,
            type VARCHAR(32) NOT NULL,
            parentId VARCHAR(64),
            description VARCHAR(255),
            quantity TEXT NOT NULL,
            cost TEXT NOT NULL,
            marketPrice TEXT,
            currency VARCHAR(10) NOT NULL,
            isActive BOOLEAN NOT NULL DEFAULT 1
        )
    ''')
    
    # 检查是否需要添加symbol字段（兼容旧版本）
    try:
        cursor.execute('SELECT symbol FROM Accounts LIMIT 1')
    except sqlite3.OperationalError:
        # symbol字段不存在，添加它
        cursor.execute('ALTER TABLE Accounts ADD COLUMN symbol VARCHAR(64)')
        # 为现有记录设置symbol为id的值
        cursor.execute('UPDATE Accounts SET symbol = id WHERE symbol IS NULL')
    
    # 创建Config表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId VARCHAR(64) NOT NULL,
            type VARCHAR(32) NOT NULL,
            item VARCHAR(64) NOT NULL,
            subItem VARCHAR(64) NOT NULL,
            value TEXT NOT NULL
        )
    ''')
    
    # 创建外汇汇率表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ForeignExchangeRate (
            id VARCHAR(64) PRIMARY KEY,
            foreign_currency VARCHAR(10) NOT NULL,
            buy_in_price TEXT NOT NULL,
            sell_out_price TEXT NOT NULL,
            created_at DATETIME DEFAULT (datetime('now', '+8 hours'))
        )
    ''')
    
    # 创建Transactions表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Transactions (
            id VARCHAR(64) PRIMARY KEY,
            userId VARCHAR(64) NOT NULL,
            accountId VARCHAR(64) NOT NULL,
            description VARCHAR(255),
            date DATETIME NOT NULL,
            direction TINYINT(1) NOT NULL CHECK (direction IN (0,1)),
            quantity TEXT NOT NULL,
            price TEXT NOT NULL,
            currency VARCHAR(10) NOT NULL,
            FOREIGN KEY (accountId) REFERENCES Accounts(id)
        )
    ''')
    
    # 创建PriceTracing表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS PriceTracing (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            accountId VARCHAR(64) NOT NULL,
            date DATETIME NOT NULL,
            price TEXT NOT NULL,
            FOREIGN KEY (accountId) REFERENCES Accounts(id)
        )
    ''')
    
    # 创建索引
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_config_userId_type_item ON Config(userId, type, item)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_config_userId ON Config(userId)')
    
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_foreign_exchange_rate_currency_created ON ForeignExchangeRate(foreign_currency, created_at)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_foreign_exchange_rate_created ON ForeignExchangeRate(created_at)')
    
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_account_userId ON Accounts(userId)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_account_symbol ON Accounts(symbol)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_account_userId_symbol ON Accounts(userId, symbol)')
    
    # 优化索引 - 针对isActive查询的复合索引
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_userId_isActive ON Accounts(userId, isActive)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_userId_symbol_isActive ON Accounts(userId, symbol, isActive)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_type_isActive ON Accounts(type, isActive)')
    
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_transaction_userId ON Transactions(userId)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_transaction_accountId ON Transactions(accountId)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_transaction_userId_date ON Transactions(userId, date DESC)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_transaction_date ON Transactions(date)')
    
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_price_tracing_accountId ON PriceTracing(accountId)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_price_tracing_date ON PriceTracing(date)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_price_tracing_accountId_date ON PriceTracing(accountId, date)')
        
    conn.commit()
    conn.close()


class Database:
    """事务型数据库会话（上下文管理器）。

    - with 正常退出时提交；异常时回滚
    - 提供 execute_query/execute_update/execute_insert 接口，不会中途提交
    - 兼容各 *Manager(db) 的调用
    """

    def __init__(self):
        self.db_path = AppConfig.DATABASE_PATH
        _ensure_initialized(self.db_path)
        self._conn: Optional[sqlite3.Connection] = None
        self._cursor: Optional[sqlite3.Cursor] = None
        self._active: bool = False

    def __enter__(self) -> 'Database':
        self._conn = sqlite3.connect(self.db_path)
        self._conn.row_factory = sqlite3.Row
        self._cursor = self._conn.cursor()
        self._cursor.execute("PRAGMA timezone = '+08:00'")
        self._active = True
        return self

    def __exit__(self, exc_type, exc, tb):
        try:
            if self._active and self._conn is not None:
                if exc_type is None:
                    self._conn.commit()
                else:
                    self._conn.rollback()
        finally:
            if self._conn is not None:
                self._conn.close()
            self._active = False
            self._conn = None
            self._cursor = None

    def rollback(self):
        if self._conn is not None:
            self._conn.rollback()

    def execute_query(self, query: str, params: tuple = ()) -> List[Dict]:
        if not self._cursor:
            raise RuntimeError("Database 会话未初始化或已结束")
        self._cursor.execute(query, params)
        return [dict(row) for row in self._cursor.fetchall()]

    def execute_update(self, query: str, params: tuple = ()) -> int:
        if not self._cursor:
            raise RuntimeError("Database 会话未初始化或已结束")
        self._cursor.execute(query, params)
        return self._cursor.rowcount

    def execute_insert(self, query: str, params: tuple = ()) -> str:
        if not self._cursor:
            raise RuntimeError("Database 会话未初始化或已结束")
        try:
            self._cursor.execute(query, params)
            return str(self._cursor.lastrowid)
        except sqlite3.IntegrityError as e:
            if self._conn is not None:
                self._conn.rollback()
            raise e

class AccountManager:
    """账户管理器"""
    
    def __init__(self, db: Database):
        self.db = db
    
    def create_account(self, account_data: Dict) -> str:
        """创建新账户"""
        query = '''
            INSERT INTO Accounts (id, userId, symbol, type, parentId, description, quantity, cost, marketPrice, currency, isActive)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        '''
        params = (
            account_data['id'],
            account_data['userId'],
            account_data.get('symbol', account_data['id']),  # 如果没有symbol，使用id作为默认值
            account_data['type'],
            account_data.get('parentId'),
            account_data.get('description'),
            account_data['quantity'],
            account_data['cost'],
            account_data.get('marketPrice'),
            account_data['currency'],
            account_data.get('isActive', True)
        )
        return self.db.execute_insert(query, params)
    
    def get_accounts_by_user(self, userId: str) -> List[Dict]:
        """获取用户的所有活跃账户 - 优化版本"""
        query = '''
            SELECT * FROM Accounts 
            WHERE userId = ? AND isActive = 1
            ORDER BY symbol
        '''
        return self.db.execute_query(query, (userId,))
    
    def get_account_by_id(self, account_id: str) -> Optional[Dict]:
        """根据ID获取账户"""
        query = 'SELECT * FROM Accounts WHERE id = ?'
        results = self.db.execute_query(query, (account_id,))
        return results[0] if results else None
    
    def get_account_by_symbol(self, userId: str, symbol: str) -> Optional[Dict]:
        """根据userId和symbol获取活跃账户 - 优化版本"""
        query = '''
            SELECT * FROM Accounts 
            WHERE userId = ? AND symbol = ? AND isActive = 1
        '''
        results = self.db.execute_query(query, (userId, symbol))
        return results[0] if results else None
    
    def update_account(self, account_id: str, account_data: Dict) -> bool:
        """更新账户信息"""
        query = '''
            UPDATE Accounts 
            SET type = ?, parentId = ?, description = ?, quantity = ?, cost = ?, marketPrice = ?, currency = ?, isActive = ?
            WHERE id = ?
        '''
        params = (
            account_data['type'],
            account_data.get('parentId'),
            account_data.get('description'),
            str(account_data['quantity']),  # 确保转换为字符串
            str(account_data['cost']),    # 确保转换为字符串
            str(account_data.get('marketPrice', '')),  # 确保转换为字符串
            account_data['currency'],
            account_data.get('isActive', True),
            account_id
        )
        return self.db.execute_update(query, params) > 0
    
    def delete_account(self, account_id: str) -> bool:
        """删除账户（软删除）"""
        query = 'UPDATE Accounts SET isActive = 0 WHERE id = ?'
        return self.db.execute_update(query, (account_id,)) > 0

    def delete_account_by_id(self, userId: str, id: str) -> bool:
        """根据userId和id删除账户（软删除）"""
        query = 'UPDATE Accounts SET isActive = 0 WHERE userId = ? AND id = ?'
        return self.db.execute_update(query, (userId, id)) > 0
    
    def delete_account_by_symbol(self, userId: str, symbol: str) -> bool:
        """根据userId和symbol删除账户（软删除）"""
        query = 'UPDATE Accounts SET isActive = 0 WHERE userId = ? AND symbol = ?'
        return self.db.execute_update(query, (userId, symbol)) > 0
    
    def get_all_stock_accounts(self) -> List[Dict]:
        """获取所有type为stock的活跃账户"""
        query = '''
            SELECT * FROM Accounts 
            WHERE type = 'stock' AND isActive = 1
            ORDER BY userId, symbol
        '''
        return self.db.execute_query(query)


class TransactionManager:
    """交易管理器"""
    
    def __init__(self, db: Database):
        self.db = db
    
    def create_transaction(self, transaction_data: Dict) -> str:
        """创建新交易记录"""
        query = '''
            INSERT INTO Transactions (id, userId, accountId, description, date, direction, quantity, price, currency)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        '''
        params = (
            transaction_data['id'],
            transaction_data['userId'],
            transaction_data['accountId'],
            transaction_data.get('description'),
            transaction_data['date'],
            transaction_data['direction'],
            str(transaction_data['quantity']),  # 转换为字符串
            str(transaction_data['price']),   # 转换为字符串
            transaction_data['currency']
        )
        return self.db.execute_insert(query, params)
    
    def get_transactions_by_user(self, userId: str, accountId: str = None, start_date: str = None, end_date: str = None, page_index: int = 0, page_size: int = 20) -> Dict:
        """获取用户的交易记录，支持按账户ID和日期范围过滤，支持分页"""
        if not userId:
            raise ValueError("userId是必需参数")
        
        # 验证分页参数
        if page_index < 0:
            page_index = 0
        if page_size < 1:
            page_size = 20
        
        # 构建查询条件
        conditions = ["userId = ?"]
        params = [userId]
        
        if accountId:
            conditions.append("accountId = ?")
            params.append(accountId)
        
        if start_date:
            conditions.append("date >= ?")
            params.append(start_date)
        
        if end_date:
            conditions.append("date <= ?")
            params.append(end_date)
        
        where_clause = " AND ".join(conditions)
        
        # 计算偏移量
        offset = page_index * page_size
        
        # 获取总记录数
        count_query = f'''
            SELECT COUNT(*) as total FROM Transactions 
            WHERE {where_clause}
        '''
        count_result = self.db.execute_query(count_query, tuple(params))
        total_count = count_result[0]['total'] if count_result else 0
        
        # 获取分页数据
        params.extend([page_size, offset])
        query = f'''
            SELECT * FROM Transactions 
            WHERE {where_clause}
            ORDER BY date DESC 
            LIMIT ? OFFSET ?
        '''
        transactions = self.db.execute_query(query, tuple(params))
        
        # 计算分页信息
        total_pages = (total_count + page_size - 1) // page_size

        return {
            'transactions': transactions,
            'pagination': {
                'page_index': page_index,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': total_pages,
                'has_next': page_index < total_pages - 1,
                'has_prev': page_index > 0
            }
        }
    

    
    def get_transaction_by_id(self, transaction_id: str) -> Optional[Dict]:
        """根据ID获取交易记录"""
        query = 'SELECT * FROM Transactions WHERE id = ?'
        results = self.db.execute_query(query, (transaction_id,))
        return results[0] if results else None
    
    def update_transaction(self, transaction_id: str, transaction_data: Dict, userId: str = None) -> bool:
        """更新交易记录"""
        if not transaction_id:
            raise ValueError("transaction_id是必需参数")
        
        # 如果提供了userId，先验证交易记录是否属于该用户
        if userId:
            query = 'SELECT userId FROM Transactions WHERE id = ?'
            result = self.db.execute_query(query, (transaction_id,))
            if not result or result[0]['userId'] != userId:
                return False
        
        query = '''
            UPDATE Transactions 
            SET description = ?, date = ?, direction = ?, quantity = ?, price = ?, currency = ?
            WHERE id = ?
        '''
        params = (
            transaction_data.get('description'),
            transaction_data['date'],
            transaction_data['direction'],
            str(transaction_data['quantity']),  # 转换为字符串
            str(transaction_data['price']),   # 转换为字符串
            transaction_data['currency'],
            transaction_id
        )
        return self.db.execute_update(query, params) > 0
    
    def delete_transaction(self, transaction_id: str, userId: str = None) -> bool:
        """删除交易记录"""
        if not transaction_id:
            raise ValueError("transaction_id是必需参数")
        
        # 如果提供了userId，先验证交易记录是否属于该用户
        if userId:
            query = 'SELECT userId FROM Transactions WHERE id = ?'
            result = self.db.execute_query(query, (transaction_id,))
            if not result or result[0]['userId'] != userId:
                return False
        
        query = 'DELETE FROM Transactions WHERE id = ?'
        return self.db.execute_update(query, (transaction_id,)) > 0

class ForeignExchangeRateManager:
    """外汇汇率管理器"""
    
    def __init__(self, db: Database):
        self.db = db
    
    def set_exchange_rate(self, rate_data: Dict) -> str:
        """设置外汇汇率"""
        query = '''
            INSERT OR REPLACE INTO ForeignExchangeRate (id, foreign_currency, buy_in_price, sell_out_price)
            VALUES (?, ?, ?, ?)
        '''
        params = (
            rate_data['id'],
            rate_data['foreign_currency'],
            str(rate_data['buy_in_price']),
            str(rate_data['sell_out_price'])
        )
        return self.db.execute_insert(query, params)
    
    def get_exchange_rate(self, currency: str, date: str) -> Optional[Dict]:
        """获取指定货币和日期的汇率"""
        query = '''
            SELECT * FROM ForeignExchangeRate 
            WHERE foreign_currency = ? AND DATE(created_at) = ?
        '''
        results = self.db.execute_query(query, (currency, date))
        return results[0] if results else None
    
    def get_exchange_rates_by_date(self, date: str) -> List[Dict]:
        """获取指定日期的所有汇率"""
        query = '''
            SELECT * FROM ForeignExchangeRate 
            WHERE DATE(created_at) = ?
            ORDER BY foreign_currency
        '''
        return self.db.execute_query(query, (date,))
    
    def get_exchange_rates_by_currency(self, currency: str, start_date: str = None, end_date: str = None) -> List[Dict]:
        """获取指定货币的汇率历史"""
        if start_date and end_date:
            query = '''
                SELECT * FROM ForeignExchangeRate 
                WHERE foreign_currency = ? AND DATE(created_at) BETWEEN ? AND ?
                ORDER BY created_at DESC
            '''
            params = (currency, start_date, end_date)
        else:
            query = '''
                SELECT * FROM ForeignExchangeRate 
                WHERE foreign_currency = ?
                ORDER BY created_at DESC
            '''
            params = (currency,)
        
        return self.db.execute_query(query, params)
    
    def delete_exchange_rate(self, currency: str, date: str) -> bool:
        """删除指定货币和日期的汇率"""
        query = '''
            DELETE FROM ForeignExchangeRate 
            WHERE foreign_currency = ? AND DATE(created_at) = ?
        '''
        return self.db.execute_update(query, (currency, date)) > 0
    
    def delete_exchange_rates_by_date(self, date: str) -> bool:
        """删除指定日期的所有汇率"""
        query = '''
            DELETE FROM ForeignExchangeRate 
            WHERE DATE(created_at) = ?
        '''
        return self.db.execute_update(query, (date,))
    
    def get_latest_exchange_rate(self, currency: str, date: str = None) -> Optional[Dict]:
        """获取指定货币的最新汇率"""
        if currency == "CNY":
            return {
                'buy_in_price': 100,
                'sell_out_price': 100
            }
        
        if date:
            # 如果指定了日期，获取该日期的汇率
            # 使用更灵活的日期匹配，支持多种格式
            query = '''
                SELECT * FROM ForeignExchangeRate 
                WHERE foreign_currency = ? AND DATE(created_at) = DATE(?)
                ORDER BY created_at DESC
                LIMIT 1
            '''
            results = self.db.execute_query(query, (currency, date))
        else:
            # 如果没有指定日期，获取今天的最新汇率
            query = '''
                SELECT * FROM ForeignExchangeRate 
                WHERE foreign_currency = ? AND DATE(created_at) = DATE('now', '+8 hours')
                ORDER BY created_at DESC
                LIMIT 1
            '''
            results = self.db.execute_query(query, (currency,))
        
        return results[0] if results else None
    
    def cleanup_old_exchange_rates(self, days_to_keep: int = 30) -> int:
        """清理超过指定天数的旧汇率数据"""
        query = '''
            DELETE FROM ForeignExchangeRate 
            WHERE created_at < DATE('now', '+8 hours', '-{} days')
        '''.format(days_to_keep)
        
        return self.db.execute_update(query, ())


class PriceTracingManager:
    """价格追踪管理器"""
    
    def __init__(self, db: Database):
        self.db = db
    
    def add_price_point(self, account_id: str, date: str, price: str) -> str:
        """添加价格数据点"""
        query = '''
            INSERT INTO PriceTracing (accountId, date, price)
            VALUES (?, ?, ?)
        '''
        params = (account_id, date, str(price))
        return self.db.execute_insert(query, params)
    
    def get_price_tracing(self, account_id: str, start_date: str = None, end_date: str = None) -> List[Dict]:
        """获取指定账户的价格追踪数据"""
        if start_date and end_date:
            query = '''
                SELECT * FROM PriceTracing 
                WHERE accountId = ? AND date BETWEEN ? AND ?
                ORDER BY date ASC
            '''
            params = (account_id, start_date, end_date)
        else:
            query = '''
                SELECT * FROM PriceTracing 
                WHERE accountId = ?
                ORDER BY date ASC
            '''
            params = (account_id,)
        
        return self.db.execute_query(query, params)
    
    def get_latest_price(self, account_id: str) -> Optional[Dict]:
        """获取指定账户的最新价格"""
        query = '''
            SELECT * FROM PriceTracing 
            WHERE accountId = ?
            ORDER BY date DESC
            LIMIT 1
        '''
        results = self.db.execute_query(query, (account_id,))
        return results[0] if results else None
    
    def update_price_point(self, price_id: int, price: str) -> bool:
        """更新价格数据点"""
        query = '''
            UPDATE PriceTracing 
            SET price = ?
            WHERE id = ?
        '''
        return self.db.execute_update(query, (str(price), price_id)) > 0
    
    def delete_price_point(self, price_id: int) -> bool:
        """删除价格数据点"""
        query = 'DELETE FROM PriceTracing WHERE id = ?'
        return self.db.execute_update(query, (price_id,)) > 0
    
    def delete_price_tracing_by_account(self, account_id: str) -> bool:
        """删除指定账户的所有价格追踪数据"""
        query = 'DELETE FROM PriceTracing WHERE accountId = ?'
        return self.db.execute_update(query, (account_id,)) > 0