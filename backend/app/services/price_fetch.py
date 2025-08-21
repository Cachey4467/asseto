from typing import List, Dict, Optional
from longport.openapi import QuoteContext, Config
from ..core.tinydb_config import TinyDBConfigManager


class PriceFetcher:
    """价格获取器，负责获取价格信息"""
    
    def __init__(self):
        self.config_manager = TinyDBConfigManager()
    
    def get_price(self, assets: List[Dict]) -> List[Dict]:
        """获取价格"""
        try:
            # 从全局配置获取LongPort API配置
            app_key = self.config_manager.get_global_config('longport_app_key')
            app_secret = self.config_manager.get_global_config('longport_app_secret')
            access_token = self.config_manager.get_global_config('longport_access_token')

            if not all([app_key, app_secret, access_token]):
                raise Exception("LongPort API配置不完整，请先设置app_key、app_secret和access_token")
            
            # 创建LongPort配置
            config = Config(
                app_key=app_key,
                app_secret=app_secret,
                access_token=access_token,
                enable_print_quote_packages=False
            )
            
            # 创建QuoteContext
            ctx = QuoteContext(config)
            
            # 提取所有股票代码
            symbols = []
            for asset in assets:
                if asset.get('type') == 'stock' and asset.get('symbol'):
                    symbols.append(asset['symbol'])
            
            if not symbols:
                return []
            
            # 获取实时报价
            resp = ctx.quote(symbols)
            
            # 处理返回的价格数据
            prices = []
            for asset in assets:
                if asset.get('type') == 'stock' and asset.get('symbol'):
                    symbol = asset['symbol']
                    # 在resp中查找对应的价格信息
                    for quote in resp:
                        if quote.symbol == symbol:
                            prices.append({
                                'id': asset.get('id'),
                                'current_price': quote.last_done,
                                'currency': asset.get('currency', 'CNY'),
                            })
                            break
                else:
                    prices.append({
                        'id': asset.get('id'),
                        'current_price': asset.get('remain_cost', 0),
                        'currency': asset.get('currency', 'CNY'),
                    })
            
            return prices
            
        except Exception as e:
            print(f"获取价格失败: {str(e)}")
            # 返回默认价格
            return [{
                'id': asset.get('id'),
                'current_price': asset.get('remain_cost', 0),
                'currency': asset.get('currency', 'CNY')
            } for asset in assets]
    
    def get_price_of_symbols(self, symbols: dict[str]) -> Optional[float]:
        """根据股票代码获取价格"""
        try:
            # 从全局配置获取LongPort API配置
            app_key = self.config_manager.get_global_config('longport_app_key')
            app_secret = self.config_manager.get_global_config('longport_app_secret')
            access_token = self.config_manager.get_global_config('longport_access_token')
            
            if not all([app_key, app_secret, access_token]):
                raise Exception("LongPort API配置不完整，请先设置app_key、app_secret和access_token")
            
            # 创建LongPort配置
            config = Config(
                app_key=app_key,
                app_secret=app_secret,
                access_token=access_token,
                enable_print_quote_packages=False
            )
            
            # 创建QuoteContext
            ctx = QuoteContext(config)
            
            # 获取实时报价
            resp = ctx.quote(symbols)
            
            # 返回价格
            if resp and len(resp) > 0:
                return {item.symbol: item.last_done for item in resp}
            
            return None
            
        except Exception as e:
            print(f"获取股票 {symbols} 价格失败: {str(e)}")
            return None
    
    def set_longport_config(self, app_key: str, app_secret: str, access_token: str) -> bool:
        """设置LongPort API配置
        
        Args:
            app_key: 应用密钥
            app_secret: 应用密钥
            access_token: 访问令牌
            
        Returns:
            bool: 设置是否成功
        """
        try:
            config_data = {
                'longport_app_key': app_key,
                'longport_app_secret': app_secret,
                'longport_access_token': access_token
            }
            return self.config_manager.set_global_config(config_data)
        except Exception as e:
            print(f"设置LongPort配置失败: {str(e)}")
            return False
    
    def get_longport_config(self) -> Dict:
        """获取LongPort API配置
        
        Returns:
            Dict: 配置信息
        """
        try:
            return {
                'app_key': self.config_manager.get_global_config('longport_app_key'),
                'app_secret': self.config_manager.get_global_config('longport_app_secret'),
                'access_token': self.config_manager.get_global_config('longport_access_token')
            }
        except Exception as e:
            print(f"获取LongPort配置失败: {str(e)}")
            return {}