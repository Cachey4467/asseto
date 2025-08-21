# 获取资金流水
# https://open.longportapp.com/docs/trade/asset/cashflow
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import uuid
from zoneinfo import ZoneInfo
from longport.openapi import OrderSide, QuoteContext, TradeContext, Config, OrderStatus
from typing import TYPE_CHECKING

from ..core.database import Database, AccountManager, TransactionManager
from ..models import AssetManagerContext
from ..core.tinydb_config import TinyDBConfigManager
from ..util.time_utils import isoformat_utc8, parse_datetime_utc8


class LongportService:
    def __init__(self, userId: str):
        self.userId = userId
        
        # 初始化配置管理器（使用共享实例）
        self.config_manager = TinyDBConfigManager()


    def _add_cash_account(self, m: AssetManagerContext, app_key: str, ctx: TradeContext, belongId: str = None):
        raw_info = ctx.account_balance()
        if len(raw_info) != 1:
            raise Exception("现金账户数量不唯一，请检查长桥API是否更新")
        accountBalanceItem = raw_info[0]
        cash_account_data = {
            "id": app_key + "_cash",
            "userId": self.userId,
            "symbol": "longport_cash",
            "type": "cash",
            "parentId": belongId,
            "description": "长桥现金账户",
            "quantity": str(accountBalanceItem.total_cash),
            "cost": str(1.0),
            "currency": accountBalanceItem.currency,
            "isActive": True
        }
        m.add_asset(cash_account_data)
    
    def _add_stock_account(self, m: AssetManagerContext, app_key: str, ctx: TradeContext, qctx: QuoteContext, belongId: str = None):
        raw_info = ctx.stock_positions().channels
        stock_data = []
        stock_symbols = []
        for x in raw_info:
            for y in x.positions:
                stock_data.append(y)
                stock_symbols.append(y.symbol)
        stock_info = qctx.static_info(stock_symbols)

        for x, y in zip(stock_data, stock_info):
            stock_account_data = {
                "id": app_key + "_stock_" + y.symbol,
                "userId": self.userId,
                "symbol": y.symbol,
                "type": "stock",
                "parentId": belongId,
                "description": f"{y.name_cn if y.name_cn else y.name_en}(长桥)",
                "quantity": str(x.quantity),
                "cost": str(x.cost_price),
                "currency": x.currency,
                "isActive": True
            }
            m.add_asset(stock_account_data)

    def init_user_longbridge_account(self, belongId: str, app_key: str, app_secret: str, access_token: str):
        new_config_id = str(uuid.uuid4())
        config = Config(
            app_key=app_key,
            app_secret=app_secret,
            access_token=access_token,
            enable_print_quote_packages=False
        )
        ctx = TradeContext(config)
        qctx = QuoteContext(config)
        with AssetManagerContext() as m:
            self._add_cash_account(m, app_key, ctx, belongId)
            self._add_stock_account(m, app_key, ctx, qctx, belongId)
        self.set_longport_config(new_config_id, app_key, app_secret, access_token)
        return new_config_id

    def _insert_account_if_not_exists(self, m: AssetManagerContext, app_key: str, symbol: str, symbol_name: str, belongId: str, currency: str):
        stock_id = f"{app_key}_stock_{symbol}"

        # 确保股票账户存在（若不存在则以0初始化）
        exists = m.get_asset_by_id(stock_id)
        if not exists:
            m.add_asset({
                "id": stock_id,
                "userId": self.userId,
                "symbol": symbol,
                "type": "stock",
                "parentId": belongId,
                "description": symbol_name,
                "quantity": "0",
                "cost": "0",
                "currency": currency,
                "isActive": True
            })

    def _buy_or_sell_stock(self, m: AssetManagerContext, app_key: str, symbol: str, quantity: str, price: str, currency: str, direction: int | str, order_time: datetime):
        stock_id = f"{app_key}_stock_{symbol}"
        m.update_asset_by_transaction({
            "id": str(uuid.uuid4()),
            "userId": self.userId,
            "accountId": stock_id,
            "description": f"长桥同步买入 {symbol}" if direction == 0 else f"长桥同步卖出 {symbol}",
            "date": order_time,
            "direction": direction,
            "quantity": quantity,
            "price": price,
            "currency": currency
        })
    def _gain_or_spend_cash(self, m: AssetManagerContext, app_key: str, amount: str, currency: str, direction: int | str, order_time: datetime):
        cash_id = f"{app_key}_cash"
        m.update_asset_by_transaction({
            "id": str(uuid.uuid4()),
            "userId": self.userId,
            "accountId": cash_id,
            "description": f"长桥同步现金入账" if direction == 0 else "长桥同步现金出账",
            "date": order_time,
            "direction": direction,
            "quantity": amount,
            "price": "1.0",
            "currency": currency
        })
    
    def _sync_cash_account(self, ctx: TradeContext, m: AssetManagerContext, app_key: str):
        account_balance = ctx.account_balance()
        if not account_balance or len(account_balance) == 0:
            raise Exception("长桥API请求返回数据异常")  
        account_balance = account_balance[0]
        cash_info = account_balance.total_cash
        cash_account_id = f"{app_key}_cash"
        account = m.get_asset_by_id(cash_account_id)
        if account:
            old_quantity = Decimal(account.get('quantity', 0))
            diff = cash_info - old_quantity
            if diff != 0:
                m.update_asset_by_transaction({
                    "id": str(uuid.uuid4()),
                    "userId": self.userId,
                    "accountId": cash_account_id,
                    "description": "长桥现金余额同步修正",
                    "date": datetime.now(timezone.utc),
                    "direction": 0 if diff > 0 else 1,
                    "quantity": abs(diff),
                    "price": "1.0",
                    "currency": account_balance.currency
                })
    def _get_effective_orders(self, ctx: TradeContext, before_time: datetime):
        para = {
            "status": [OrderStatus.Filled]
        }
        orders = ctx.today_orders(**para)
        
        history_orders = ctx.history_orders(**para, start_at=before_time, end_at=datetime.now(timezone.utc))

        orders += history_orders
        # 使用资产管理器以通过交易安全更新资产
        orders.reverse()
        new_orders = []
        for order in orders:
            order_time = order.updated_at.replace(tzinfo=ZoneInfo("Asia/Shanghai"))
            if order_time and order_time > before_time:
                new_orders.append(order)
        return new_orders

    def _get_symbols_name(self, qctx: QuoteContext, orders):
        if not orders or len(orders) == 0:
            return {}
        return {x.symbol: f"{x.name_cn if x.name_cn else x.name_en}(长桥)" for x in qctx.static_info([order.symbol for order in orders])}

    def update_user_longbridge_account(self, config_id: str):
        longport_config = self.get_longport_config(config_id)
        if not longport_config or not longport_config['app_key']:
            return

        config = Config(
            app_key=longport_config['app_key'],
            app_secret=longport_config['app_secret'],
            access_token=longport_config['access_token'],
            enable_print_quote_packages=False
        )
        last_time = parse_datetime_utc8(longport_config['last_refreshed_at'])
        ctx = TradeContext(config)
        qctx = QuoteContext(config)
        orders = self._get_effective_orders(ctx, last_time)
        symbols_name = self._get_symbols_name(qctx, orders)
        # 遍历orders，处理每一笔订单
        for order in orders:
            with AssetManagerContext() as m:
                order_time = order.updated_at.replace(tzinfo=ZoneInfo("Asia/Shanghai"))

                symbol = order.symbol
                if not symbol:
                    continue

                currency = order.currency

                self._insert_account_if_not_exists(m, longport_config['app_key'], symbol, symbols_name[symbol], None, currency)

                # 生成买入股票的交易记录（通过资产管理器以更新资产与记录交易）
                quantity_str = order.quantity
                price_str = order.price
                self._buy_or_sell_stock(m, longport_config['app_key'], symbol, quantity_str, price_str, currency, 0 if order.side == OrderSide.Buy else 1, order_time)

                amount = order.price * order.quantity
                self._gain_or_spend_cash(m, longport_config['app_key'], amount, currency, 1 if order.side == OrderSide.Buy else 0, order_time)
                self.set_longport_config(config_id)

        with AssetManagerContext() as m:
            self._sync_cash_account(ctx, m, longport_config['app_key'])
        self.set_longport_config(config_id)



    # 配置管理方法
    def set_longport_config(self, config_id: str, app_key: str=None, app_secret: str=None, access_token: str=None) -> bool:
        """设置长桥证券配置
        
        Args:
            userid: 用户ID
            accountid: 账户ID
            app_key: 应用密钥
            app_secret: 应用密钥
            access_token: 访问令牌
            
        Returns:
            bool: 设置是否成功
        """
        try:
            # 获取现有配置
            existing_config = self.config_manager.get_user_config(self.userId) or {}
            longport_configs = existing_config.get('longport', {})

            # 获取当前账户配置（如果不存在则新建空字典）
            current_config = longport_configs.get(config_id, {})

            # 仅当参数不为None时才更新对应字段
            if app_key is not None:
                current_config['app_key'] = app_key

            if app_secret is not None:
                current_config['app_secret'] = app_secret

            if access_token is not None:
                current_config['access_token'] = access_token

            # 始终更新时间
            current_config['last_refreshed_at'] = datetime.now(timezone.utc).isoformat()

            # 更新账户配置
            longport_configs[config_id] = current_config

            # 更新配置
            config_data = {'longport': longport_configs}
            return self.config_manager.set_user_config(self.userId, config_data)
            
        except Exception as e:
            print(f"设置长桥配置失败: {str(e)}")
            return False
    
    def get_longport_config(self, config_id: str):
        """获取长桥证券配置
        
        Args:
            userid: 用户ID
            accountid: 账户ID，如果为None则返回所有账户配置
            
        Returns:
            Dict: 配置信息，如果accountid为None则返回所有账户的配置列表
        """
        try:
            config = self.config_manager.get_user_config(self.userId)
            if not config:
                return None
            longport_configs = config.get('longport', {})
            
            # 返回特定账户配置
            if config_id in longport_configs:
                return longport_configs[config_id]
            
            # 如果longport_configs为空或者accountid没找到，则插入新的结构
            print(f"用户 {self.userId} 的账户 {config_id} 配置不存在，创建默认配置")
            
            # 创建新的账户配置结构
            longport_configs[config_id] = {
                'app_key': '',
                'app_secret': '',
                'access_token': '',
                'last_refreshed_at': isoformat_utc8()
            }
            
            # 更新用户配置
            config_data = {'longport': longport_configs}
            if self.config_manager.update_user_config(self.userId, config_data):
                print(f"用户 {self.userId} 的账户 {config_id} 默认配置创建成功")
                return longport_configs[config_id]
            
            print(f"用户 {self.userId} 的账户 {config_id} 默认配置创建失败")
            return None
                
        except Exception as e:
            print(f"获取长桥配置失败: {str(e)}")
            return None
    
    def delete_longport_config(self, config_id: str) -> bool:
        """删除长桥证券配置
        
        Args:
            userid: 用户ID
            accountid: 账户ID，如果为None则删除该用户的所有长桥配置
            
        Returns:
            bool: 删除是否成功
        """
        try:
            config = self.config_manager.get_user_config(self.userId)
            if not config:
                return False
            
            longport_configs = config.get('longport', {})
            if config_id in longport_configs:
                del longport_configs[config_id]
            

            # 更新配置
            config_data = {'longport': longport_configs}
            return self.config_manager.update_user_config(self.userId, config_data)
            
        except Exception as e:
            print(f"删除长桥配置失败: {str(e)}")
            return False
    
    def update_access_token(self, config_id: str, access_token: str) -> bool:
        """更新访问令牌
        
        Args:
            userid: 用户ID
            accountid: 账户ID
            access_token: 新的访问令牌
            
        Returns:
            bool: 更新是否成功
        """
        try:
            config = self.config_manager.get_user_config(self.userId)
            if not config:
                return False
            
            longport_configs = config.get('longport', {})
            if config_id in longport_configs:
                config_item = longport_configs[config_id]
                config_item.update({
                    'access_token': access_token,
                    'last_refreshed_at': isoformat_utc8()
                })
                
                config_data = {'longport': longport_configs}
                return self.config_manager.update_user_config(self.userId, config_data)
            
            return False
            
        except Exception as e:
            print(f"更新访问令牌失败: {str(e)}")
            return False
    
    def get_all_longport_configs(self):
        """获取所有长桥配置
        
        Returns:
            List[Dict]: 所有长桥配置列表
        """
        try:
            config = self.config_manager.get_user_config(self.userId)
            if not config:
                return None
            longport_configs = config.get('longport', {})
            return longport_configs
            
        except Exception as e:
            print(f"获取所有长桥配置失败: {str(e)}")
            return {}
    
    def close(self):
        """关闭配置管理器"""
        if self.config_manager:
            self.config_manager.close()