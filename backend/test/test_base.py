#!/usr/bin/env python3
"""
基础API测试 - 健康检查等基础功能
"""

import unittest
import requests

# 服务器地址
BASE_URL = "http://localhost:5000"


class TestBaseAPI(unittest.TestCase):
    """基础API测试类"""
    
    def setUp(self):
        """测试前的准备工作"""
        self.base_url = BASE_URL

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

    def test_server_connectivity(self):
        """测试服务器连接性"""
        print("\n测试服务器连接性...")
        try:
            response = requests.get(f"{self.base_url}/api/v1/health", timeout=5)
            self.assertEqual(response.status_code, 200)
            print("服务器连接正常")
        except requests.exceptions.ConnectionError:
            self.fail("无法连接到服务器")
        except requests.exceptions.Timeout:
            self.fail("服务器响应超时")


if __name__ == "__main__":
    unittest.main() 