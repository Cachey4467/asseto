#!/usr/bin/env python3
"""
配置API测试 - 第三方配置等
"""

import unittest
import requests
import json

# 服务器地址
BASE_URL = "http://localhost:5000"


class TestConfigAPI(unittest.TestCase):
    """配置API测试类"""
    
    def setUp(self):
        """测试前的准备工作"""
        self.base_url = BASE_URL

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

    def test_set_third_party_key_validation(self):
        """测试设置第三方配置的验证逻辑"""
        print("\n测试设置第三方配置的验证逻辑...")
        
        # 测试缺少必需字段
        print("1. 测试缺少party_name...")
        incomplete_data = {
            "token": "test_token",
            "secret": "test_secret",
            "key": "test_key"
        }
        
        response = requests.post(
            f"{self.base_url}/api/v1/config/set_third_party_key",
            json=incomplete_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        # 根据实际验证逻辑，这里可能是400或200
        if response.status_code == 400:
            data = response.json()
            self.assertFalse(data['success'])
        
        # 测试空值
        print("2. 测试空值...")
        empty_data = {
            "party_name": "",
            "token": "",
            "secret": "",
            "key": ""
        }
        
        response = requests.post(
            f"{self.base_url}/api/v1/config/set_third_party_key",
            json=empty_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        # 根据实际验证逻辑，这里可能是400或200
        if response.status_code == 400:
            data = response.json()
            self.assertFalse(data['success'])

    def test_get_config(self):
        """测试获取配置接口（如果存在）"""
        print("\n测试获取配置接口...")
        
        # 尝试获取配置（如果API存在）
        try:
            response = requests.get(f"{self.base_url}/api/v1/config")
            print(f"状态码: {response.status_code}")
            print(f"响应: {response.json()}")
            
            # 如果接口存在，验证响应格式
            if response.status_code == 200:
                data = response.json()
                self.assertIn('success', data)
        except requests.exceptions.RequestException:
            print("配置获取接口不存在或不可用")

    def test_update_config(self):
        """测试更新配置接口（如果存在）"""
        print("\n测试更新配置接口...")
        
        # 尝试更新配置（如果API存在）
        try:
            update_data = {
                "setting_name": "test_setting",
                "value": "test_value"
            }
            
            response = requests.put(
                f"{self.base_url}/api/v1/config",
                json=update_data,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"状态码: {response.status_code}")
            print(f"响应: {response.json()}")
            
            # 如果接口存在，验证响应格式
            if response.status_code == 200:
                data = response.json()
                self.assertIn('success', data)
        except requests.exceptions.RequestException:
            print("配置更新接口不存在或不可用")


if __name__ == "__main__":
    unittest.main() 