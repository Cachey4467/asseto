#!/usr/bin/env python3
"""
资产API测试 - 资产相关的CRUD操作
"""

import unittest
import requests
import json

# 服务器地址
BASE_URL = "http://localhost:5000"

# 测试用户ID
TEST_USER_ID = "test_user_001"


class TestAssetsAPI(unittest.TestCase):
    """资产API测试类"""
    
    def setUp(self):
        """测试前的准备工作"""
        self.base_url = BASE_URL
        self.user_id = TEST_USER_ID
        self.created_assets = []
        
    def tearDown(self):
        """测试后的清理工作"""
        # 清理创建的测试资产
        for symbol in self.created_assets:
            try:
                delete_data = {
                    "symbol": symbol,
                    "userId": self.user_id
                }
                requests.post(
                    f"{self.base_url}/api/v1/assets/del",
                    json=delete_data,
                    headers={"Content-Type": "application/json"}
                )
            except:
                pass

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
        
        # 记录创建的资产
        self.created_assets.append("TEST001")

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
            self.created_assets.append("TEST_UPDATE")
            
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
        
        # 先添加一个资产用于删除测试
        asset_data = {
            "type": "asset",
            "belong_id": self.user_id,
            "description": "待删除的测试资产",
            "quantity": 50,
            "remain_cost": 500000,
            "currency": "CNY",
            "symbol": "TEST_DELETE",
            "userId": self.user_id
        }
        
        add_response = requests.post(
            f"{self.base_url}/api/v1/assets/add",
            json=asset_data,
            headers={"Content-Type": "application/json"}
        )
        
        if add_response.status_code == 200:
            delete_data = {
                "symbol": "TEST_DELETE",
                "userId": self.user_id
            }
            
            response = requests.post(
                f"{self.base_url}/api/v1/assets/del",
                json=delete_data,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"状态码: {response.status_code}")
            print(f"响应: {response.json()}")
            
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertTrue(data['success'])

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


if __name__ == "__main__":
    unittest.main() 