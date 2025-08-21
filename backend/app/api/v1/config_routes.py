#!/usr/bin/env python3
"""
配置管理API路由
"""

from flask import Blueprint, request, jsonify
from app.core.database import Database
from app.services.longport import LongportService
from app.util.time_utils import isoformat_utc8, format_datetime_utc8

config_bp = Blueprint('config', __name__)

@config_bp.route('/longport/add', methods=['POST'])
def add_longport_config():
    """添加长桥证券API配置"""
    try:
        data = request.get_json()
        
        # 验证必需参数
        required_fields = ['userId', 'LONGPORT_APP_KEY', 'LONGPORT_APP_SECRET', 'LONGPORT_ACCESS_TOKEN', 'belong_id']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'error': f'缺少必需参数: {field}'
                }), 400
        # 初始化长桥服务
        # 保存配置
        longport_service = LongportService(data['userId'])
        config_id = longport_service.init_user_longbridge_account(
            belongId=data['belong_id'],
            app_key=data['LONGPORT_APP_KEY'],
            app_secret=data['LONGPORT_APP_SECRET'], 
            access_token=data['LONGPORT_ACCESS_TOKEN']
        )
        
        if not config_id:
            return jsonify({
                'success': False,
                'error': '保存配置失败'
            }), 500


        return jsonify({
            'success': True,
            'data': {
                'message': '长桥证券API配置添加成功',
                'userId': data['userId'],
                'config_id': config_id
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'添加配置失败: {str(e)}'
        }), 500

@config_bp.route('/longport/delete', methods=['DELETE'])
def delete_longport_config():
    """删除长桥证券API配置"""
    try:
        userId = request.args.get('userId')
        config_id = request.args.get('config_id')  # 可选参数，如果不提供则删除所有账户配置
        
        if not userId:
            return jsonify({
                'success': False,
                'error': '缺少必需参数: userId'
            }), 400
        
        # 初始化长桥服务
        longport_service = LongportService(userId)
        
        # 删除配置
        success = longport_service.delete_longport_config(config_id)
        
        if success:
            return jsonify({
                'success': True,
                'data': {
                    'message': '长桥证券API配置删除成功',
                    'userId': userId,
                    'config_id': config_id,
                    'timestamp': isoformat_utc8()
                }
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': '删除配置失败：未找到相关配置'
            }), 404
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'删除配置失败: {str(e)}'
        }), 500

@config_bp.route('/list', methods=['GET'])
def list_user_configs():
    """获取用户所有配置"""
    try:
        userId = request.args.get('userId')
        
        if not userId:
            return jsonify({
                'success': False,
                'error': '缺少必需参数: userId'
            }), 400
        
        # 初始化长桥服务
        longport_service = LongportService(userId)
        
        # 获取配置
        configs = longport_service.get_all_longport_configs()
        
        if configs is None:
            return jsonify({
                'success': False,
                'error': '未找到相关配置'
            }), 404
        
        return jsonify({
            'success': True,
            'data': {
                'configs': configs,
                'timestamp': isoformat_utc8()
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'获取配置列表失败: {str(e)}'
        }), 500

@config_bp.route('/longport/update_token', methods=['PUT'])
def update_access_token():
    """更新长桥证券访问令牌"""
    try:
        data = request.get_json()
        
        # 验证必需参数
        required_fields = ['userId', 'config_id', 'access_token']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'error': f'缺少必需参数: {field}'
                }), 400
        
        # 初始化长桥服务
        longport_service = LongportService(data['userId'])
        
        # 更新访问令牌
        success = longport_service.update_access_token(
            config_id=data['config_id'],
            access_token=data['access_token']
        )
        
        if not success:
            return jsonify({
                'success': False,
                'error': '更新访问令牌失败：未找到相关配置'
            }), 404

        return jsonify({
            'success': True,
            'data': {
                'message': '访问令牌更新成功',
                'userId': data['userId'],
                'config_id': data['config_id'],
                'timestamp': isoformat_utc8()
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'更新访问令牌失败: {str(e)}'
        }), 500 