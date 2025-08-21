import json
import os
from datetime import datetime
from typing import List, Dict, Optional
from decimal import Decimal, ROUND_HALF_UP
from ..core.database import Database, AccountManager, TransactionManager

class AssetManagerContext:
    """资产写操作上下文（强制 with 使用）。"""

    def __init__(self):
        self._db: Optional[Database] = None
        self._am: Optional[AccountManager] = None
        self._tm: Optional[TransactionManager] = None

    def __enter__(self) -> 'AssetManagerContext':
        self._db = Database().__enter__()
        self._am = AccountManager(self._db)
        self._tm = TransactionManager(self._db)
        return self

    def __exit__(self, exc_type, exc, tb):
        if self._db is not None:
            self._db.__exit__(exc_type, exc, tb)
        self._db = None
        self._am = None
        self._tm = None

    def rollback(self):
        if self._db is not None:
            self._db.rollback()
    
    # ---- 写操作（只能在 with 上下文中使用） ----
    def _ensure_active(self):
        if self._db is None or self._am is None or self._tm is None:
            raise RuntimeError("请在 with AssetManagerContext() 上下文中执行写操作")

    def add_asset(self, asset_data: Dict):
        self._ensure_active()
        if 'userId' not in asset_data:
            raise ValueError("userId是必需字段")

        existing_account = self._am.get_account_by_symbol(
            asset_data['userId'], asset_data.get('symbol', asset_data['id'])
        )
        if existing_account:
            raise ValueError(
                f"用户 {asset_data['userId']} 的资产编号 {asset_data.get('symbol', asset_data['id'])} 已存在"
            )

        self._am.create_account({
            'id': asset_data['id'],
            'userId': asset_data['userId'],
            'symbol': asset_data.get('symbol', asset_data['id']),
            'type': asset_data['type'],
            'parentId': asset_data.get('belong_id') or asset_data.get('parentId'),
            'description': asset_data['description'],
            'quantity': asset_data['quantity'],
            'cost': asset_data['cost'],
            'marketPrice': asset_data['cost'],
            'currency': asset_data['currency'],
            'isActive': True
        })

    def delete_asset(self, userId: str, id: str) -> bool:
        self._ensure_active()
        if not userId or not id:
            raise ValueError("userId和id都是必需字段")
        return self._am.delete_account_by_id(userId, id)

    def update_asset(self, userId: str, asset_id: str, asset_data: Dict) -> bool:
        self._ensure_active()
        if not userId or not asset_id:
            raise ValueError("userId和asset_id都是必需字段")
        account = self._am.get_account_by_id(asset_id)
        if not account:
            raise ValueError("account not found")
        # 如果asset_data没有提供某个字段，则用原来的
        return self._am.update_account(account['id'], {
            'type': asset_data.get('type', account['type']),
            'parentId': asset_data.get('belong_id', account.get('parentId')),
            'description': asset_data.get('description', account.get('description')),
            'quantity': str(asset_data.get('quantity', account['quantity'])),
            'cost': str(asset_data.get('cost', account['cost'])),
            'marketPrice': account.get('marketPrice', str(asset_data.get('cost', account['cost']))),
            'currency': asset_data.get('currency', account['currency']),
            'isActive': True
        })

    def update_asset_by_transaction(self, transaction_data: Dict) -> bool:
        self._ensure_active()
        if not transaction_data or 'userId' not in transaction_data or 'accountId' not in transaction_data:
            raise ValueError("缺少必须字段")

        account = self._am.get_account_by_id(transaction_data['accountId'])
        if not account:
            return False
        if account['userId'] != transaction_data['userId']:
            return False

        original_quantity = Decimal(str(account['quantity']))
        original_cost = Decimal(str(account['cost']))
        transaction_quantity = Decimal(str(transaction_data['quantity']))
        transaction_price = Decimal(str(transaction_data['price']))

        if transaction_data['direction'] == 'buy':
            transaction_data['direction'] = 0
        if transaction_data['direction'] == 'sell':
            transaction_data['direction'] = 1
        direction = transaction_data['direction']

        if direction == 1:
            new_quantity = original_quantity - transaction_quantity
            if new_quantity < 0:
                raise ValueError(f"卖出数量({transaction_quantity})超过当前持有数量({original_quantity})，无法执行此操作")
            elif new_quantity == 0:
                new_cost = Decimal('0')
            else:
                new_cost = ((original_quantity * original_cost) - (transaction_quantity * transaction_price)) / new_quantity
                new_cost = new_cost.quantize(Decimal('0.00000001'), rounding=ROUND_HALF_UP)
        elif direction == 0:
            new_quantity = original_quantity + transaction_quantity
            new_cost = ((original_quantity * original_cost) + (transaction_quantity * transaction_price)) / new_quantity
            new_cost = new_cost.quantize(Decimal('0.00000001'), rounding=ROUND_HALF_UP)
        else:
            raise ValueError("direction字段必须是0（入账）或1（出账）")

        self._tm.create_transaction(transaction_data)
        print(f"qwq update_account: {account['id']}, {new_quantity}, {new_cost}")
        return self._am.update_account(account['id'], {
            'type': account['type'],
            'parentId': account.get('parentId'),
            'description': account.get('description'),
            'quantity': str(new_quantity),
            'cost': str(new_cost),
            'marketPrice': account.get('marketPrice', str(new_cost)),
            'currency': account['currency'],
            'isActive': new_quantity > 0
        })

    def add_asset_with_initial_transaction(self, asset_data: Dict, transaction_data: Dict) -> None:
        self._ensure_active()
        self.add_asset(asset_data)
        self.update_asset_by_transaction(transaction_data)
    
    def get_all_assets(self, userId: str) -> List[Dict]:
        """获取指定用户的所有资产"""
        if not userId:
            raise ValueError("userId是必需字段")
        # 读操作短会话
        with Database() as db:
            accounts = AccountManager(db).get_accounts_by_user(userId)
        
        # 转换为前端期望的格式
        assets = []
        for account in accounts:
            asset = {
                'id': account['id'],
                'type': account['type'],
                'belong_id': account['parentId'] or '',
                'description': account['description'],
                'quantity': float(account['quantity']),  # 转换为float以保持API兼容性
                'remain_cost': float(account['cost']),  # 转换为float以保持API兼容性
                'price': float(account.get('marketPrice', account['cost'])),
                'currency': account['currency'],
                'symbol': account['symbol']  # 使用symbol字段
            }
            assets.append(asset)
        return assets

    def get_asset_by_id(self, account_id: str) -> Optional[Dict]:
        """根据account_id获取资产"""
        with Database() as db:
            return AccountManager(db).get_account_by_id(account_id)
        
    def get_asset_by_symbol(self, userId: str, symbol: str) -> Optional[Dict]:
        """根据userId和symbol获取资产"""
        if not userId or not symbol:
            raise ValueError("userId和symbol都是必需字段")
        with Database() as db:
            account = AccountManager(db).get_account_by_symbol(userId, symbol)
        if account:
            return {
                'id': account['id'],
                'type': account['type'],
                'belong_id': account['parentId'] or '',
                'description': account['description'],
                'quantity': float(account['quantity']),  # 转换为float以保持API兼容性
                'cost': float(account['cost']),  # 转换为float以保持API兼容性
                'currency': account['currency'],
                'symbol': account['symbol']
            }
        return None
    