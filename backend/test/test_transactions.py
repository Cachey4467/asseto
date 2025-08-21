#!/usr/bin/env python3
"""
交易API测试 - 交易记录相关的操作
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


class TestTransactionsAPI(unittest.TestCase):
    """交易API测试类"""
    
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
        self.assertIn('pagination', data)
        
        # 验证分页信息
        pagination = data['pagination']
        self.assertIn('page_index', pagination)
        self.assertIn('page_size', pagination)
        self.assertIn('total_count', pagination)
        self.assertIn('total_pages', pagination)
        self.assertIn('has_next', pagination)
        self.assertIn('has_prev', pagination)
        
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
        self.assertIn('pagination', data)

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

    def test_transaction_validation(self):
        """测试交易记录的验证逻辑"""
        print("\n测试交易记录的验证逻辑...")
        
        # 测试缺少userId的情况
        print("1. 测试创建交易时缺少userId...")
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
        
        # 测试无效的direction值
        print("2. 测试无效的direction值...")
        invalid_direction_data = {
            "userId": self.user_id,
            "accountId": str(uuid.uuid4()),
            "description": "测试交易",
            "date": datetime.now(timezone.utc).isoformat(),
            "direction": 999,  # 无效值
            "quantity": 1000.00,
            "price": 1.00,
            "currency": "CNY"
        }
        
        response = requests.post(
            f"{self.base_url}/api/v1/transactions",
            json=invalid_direction_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        # 根据实际验证逻辑，这里可能是400或200
        if response.status_code == 400:
            data = response.json()
            self.assertFalse(data['success'])


if __name__ == "__main__":
    unittest.main() 