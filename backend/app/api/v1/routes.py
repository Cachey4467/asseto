from typing_extensions import deprecated
from flask import Blueprint, request, jsonify
from datetime import datetime
from cachetools import TTLCache
import uuid
from decimal import Decimal

from app.services.longport import LongportService
from ...models import AssetManagerContext
from ...core.database import Database, AccountManager, TransactionManager, ForeignExchangeRateManager, PriceTracingManager
from ...util.get_currency_rate import convert_currency_amount
from ...util.time_utils import isoformat_utc8, format_datetime_with_timezone
from ...services.price_fetch import PriceFetcher

# Create blueprint
api_bp = Blueprint('api', __name__)

price_fetcher = PriceFetcher()  # 初始化价格获取器

@api_bp.route('/assets/add', methods=['POST'])
def add_asset():
    """新增一个资产项目"""
    try:
        data = request.get_json()
        
        # 验证必需字段
        required_fields = ['type', 'description', 'quantity', 'remain_cost', 'currency', 'symbol', 'userId']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'缺少必需字段: {field}'
                }), 400

        # 新增资产时，quantity和remain_cost只能为0
        asset_id = str(uuid.uuid4())
        asset_data = {
            'id': asset_id,
            'type': data['type'],
            'belong_id': data.get('belong_id', ''),
            'description': data['description'],
            'quantity': 0,
            'cost': 0,
            'currency': data['currency'],
            'symbol': data['symbol'],
            'userId': data['userId']
        }

        # 强制使用事务上下文，保证创建资产与首笔交易一致性
        if data['type'] != 'group':
            transaction_data = {
                'id': str(uuid.uuid4()),
                'userId': data['userId'],
                'accountId': asset_id,
                'description': f"新建资产自动买入",
                'date': format_datetime_with_timezone(),
                'direction': 'buy',
                'quantity': data['quantity'],
                'price': data['remain_cost'],
                'currency': data['currency']
            }

            with AssetManagerContext() as m:
                m.add_asset(asset_data)
                m.update_asset_by_transaction(transaction_data)
        else:
            # group 类型仅创建账户（事务内写）
            with AssetManagerContext() as m:
                m.add_asset(asset_data)

        # 返回新资产和交易信息
        return jsonify({
            'success': True,
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@api_bp.route('/assets/info', methods=['GET'])
def get_assets():
    """获取指定用户的所有资产和负债"""
    try:
        userId = request.args.get('userId')
        if not userId:
            return jsonify({
                'success': False,
                'error': '缺少必需参数: userId'
            }), 400

        # 获取资产
        with AssetManagerContext() as m:
            assets = m.get_all_assets(userId)
        return jsonify({
            'success': True,
            'data': assets
        }), 200
    except Exception as e:
        print(e)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@deprecated('use /assets/info instead')
@api_bp.route('/assets/prices', methods=['GET'])
def get_asset_prices():
    """获取指定用户资产的当前价格"""
    try:
        userId = request.args.get('userId')
        if not userId:
            return jsonify({
                'success': False,
                'error': '缺少必需参数: userId'
            }), 400
        
        # 获取指定用户的所有资产
        with AssetManagerContext() as m:
            assets = m.get_all_assets(userId)
        
        # 使用价格获取器获取实时价格
        prices = price_fetcher.get_price(assets)
        
        return jsonify({
            'success': True,
            'data': prices
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@api_bp.route('/assets/del', methods=['POST'])
def delete_asset():
    """删除资产项目"""
    try:
        data = request.get_json()
        
        if 'id' not in data or 'userId' not in data:
            return jsonify({
                'success': False,
                'error': '缺少必需字段: symbol 或 userId'
            }), 400
        
        id = data['id']
        userId = data['userId']
        
        # 删除资产（上下文中执行）
        with AssetManagerContext() as m:
            success = m.delete_asset(userId, id)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'资产 {id} 删除成功'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': f'资产 {id} 不存在或删除失败'
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@api_bp.route('/assets/update', methods=['PUT'])
def update_asset():
    """更新资产项目"""
    try:
        data = request.get_json()
        
        required = {'id', 'userId'}
        if not required.issubset(data):
            return jsonify({
                'success': False,
                'error': f'缺少必需字段: {required}'
            }), 400
        
        id = data['id']
        userId = data['userId']
        
        not_allowed = {'quantity', 'cost', 'currency', 'symbol'}
        if data.keys() & not_allowed:
            return jsonify({
                'success': False,
                'error': f'不允许修改 {data.keys() & not_allowed} 字段'
            }), 400
        
        
        # 更新资产（上下文中执行）
        with AssetManagerContext() as m:
            success = m.update_asset(userId, id, data)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'资产 {id} 更新成功'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': f'资产 {id} 更新失败'
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
# 数据库相关API接口
@api_bp.route('/transactions', methods=['GET'])
def get_transactions():
    """获取指定用户的交易记录，支持按账户ID和日期范围过滤，支持分页"""
    try:
        userId = request.args.get('userId')
        if not userId:
            return jsonify({
                'success': False,
                'error': '缺少必需参数: userId'
            }), 400
        
        accountId = request.args.get('accountId')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # 分页参数验证
        try:
            page_index = int(request.args.get('page_index', 0))
            page_size = int(request.args.get('page_size', 20))
        except ValueError:
            return jsonify({
                'success': False,
                'error': 'page_index和page_size必须是有效的整数'
            }), 400
        
        # 验证分页参数范围
        if page_index < 0:
            return jsonify({
                'success': False,
                'error': 'page_index必须大于等于0'
            }), 400
        
        if page_size < 1 or page_size > 1000:
            return jsonify({
                'success': False,
                'error': 'page_size必须在1到1000之间'
            }), 400
        
        # 验证日期格式
        if start_date:
            try:
                datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'start_date格式错误，请使用ISO格式 (YYYY-MM-DDTHH:MM:SS)'
                }), 400
        
        if end_date:
            try:
                datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'end_date格式错误，请使用ISO格式 (YYYY-MM-DDTHH:MM:SS)'
                }), 400
        
        # 统一使用get_transactions_by_user方法，accountId作为可选参数
        with Database() as db:
            result = TransactionManager(db).get_transactions_by_user(
                userId=userId,
                accountId=accountId,
                start_date=start_date,
                end_date=end_date,
                page_index=page_index,
                page_size=page_size
            )

        
        return jsonify({
            'success': True,
            'data': result['transactions'],
            'pagination': result['pagination']
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@api_bp.route('/transactions', methods=['POST'])
def create_transaction():
    """创建新交易记录"""
    try:
        data = request.get_json()
        
        # 验证必需字段
        required_fields = ['userId', 'accountId', 'direction', 'quantity', 'price', 'currency']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'缺少必需字段: {field}'
                }), 400
        
        # 验证direction字段
        if data['direction'] not in [0, 1]:
            return jsonify({
                'success': False,
                'error': 'direction字段必须是0（入账）或1（出账）'
            }), 400
        
        # 生成交易ID
        transaction_id = str(uuid.uuid4())
        transaction_data = {
            'id': transaction_id,
            'userId': data['userId'],
            'accountId': data['accountId'],
            'description': data.get('description'),
            'date': data.get('date', format_datetime_with_timezone()),
            'direction': data['direction'],
            'quantity': str(data['quantity']),  # 转换为字符串
            'price': str(data['price']),    # 转换为字符串
            'currency': data['currency']
        }
        
        # 根据交易记录更新资产信息（强制使用上下文）
        with AssetManagerContext() as m:
            m.update_asset_by_transaction(transaction_data)

        return jsonify({
            'success': True,
            'data': transaction_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@api_bp.route('/transactions/<transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    """删除交易记录"""
    try:
        # 从查询参数获取userId
        userId = request.args.get('userId')
        if not userId:
            return jsonify({
                'success': False,
                'error': '缺少必需参数: userId'
            }), 400
        
        with Database() as db:
            success = TransactionManager(db).delete_transaction(transaction_id, userId)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'交易记录 {transaction_id} 删除成功'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': f'交易记录 {transaction_id} 不存在或不属于该用户'
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@api_bp.route('/get_price_tracing', methods=['GET'])
def get_price_tracing():
    """获取指定账户的价格追踪数据"""
    try:
        account_id = request.args.get('accountId')
        
        # 验证必需参数
        if not account_id:
            return jsonify({
                'success': False,
                'error': '缺少必需参数: accountId'
            }), 400
        
        # 获取价格追踪数据
        with Database() as db:
            price_tracing_raw = PriceTracingManager(db).get_price_tracing(account_id)
            
            # 转换为简化的格式（只包含date和price）
            price_tracing = []
            for item in price_tracing_raw:
                price_tracing.append({
                    'date': item['date'],
                    'price': item['price']
                })
        return jsonify({
            'success': True,
            'data': {
                'accountId': account_id,
                'price_tracing': price_tracing
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@api_bp.route('/get_foreign_currency_rate', methods=['GET'])
def get_foreign_currency_rate():
    """获取外汇汇率转换"""
    try:
        from_currency = request.args.get('from_currency')
        to_currency = request.args.get('to_currency')
        date = request.args.get('date')  # 可选参数，格式：YYYY-MM-DD
        amount = request.args.get('amount', '1')  # 可选参数，默认为1
        
        # 验证必需参数
        if not from_currency or not to_currency:
            return jsonify({
                'success': False,
                'error': '缺少必需参数: from_currency 或 to_currency'
            }), 400
        
        # 验证货币代码
        valid_currencies = ["CNY", "USD", "HKD"]
        if from_currency not in valid_currencies or to_currency not in valid_currencies:
            return jsonify({
                'success': False,
                'error': f'无效的货币代码，支持的货币: {", ".join(valid_currencies)}'
            }), 400
        
        # 验证日期格式（如果提供）
        if date:
            try:
                datetime.strptime(date, '%Y-%m-%d')
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': '日期格式错误，请使用 YYYY-MM-DD 格式'
                }), 400
        
        # 验证金额格式
        try:
            amount_decimal = Decimal(amount)
        except (ValueError, TypeError):
            return jsonify({
                'success': False,
                'error': '金额格式错误'
            }), 400
        
        # 执行货币转换
        try:
            with Database() as db:
                converted_amount = convert_currency_amount(
                    amount_decimal,
                    from_currency,
                    to_currency,
                    date,
                    ForeignExchangeRateManager(db)
                )
            
            return jsonify({
                'success': True,
                'data': {
                    'from_currency': from_currency,
                    'to_currency': to_currency,
                    'original_amount': str(amount_decimal),
                    'converted_amount': str(converted_amount)
                }
            }), 200
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'货币转换失败: {str(e)}'
            }), 500
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@api_bp.route('/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        'success': True,
        'message': '后端服务运行正常',
        'timestamp': isoformat_utc8()
    }), 200
