#!/usr/bin/env python3
"""
主测试运行器 - 运行所有分类的API测试
"""

from time import timezone
import unittest
import sys
import os
import requests
from datetime import datetime

# 添加当前目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 导入所有测试模块
from test_base import TestBaseAPI
from test_assets import TestAssetsAPI
from test_transactions import TestTransactionsAPI
from test_config import TestConfigAPI
from test_validation import TestValidationAPI

# 服务器地址
BASE_URL = "http://localhost:5000"


def check_server_status():
    """检查服务器状态"""
    print("检查服务器状态...")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/health", timeout=5)
        if response.status_code == 200:
            print("✅ 服务器运行正常")
            return True
        else:
            print("❌ 服务器响应异常")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到服务器，请确保后端服务正在运行")
        return False
    except requests.exceptions.Timeout:
        print("❌ 服务器响应超时")
        return False
    except Exception as e:
        print(f"❌ 检查服务器状态时出错: {e}")
        return False


def run_test_suite(test_class, suite_name):
    """运行指定的测试套件"""
    print(f"\n{'='*60}")
    print(f"运行 {suite_name} 测试套件")
    print(f"{'='*60}")
    
    # 创建测试套件
    suite = unittest.TestLoader().loadTestsFromTestCase(test_class)
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # 输出测试结果摘要
    print(f"\n{suite_name} 测试结果:")
    print(f"  运行测试数: {result.testsRun}")
    print(f"  失败数: {len(result.failures)}")
    print(f"  错误数: {len(result.errors)}")
    print(f"  跳过数: {len(result.skipped)}")
    
    if result.failures:
        print(f"\n  {suite_name} 失败的测试:")
        for test, traceback in result.failures:
            print(f"    - {test}: {traceback.split('AssertionError:')[-1].strip()}")
    
    if result.errors:
        print(f"\n  {suite_name} 错误的测试:")
        for test, traceback in result.errors:
            print(f"    - {test}: {traceback.split('Exception:')[-1].strip()}")
    
    return result


def run_all_tests():
    """运行所有测试"""
    print("🚀 开始API测试套件")
    print(f"📅 测试时间: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌐 服务器地址: {BASE_URL}")
    
    # 检查服务器状态
    if not check_server_status():
        print("\n❌ 服务器不可用，无法运行测试")
        return False
    
    # 定义测试套件
    test_suites = [
        (TestBaseAPI, "基础功能"),
        (TestAssetsAPI, "资产管理"),
        (TestTransactionsAPI, "交易记录"),
        (TestConfigAPI, "配置管理"),
        (TestValidationAPI, "验证和安全")
    ]
    
    # 运行所有测试套件
    all_results = []
    total_tests = 0
    total_failures = 0
    total_errors = 0
    total_skipped = 0
    
    for test_class, suite_name in test_suites:
        try:
            result = run_test_suite(test_class, suite_name)
            all_results.append((suite_name, result))
            
            total_tests += result.testsRun
            total_failures += len(result.failures)
            total_errors += len(result.errors)
            total_skipped += len(result.skipped)
            
        except Exception as e:
            print(f"❌ 运行 {suite_name} 测试套件时出错: {e}")
            total_errors += 1
    
    # 输出总体测试结果
    print(f"\n{'='*60}")
    print("📊 总体测试结果摘要")
    print(f"{'='*60}")
    print(f"总测试数: {total_tests}")
    print(f"总失败数: {total_failures}")
    print(f"总错误数: {total_errors}")
    print(f"总跳过数: {total_skipped}")
    
    success_rate = ((total_tests - total_failures - total_errors) / total_tests * 100) if total_tests > 0 else 0
    print(f"成功率: {success_rate:.1f}%")
    
    if total_failures == 0 and total_errors == 0:
        print("\n🎉 所有测试通过！")
        return True
    else:
        print(f"\n⚠️  有 {total_failures + total_errors} 个测试失败")
        return False


def run_specific_test(test_name):
    """运行特定的测试"""
    print(f"🔍 运行特定测试: {test_name}")
    
    # 检查服务器状态
    if not check_server_status():
        return False
    
    # 根据测试名称选择测试套件
    test_mapping = {
        "base": TestBaseAPI,
        "assets": TestAssetsAPI,
        "transactions": TestTransactionsAPI,
        "config": TestConfigAPI,
        "validation": TestValidationAPI
    }
    
    if test_name not in test_mapping:
        print(f"❌ 未知的测试名称: {test_name}")
        print(f"可用的测试: {', '.join(test_mapping.keys())}")
        return False
    
    test_class = test_mapping[test_name]
    suite_names = {
        "base": "基础功能",
        "assets": "资产管理", 
        "transactions": "交易记录",
        "config": "配置管理",
        "validation": "验证和安全"
    }
    
    result = run_test_suite(test_class, suite_names[test_name])
    return result.wasSuccessful()


def main():
    """主函数"""
    if len(sys.argv) > 1:
        # 运行特定测试
        test_name = sys.argv[1].lower()
        success = run_specific_test(test_name)
    else:
        # 运行所有测试
        success = run_all_tests()
    
    # 设置退出码
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⏹️  测试被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 测试过程中出现未预期的错误: {e}")
        sys.exit(1) 