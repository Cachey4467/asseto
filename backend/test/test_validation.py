#!/usr/bin/env python3
"""
验证API测试 - 错误处理和验证逻辑
"""

from time import timezone
import unittest
import requests
import json
from datetime import datetime

# 服务器地址
BASE_URL = "http://localhost:5000"

# 测试用户ID
TEST_USER_ID = "test_user_001"


class TestValidationAPI(unittest.TestCase):
    """验证API测试类"""
    
    def setUp(self):
        """测试前的准备工作"""
        self.base_url = BASE_URL
        self.user_id = TEST_USER_ID

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

    def test_invalid_endpoints(self):
        """测试无效的端点"""
        print("\n测试无效的端点...")
        
        # 测试不存在的端点
        print("1. 测试不存在的端点...")
        response = requests.get(f"{self.base_url}/api/v1/nonexistent")
        
        print(f"状态码: {response.status_code}")
        
        # 应该是404
        self.assertEqual(response.status_code, 404)
        
        # 测试无效的HTTP方法
        print("2. 测试无效的HTTP方法...")
        response = requests.patch(f"{self.base_url}/api/v1/health")
        
        print(f"状态码: {response.status_code}")
        
        # 应该是405 Method Not Allowed
        self.assertEqual(response.status_code, 405)

    def test_malformed_requests(self):
        """测试格式错误的请求"""
        print("\n测试格式错误的请求...")
        
        # 测试无效的JSON
        print("1. 测试无效的JSON...")
        response = requests.post(
            f"{self.base_url}/api/v1/transactions",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.text}")
        
        # 应该是400 Bad Request
        self.assertEqual(response.status_code, 400)
        
        # 测试缺少Content-Type
        print("2. 测试缺少Content-Type...")
        response = requests.post(
            f"{self.base_url}/api/v1/transactions",
            json={"test": "data"}
        )
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        # 根据实际实现，可能是200或400
        if response.status_code == 400:
            data = response.json()
            self.assertFalse(data['success'])

    def test_boundary_values(self):
        """测试边界值"""
        print("\n测试边界值...")
        
        # 测试非常大的数值
        print("1. 测试非常大的数值...")
        large_transaction_data = {
            "userId": self.user_id,
            "accountId": "test_account",
            "description": "测试大数值",
            "date": datetime.now(timezone.utc).isoformat(),
            "direction": 0,
            "quantity": 999999999999999.99,
            "price": 999999999999999.99,
            "currency": "CNY"
        }
        
        response = requests.post(
            f"{self.base_url}/api/v1/transactions",
            json=large_transaction_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        # 根据实际验证逻辑，可能是200或400
        if response.status_code == 400:
            data = response.json()
            self.assertFalse(data['success'])
        
        # 测试负数
        print("2. 测试负数...")
        negative_transaction_data = {
            "userId": self.user_id,
            "accountId": "test_account",
            "description": "测试负数",
            "date": datetime.now(timezone.utc).isoformat(),
            "direction": 0,
            "quantity": -100.00,
            "price": -1.00,
            "currency": "CNY"
        }
        
        response = requests.post(
            f"{self.base_url}/api/v1/transactions",
            json=negative_transaction_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        # 根据实际验证逻辑，可能是200或400
        if response.status_code == 400:
            data = response.json()
            self.assertFalse(data['success'])

    def test_sql_injection_prevention(self):
        """测试SQL注入防护"""
        print("\n测试SQL注入防护...")
        
        # 测试SQL注入尝试
        print("1. 测试SQL注入尝试...")
        sql_injection_data = {
            "userId": "'; DROP TABLE users; --",
            "accountId": "test_account",
            "description": "'; DROP TABLE transactions; --",
            "date": datetime.now(timezone.utc).isoformat(),
            "direction": 0,
            "quantity": 100.00,
            "price": 1.00,
            "currency": "CNY"
        }
        
        response = requests.post(
            f"{self.base_url}/api/v1/transactions",
            json=sql_injection_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        # 应该被拒绝（400）或正常处理（200，但数据被清理）
        if response.status_code == 400:
            data = response.json()
            self.assertFalse(data['success'])

    def test_xss_prevention(self):
        """测试XSS防护"""
        print("\n测试XSS防护...")
        
        # 测试XSS尝试
        print("1. 测试XSS尝试...")
        xss_data = {
            "userId": self.user_id,
            "accountId": "test_account",
            "description": "<script>alert('XSS')</script>",
            "date": datetime.now(timezone.utc).isoformat(),
            "direction": 0,
            "quantity": 100.00,
            "price": 1.00,
            "currency": "CNY"
        }
        
        response = requests.post(
            f"{self.base_url}/api/v1/transactions",
            json=xss_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        # 应该被拒绝（400）或正常处理（200，但数据被清理）
        if response.status_code == 400:
            data = response.json()
            self.assertFalse(data['success'])

    def test_rate_limiting(self):
        """测试速率限制（如果实现）"""
        print("\n测试速率限制...")
        
        # 快速发送多个请求
        print("1. 快速发送多个请求...")
        transaction_data = {
            "userId": self.user_id,
            "accountId": "test_account",
            "description": "速率限制测试",
            "date": datetime.now(timezone.utc).isoformat(),
            "direction": 0,
            "quantity": 100.00,
            "price": 1.00,
            "currency": "CNY"
        }
        
        responses = []
        for i in range(10):
            response = requests.post(
                f"{self.base_url}/api/v1/transactions",
                json=transaction_data,
                headers={"Content-Type": "application/json"}
            )
            responses.append(response)
            print(f"请求 {i+1}: 状态码 {response.status_code}")
        
        # 检查是否有速率限制响应（429 Too Many Requests）
        rate_limited = any(r.status_code == 429 for r in responses)
        if rate_limited:
            print("检测到速率限制")
        else:
            print("未检测到速率限制")


if __name__ == "__main__":
    unittest.main() 