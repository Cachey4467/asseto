#!/usr/bin/env python3
"""
长桥账户同步定时任务模块
"""

import schedule
import logging
from app.core.tinydb_config import TinyDBConfigManager
from app.services.longport import LongportService

logger = logging.getLogger(__name__)

def _sync_all_user_longport_accounts():
    """同步所有用户的长桥账户"""
    try:
        # 获取配置管理器
        config_manager = TinyDBConfigManager()
        
        # 获取所有用户ID
        user_ids = config_manager.get_all_user_ids()
        
        if not user_ids:
            logger.info("没有找到用户，跳过长桥账户同步")
            return
        
        logger.info(f"开始同步 {len(user_ids)} 个用户的长桥账户...")
        
        # 遍历每个用户
        for user_id in user_ids:
            try:
                logger.info(f"同步用户 {user_id} 的长桥账户...")
                
                # 创建LongportService实例
                longport_service = LongportService(user_id)
                
                # 获取该用户的所有长桥配置
                longport_configs = longport_service.get_all_longport_configs()
                
                if not longport_configs:
                    logger.info(f"用户 {user_id} 没有长桥配置，跳过")
                    continue
                
                # 遍历每个配置ID并更新账户
                for config_id in longport_configs.keys():
                    try:
                        logger.debug(f"更新用户 {user_id} 的配置 {config_id}")
                        longport_service.update_user_longbridge_account(config_id)
                        logger.info(f"用户 {user_id} 的配置 {config_id} 更新成功")
                    except Exception as e:
                        logger.error(f"更新用户 {user_id} 的配置 {config_id} 失败: {e}")
                        continue
                
                logger.info(f"用户 {user_id} 的长桥账户同步完成")
                
            except Exception as e:
                logger.error(f"同步用户 {user_id} 的长桥账户时发生错误: {e}")
                continue
        
        logger.info("所有用户的长桥账户同步完成")
        
    except Exception as e:
        logger.error(f"同步长桥账户时发生错误: {e}")

def sync_all_user_longport_accounts():
    """同步所有用户的长桥账户"""
    logger.info("开始同步所有用户的长桥账户...")
    
    try:
        _sync_all_user_longport_accounts()
    except Exception as e:
        logger.error(f"同步长桥账户时发生错误: {e}")

def setup_longport_sync_scheduler():
    """设置长桥账户同步定时任务"""
    logger.info("设置长桥账户同步定时任务...")
    
    # 每1分钟执行一次
    schedule.every(1).minutes.do(sync_all_user_longport_accounts)
    
    logger.info("长桥账户同步定时任务设置完成，每1分钟执行一次")
