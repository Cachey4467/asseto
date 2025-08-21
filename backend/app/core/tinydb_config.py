#!/usr/bin/env python3
"""
TinyDB通用配置管理器
提供基础的配置存储和管理功能
"""

from datetime import timezone
import os
import json
from typing import Dict, List, Optional, Any
from tinydb import TinyDB, Query
from tinydb.storages import JSONStorage
import threading
# from tinydb.middlewares import CachingMiddleware  # 注释掉缓存中间件


class TinyDBConfigManager:
    """TinyDB通用配置管理器"""
    
    _instances = {}  # 类变量，用于存储不同路径的实例
    
    def __new__(cls, db_path: str = None):
        """单例模式，确保相同路径的配置管理器只有一个实例"""
        if db_path is None:
            # 尝试从应用配置获取路径
            try:
                from .app_config import AppConfig
                db_path = AppConfig.TINYDB_CONFIG_PATH
            except ImportError:
                db_path = 'config.json'
        
        if db_path not in cls._instances:
            cls._instances[db_path] = super().__new__(cls)
        return cls._instances[db_path]
    
    def __init__(self, db_path: str = None):
        """初始化TinyDB配置管理器
        
        Args:
            db_path: TinyDB数据库文件路径，如果为None则使用默认路径
        """
        # 使用锁来确保线程安全
        if not hasattr(self, '_lock'):
            self._lock = threading.Lock()

        # 如果已经初始化过，直接返回
        if hasattr(self, 'db'):
            return
            
        if db_path is None:
            # 尝试从应用配置获取路径
            try:
                from .app_config import AppConfig
                db_path = AppConfig.TINYDB_CONFIG_PATH
            except ImportError:
                db_path = 'config.json'
        
        # 确保配置目录存在
        config_dir = os.path.dirname(db_path)
        if config_dir and not os.path.exists(config_dir):
            os.makedirs(config_dir)
        
        # 初始化TinyDB，不使用缓存中间件，确保数据立即写入
        self.db = TinyDB(db_path, storage=JSONStorage)

        self.user_config_table = self.db.table('user_configs')
        self.global_config_table = self.db.table('global_configs')
        self.query = Query()

    def set_global_config(self, config_data: Dict) -> bool:
        """设置全局配置
        
        将传入字典的每个键值对分别插入到global_configs表中
        如果key已存在则更新，否则创建新记录
        
        Args:
            config_data: 配置数据字典，每个key-value对将作为独立的配置项
            
        Returns:
            bool: 设置是否成功
        """
        with self._lock:
            try:
                if not config_data:
                    return True
            
                success_count = 0
                total_count = len(config_data)
            
                for key, value in config_data.items():
                    try:
                        # 检查是否已存在该配置
                        existing_config = self.global_config_table.get(self.query[key].exists())
                        
                        if existing_config:
                            # 更新现有配置
                            existing_config[key] = value
                            self.global_config_table.update(existing_config, self.query[key].exists())
                        else:
                            # 创建新配置 - 直接存储为键值对
                            new_config = {key: value}
                            self.global_config_table.insert(new_config)
                        
                        success_count += 1
                        
                    except Exception as e:
                        print(f"设置配置项 {key} 失败: {str(e)}")
                        continue
                
                print(f"全局配置设置完成: {success_count}/{total_count} 项成功")
                return success_count == total_count
                
            except Exception as e:
                print(f"设置全局配置失败: {str(e)}")
                return False
    
    def get_global_config(self, key: str) -> Optional[Any]:
        """获取全局配置
        
        Args:
            key: 配置键名
            
        Returns:
            Any: 配置值，如果不存在则返回None
        """
        with self._lock:
            try:
                config = self.global_config_table.get(self.query[key].exists())
                return config[key] if config else None
            except Exception as e:
                print(f"获取全局配置失败: {str(e)}")
                return None
    
    def delete_global_config(self, key: str) -> bool:
        """删除全局配置
        
        Args:
            key: 配置键名
            
        Returns:
            bool: 删除是否成功
        """
        with self._lock:
            try:
                removed = self.global_config_table.remove(self.query[key].exists())
                return len(removed) > 0
            except Exception as e:
                print(f"删除全局配置失败: {str(e)}")
                return False
    
    def set_user_config(self, userid: str, config_data: Dict) -> bool:
        """设置用户配置
        
        Args:
            userid: 用户ID
            config_data: 配置数据字典
            
        Returns:
            bool: 设置是否成功
        """
        with self._lock:
            try:
                # 检查是否已存在该用户的配置
                existing_config = self.user_config_table.get(self.query.userid == userid)
                
                if existing_config:
                    # 更新现有配置
                    existing_config.update(config_data)
                    self.user_config_table.update(existing_config, self.query.userid == userid)
                else:
                    # 创建新用户配置
                    new_config = {'userid': userid}
                    new_config.update(config_data)
                    print("new_config", new_config)
                    self.user_config_table.insert(new_config)
                
                return True
                
            except Exception as e:
                print(f"设置用户配置失败: {str(e)}")
                return False
    
    def get_user_config(self, userid: str) -> Optional[Dict]:
        """获取用户配置
        
        Args:
            userid: 用户ID
            
        Returns:
            Dict: 用户配置信息，如果用户不存在则自动创建默认配置
        """
        with self._lock:
            try:
                config = self.user_config_table.get(self.query.userid == userid)
                
                # 如果用户配置不存在，创建默认配置
                if config is None:
                    print(f"用户 {userid} 配置不存在，创建默认配置")
                    default_config = self._create_default_user_config(userid)
                    if self.set_user_config(userid, default_config):
                        config = self.user_config_table.get(self.query.userid == userid)
                        print(f"用户 {userid} 默认配置创建成功")
                    else:
                        print(f"用户 {userid} 默认配置创建失败")
                        return None
                
                return config
                
            except Exception as e:
                print(f"获取用户配置失败: {str(e)}")
                return None
    
    def get_all_user_ids(self) -> List[str]:
        """获取所有用户ID
        
        Returns:
            List[str]: 所有用户ID列表
        """
        with self._lock:
            try:
                all_configs = self.user_config_table.all()
                user_ids = [config.get('userid') for config in all_configs if config.get('userid')]
                return user_ids
            except Exception as e:
                print(f"获取所有用户ID失败: {str(e)}")
                return []
    
    def _create_default_user_config(self, userid: str) -> Dict:
        """创建用户默认配置
        
        Args:
            userid: 用户ID
            
        Returns:
            Dict: 默认配置字典
        """
        return {
            'userid': userid,
            'created_at': self._get_current_timestamp(),
            'updated_at': self._get_current_timestamp(),
            'settings': {
                'currency': 'CNY',
                'language': 'zh-CN',
                'timezone': 'Asia/Shanghai'
            },
            'longport': {}
        }
    
    def _get_current_timestamp(self) -> str:
        """获取当前时间戳字符串
        
        Returns:
            str: 当前时间戳字符串
        """
        from datetime import datetime
        return datetime.now(timezone.utc).isoformat()
    
    def close(self):
        """关闭数据库连接"""
        if self.db:
            self.db.close() 