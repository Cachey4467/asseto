#!/usr/bin/env python3
"""
API测试脚本 - 使用unittest框架
"""

from time import timezone
import unittest
import requests
import json
import uuid
from datetime import datetime

# 服务器地址
BASE_URL = "http://localhost:5000"

# 测试用户ID
TEST_USER_ID = "test_user_001"


class TestAPI(unittest.TestCase):
    """API测试类"""
    
    def setUp(self):
        """测试前的准备工作"""
        self.base_url = BASE_URL
        self.user_id = TEST_USER_ID
        self.created_transaction_ids = []
        
    def tearDown(self):
        """测试后的清理工作"""
        # 清理创建的测试数据
        if self.created_transaction_ids:
            for transaction_id in self.created_transaction_ids:
                try:
                    requests.delete(f"{self.base_url}/api/v1/transactions/{transaction_id}?userId={self.user_id}")
                except:
                    pass

    def test_health_check(self):
        """测试健康检查接口"""
        print("\n测试健康检查接口...")
        response = requests.get(f"{self.base_url}/api/v1/health")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('message', data)
        self.assertIn('timestamp', data)
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {data}")

    def test_add_asset(self):
        """测试添加资产接口"""
        print("\n测试添加资产接口...")
        
        asset_data = {
            "type": "asset",
            "belong_id": self.user_id,
            "description": "测试房产",
            "quantity": 100,
            "remain_cost": 1500000,
            "currency": "CNY",
            "symbol": "TEST001",
            "userId": self.user_id
        }
        
        response = requests.post(
            f"{self.base_url}/api/v1/assets/add",
            json=asset_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('data', data)

    def test_get_assets(self):
        """测试获取资产列表接口"""
        print("\n测试获取资产列表接口...")
        response = requests.get(f"{self.base_url}/api/v1/assets/info?userId={self.user_id}")
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('data', data)

    def test_get_prices(self):
        """测试获取价格接口"""
        print("\n测试获取价格接口...")
        response = requests.get(f"{self.base_url}/api/v1/assets/prices?userId={self.user_id}")
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('data', data)

    def test_update_asset(self):
        """测试更新资产接口"""
        print("\n测试更新资产接口...")
        
        # 先添加一个资产
        asset_data = {
            "type": "asset",
            "belong_id": self.user_id,
            "description": "测试房产",
            "quantity": 100,
            "remain_cost": 1500000,
            "currency": "CNY",
            "symbol": "TEST_UPDATE",
            "userId": self.user_id
        }
        
        add_response = requests.post(
            f"{self.base_url}/api/v1/assets/add",
            json=asset_data,
            headers={"Content-Type": "application/json"}
        )
        
        if add_response.status_code == 200:
            # 更新资产
            update_data = {
                "symbol": "TEST_UPDATE",
                "userId": self.user_id,
                "description": "更新后的房产描述",
                "quantity": 150
            }
            
            response = requests.put(
                f"{self.base_url}/api/v1/assets/update",
                json=update_data,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"状态码: {response.status_code}")
            print(f"响应: {response.json()}")
            
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertTrue(data['success'])

    def test_delete_asset(self):
        """测试删除资产接口"""
        print("\n测试删除资产接口...")
        
        delete_data = {
            "symbol": "TEST001",
            "userId": self.user_id
        }
        
        response = requests.post(
            f"{self.base_url}/api/v1/assets/del",
            json=delete_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        # 删除操作可能成功也可能失败（取决于资产是否存在）
        if response.status_code == 200:
            data = response.json()
            self.assertTrue(data['success'])

    def test_set_third_party_key(self):
        """测试设置第三方配置接口"""
        print("\n测试设置第三方配置接口...")
        
        config_data = {
            "party_name": "longbridge",
            "token": "test_token",
            "secret": "test_secret",
            "key": "test_key"
        }
        
        response = requests.post(
            f"{self.base_url}/api/v1/config/set_third_party_key",
            json=config_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])

    def test_create_transaction(self):
        """测试创建交易记录接口"""
        print("\n测试创建交易记录接口...")
        
        # 使用一个模拟的账户ID进行测试
        mock_account_id = str(uuid.uuid4())
        
        transaction_data = {
            "userId": self.user_id,
            "accountId": mock_account_id,
            "description": "测试交易",
            "date": datetime.now(timezone.utc).isoformat(),
            "direction": 0,  # 0=入账
            "quantity": 1000.00,
            "price": 1.00,
            "currency": "CNY"
        }
        
        response = requests.post(
            f"{self.base_url}/api/v1/transactions",
            json=transaction_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('data', data)
        self.assertIn('id', data['data'])
        
        # 保存创建的交易ID
        self.created_transaction_ids.append(data['data']['id'])

    def test_create_multiple_transactions(self):
        """测试创建多个交易记录"""
        print("\n测试创建多个交易记录...")
        
        # 使用一个模拟的账户ID进行测试
        mock_account_id = str(uuid.uuid4())
        
        transactions = [
            {
                "userId": self.user_id,
                "accountId": mock_account_id,
                "description": "工资收入",
                "date": "2024-01-15T09:00:00",
                "direction": 0,  # 入账
                "quantity": 5000.00,
                "price": 1.00,
                "currency": "CNY"
            },
            {
                "userId": self.user_id,
                "accountId": mock_account_id,
                "description": "购物支出",
                "date": "2024-01-16T14:30:00",
                "direction": 1,  # 出账
                "quantity": 200.00,
                "price": 1.00,
                "currency": "CNY"
            },
            {
                "userId": self.user_id,
                "accountId": mock_account_id,
                "description": "投资收入",
                "date": "2024-01-17T16:00:00",
                "direction": 0,  # 入账
                "quantity": 300.00,
                "price": 1.00,
                "currency": "CNY"
            }
        ]
        
        for i, transaction_data in enumerate(transactions):
            print(f"创建第{i+1}个交易记录...")
            response = requests.post(
                f"{self.base_url}/api/v1/transactions",
                json=transaction_data,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"状态码: {response.status_code}")
            print(f"响应: {response.json()}")
            
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertTrue(data['success'])
            
            if data['success']:
                self.created_transaction_ids.append(data['data']['id'])
        
        print(f"成功创建了 {len(self.created_transaction_ids)} 个交易记录")

    def test_get_transactions(self):
        """测试获取交易记录接口"""
        # 先创建一些交易记录
        self.test_create_multiple_transactions()
        
        print("\n测试获取交易记录接口...")
        
        # 测试按用户ID查询
        print("1. 测试按用户ID查询交易记录...")
        response = requests.get(f"{self.base_url}/api/v1/transactions?userId={self.user_id}")
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('data', data)
        
        # 测试按用户ID和日期范围查询
        print("2. 测试按用户ID和日期范围查询交易记录...")
        start_date = "2024-01-01T00:00:00"
        end_date = "2024-12-31T23:59:59"
        response = requests.get(f"{self.base_url}/api/v1/transactions?userId={self.user_id}&start_date={start_date}&end_date={end_date}")
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])

    def test_delete_transaction(self):
        """测试删除交易记录接口"""
        # 先创建一个交易记录
        self.test_create_transaction()
        
        if not self.created_transaction_ids:
            self.skipTest("没有可用的交易ID进行删除测试")
        
        print("\n测试删除交易记录接口...")
        
        transaction_id = self.created_transaction_ids[0]
        response = requests.delete(f"{self.base_url}/api/v1/transactions/{transaction_id}?userId={self.user_id}")
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        
        # 从列表中移除已删除的交易ID
        self.created_transaction_ids.pop(0)

    def test_error_cases(self):
        """测试错误情况"""
        print("\n测试错误情况...")
        
        # 测试缺少userId的情况
        print("1. 测试缺少userId参数...")
        response = requests.get(f"{self.base_url}/api/v1/transactions")
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data['success'])
        self.assertIn('error', data)
        
        # 测试无效的userId
        print("2. 测试无效的userId...")
        response = requests.get(f"{self.base_url}/api/v1/transactions?userId=")
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data['success'])
        
        # 测试创建交易时缺少userId
        print("3. 测试创建交易时缺少userId...")
        transaction_data = {
            "accountId": "invalid_account",
            "description": "测试交易",
            "date": datetime.now(timezone.utc).isoformat(),
            "direction": 0,
            "quantity": 1000.00,
            "price": 1.00,
            "currency": "CNY"
        }
        
        response = requests.post(
            f"{self.base_url}/api/v1/transactions",
            json=transaction_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data['success'])
        self.assertIn('error', data)

    def test_asset_validation(self):
        """测试资产接口的验证逻辑"""
        print("\n测试资产接口的验证逻辑...")
        
        # 测试缺少必需字段
        print("1. 测试添加资产时缺少必需字段...")
        incomplete_data = {
            "type": "asset",
            "description": "测试房产",
            "quantity": 100
            # 缺少 remain_cost, currency, symbol, userId
        }
        
        response = requests.post(
            f"{self.base_url}/api/v1/assets/add",
            json=incomplete_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data['success'])
        self.assertIn('error', data)
        
        # 测试无效的资产类型
        print("2. 测试无效的资产类型...")
        invalid_type_data = {
            "type": "invalid_type",
            "belong_id": self.user_id,
            "description": "测试房产",
            "quantity": 100,
            "remain_cost": 1500000,
            "currency": "CNY",
            "symbol": "TEST_INVALID",
            "userId": self.user_id
        }
        
        response = requests.post(
            f"{self.base_url}/api/v1/assets/add",
            json=invalid_type_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data['success'])
        self.assertIn('error', data)


def run_tests():
    """运行所有测试"""
    print("开始API测试...")
    print("=" * 50)
    
    # 创建测试套件
    suite = unittest.TestLoader().loadTestsFromTestCase(TestAPI)
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # 输出测试结果摘要
    print("\n" + "=" * 50)
    print("测试结果摘要:")
    print(f"运行测试数: {result.testsRun}")
    print(f"失败数: {len(result.failures)}")
    print(f"错误数: {len(result.errors)}")
    print(f"跳过数: {len(result.skipped)}")
    
    if result.failures:
        print("\n失败的测试:")
        for test, traceback in result.failures:
            print(f"- {test}: {traceback}")
    
    if result.errors:
        print("\n错误的测试:")
        for test, traceback in result.errors:
            print(f"- {test}: {traceback}")
    
    return result.wasSuccessful()


if __name__ == "__main__":
    try:
        success = run_tests()
        if success:
            print("\n所有测试通过！")
        else:
            print("\n部分测试失败！")
    except requests.exceptions.ConnectionError:
        print("错误: 无法连接到服务器，请确保后端服务正在运行")
    except Exception as e:
        print(f"测试过程中出现错误: {e}") 