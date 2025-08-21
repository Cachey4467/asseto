import unittest
import requests
import uuid
from datetime import datetime, timedelta

class TestPaginationAPI(unittest.TestCase):
    """分页API测试类"""
    
    def setUp(self):
        self.base_url = "http://localhost:5000"
        self.user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        self.account_id = f"test_account_{uuid.uuid4().hex[:8]}"
        self.created_transaction_ids = []
        
        # 创建测试账户
        self.create_test_account()
        
        # 创建测试交易记录
        self.create_test_transactions()
    
    def create_test_account(self):
        """创建测试账户"""
        account_data = {
            'id': self.account_id,
            'userId': self.user_id,
            'type': 'stock',
            'description': '测试账户',
            'quantity': '0',
            'cost': '0',
            'currency': 'CNY'
        }
        
        response = requests.post(f"{self.base_url}/api/v1/assets", json=account_data)
        if response.status_code != 200:
            try:
                error_msg = response.json()
                print(f"创建测试账户失败: {error_msg}")
            except:
                print(f"创建测试账户失败: HTTP {response.status_code}")
                print(f"响应内容: {response.text}")
    
    def create_test_transactions(self):
        """创建测试交易记录"""
        print("创建测试交易记录...")
        
        # 创建50条测试交易记录
        for i in range(50):
            transaction_data = {
                'userId': self.user_id,
                'accountId': self.account_id,
                'direction': 0 if i % 2 == 0 else 1,  # 交替买入卖出
                'quantity': 100 + i,
                'price': 10.0 + i * 0.1,
                'currency': 'CNY',
                'description': f'测试交易记录 {i+1}',
                'date': (datetime.now() - timedelta(days=i)).isoformat()
            }
            
            response = requests.post(f"{self.base_url}/api/v1/transactions", json=transaction_data)
            if response.status_code == 200:
                result = response.json()
                if result['success']:
                    self.created_transaction_ids.append(result['data']['id'])
                    print(f"创建交易记录 {i+1}: {result['data']['id']}")
                else:
                    print(f"创建交易记录 {i+1} 失败: {result['error']}")
            else:
                print(f"创建交易记录 {i+1} 请求失败: {response.status_code}")
        
        print(f"成功创建了 {len(self.created_transaction_ids)} 个交易记录")
    
    def test_basic_pagination(self):
        """测试基本分页功能"""
        print("\n测试基本分页功能...")
        
        # 测试第一页，每页10条记录
        response = requests.get(f"{self.base_url}/api/v1/transactions?userId={self.user_id}&page_index=1&page_size=10")
        
        print(f"状态码: {response.status_code}")
        result = response.json()
        print(f"响应: {result}")
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(result['success'])
        self.assertIn('data', result)
        self.assertIn('pagination', result)
        
        pagination = result['pagination']
        self.assertEqual(pagination['page_index'], 1)
        self.assertEqual(pagination['page_size'], 10)
        self.assertEqual(len(result['data']), 10)
        self.assertTrue(pagination['total_count'] >= 50)
        self.assertTrue(pagination['has_next'])
        self.assertFalse(pagination['has_prev'])
    
    def test_second_page(self):
        """测试第二页"""
        print("\n测试第二页...")
        
        response = requests.get(f"{self.base_url}/api/v1/transactions?userId={self.user_id}&page_index=2&page_size=10")
        
        print(f"状态码: {response.status_code}")
        result = response.json()
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(result['success'])
        
        pagination = result['pagination']
        self.assertEqual(pagination['page_index'], 2)
        self.assertEqual(pagination['page_size'], 10)
        self.assertEqual(len(result['data']), 10)
        self.assertTrue(pagination['has_next'])
        self.assertTrue(pagination['has_prev'])
    
    def test_last_page(self):
        """测试最后一页"""
        print("\n测试最后一页...")
        
        # 先获取总页数
        response = requests.get(f"{self.base_url}/api/v1/transactions?userId={self.user_id}&page_index=1&page_size=10")
        result = response.json()
        total_pages = result['pagination']['total_pages']
        
        # 获取最后一页
        response = requests.get(f"{self.base_url}/api/v1/transactions?userId={self.user_id}&page_index={total_pages}&page_size=10")
        
        print(f"状态码: {response.status_code}")
        result = response.json()
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(result['success'])
        
        pagination = result['pagination']
        self.assertEqual(pagination['page_index'], total_pages)
        self.assertFalse(pagination['has_next'])
        self.assertTrue(pagination['has_prev'])
    
    def test_invalid_page_index(self):
        """测试无效的页码"""
        print("\n测试无效的页码...")
        
        response = requests.get(f"{self.base_url}/api/v1/transactions?userId={self.user_id}&page_index=0&page_size=10")
        
        print(f"状态码: {response.status_code}")
        result = response.json()
        
        self.assertEqual(response.status_code, 400)
        self.assertFalse(result['success'])
        self.assertIn('page_index必须大于等于1', result['error'])
    
    def test_invalid_page_size(self):
        """测试无效的页面大小"""
        print("\n测试无效的页面大小...")
        
        response = requests.get(f"{self.base_url}/api/v1/transactions?userId={self.user_id}&page_index=1&page_size=0")
        
        print(f"状态码: {response.status_code}")
        result = response.json()
        
        self.assertEqual(response.status_code, 400)
        self.assertFalse(result['success'])
        self.assertIn('page_size必须在1到1000之间', result['error'])
    
    def test_large_page_size(self):
        """测试过大的页面大小"""
        print("\n测试过大的页面大小...")
        
        response = requests.get(f"{self.base_url}/api/v1/transactions?userId={self.user_id}&page_index=1&page_size=1001")
        
        print(f"状态码: {response.status_code}")
        result = response.json()
        
        self.assertEqual(response.status_code, 400)
        self.assertFalse(result['success'])
        self.assertIn('page_size必须在1到1000之间', result['error'])
    
    def test_pagination_with_filters(self):
        """测试带过滤条件的分页"""
        print("\n测试带过滤条件的分页...")
        
        # 测试带账户ID过滤的分页
        response = requests.get(f"{self.base_url}/api/v1/transactions?userId={self.user_id}&accountId={self.account_id}&page_index=1&page_size=5")
        
        print(f"状态码: {response.status_code}")
        result = response.json()
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(result['success'])
        
        pagination = result['pagination']
        self.assertEqual(pagination['page_index'], 1)
        self.assertEqual(pagination['page_size'], 5)
        self.assertEqual(len(result['data']), 5)
    
    def test_default_pagination(self):
        """测试默认分页参数"""
        print("\n测试默认分页参数...")
        
        response = requests.get(f"{self.base_url}/api/v1/transactions?userId={self.user_id}")
        
        print(f"状态码: {response.status_code}")
        result = response.json()
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(result['success'])
        
        pagination = result['pagination']
        self.assertEqual(pagination['page_index'], 1)
        self.assertEqual(pagination['page_size'], 20)  # 默认页面大小
    
    def tearDown(self):
        """清理测试数据"""
        print("\n清理测试数据...")
        
        # 删除创建的交易记录
        for transaction_id in self.created_transaction_ids:
            response = requests.delete(f"{self.base_url}/api/v1/transactions/{transaction_id}?userId={self.user_id}")
            if response.status_code == 200:
                print(f"删除交易记录: {transaction_id}")
            else:
                print(f"删除交易记录失败: {transaction_id}")
        
        # 删除测试账户
        response = requests.delete(f"{self.base_url}/api/v1/assets/{self.account_id}?userId={self.user_id}")
        if response.status_code == 200:
            print(f"删除测试账户: {self.account_id}")
        else:
            print(f"删除测试账户失败: {self.account_id}")

if __name__ == '__main__':
    unittest.main(verbosity=2)
