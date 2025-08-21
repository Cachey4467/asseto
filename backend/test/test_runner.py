#!/usr/bin/env python3
"""
测试验证脚本 - 验证所有测试文件都能正常导入和运行
"""

import sys
import os

def test_imports():
    """测试所有测试模块是否能正常导入"""
    print("🔍 测试模块导入...")
    
    modules = [
        'test_base',
        'test_assets', 
        'test_transactions',
        'test_config',
        'test_validation'
    ]
    
    success_count = 0
    total_count = len(modules)
    
    for module_name in modules:
        try:
            __import__(module_name)
            print(f"✅ {module_name} - 导入成功")
            success_count += 1
        except ImportError as e:
            print(f"❌ {module_name} - 导入失败: {e}")
        except Exception as e:
            print(f"❌ {module_name} - 其他错误: {e}")
    
    print(f"\n📊 导入测试结果: {success_count}/{total_count} 成功")
    return success_count == total_count


def test_test_classes():
    """测试所有测试类是否能正常实例化"""
    print("\n🔍 测试类实例化...")
    
    try:
        from test_base import TestBaseAPI
        from test_assets import TestAssetsAPI
        from test_transactions import TestTransactionsAPI
        from test_config import TestConfigAPI
        from test_validation import TestValidationAPI
        
        test_classes = [
            TestBaseAPI,
            TestAssetsAPI,
            TestTransactionsAPI,
            TestConfigAPI,
            TestValidationAPI
        ]
        
        success_count = 0
        total_count = len(test_classes)
        
        for test_class in test_classes:
            try:
                # 尝试创建测试类实例
                instance = test_class()
                print(f"✅ {test_class.__name__} - 实例化成功")
                success_count += 1
            except Exception as e:
                print(f"❌ {test_class.__name__} - 实例化失败: {e}")
        
        print(f"\n📊 实例化测试结果: {success_count}/{total_count} 成功")
        return success_count == total_count
        
    except Exception as e:
        print(f"❌ 测试类导入失败: {e}")
        return False


def main():
    """主函数"""
    print("🚀 开始测试验证...")
    print("=" * 50)
    
    # 测试导入
    import_success = test_imports()
    
    # 测试实例化
    instantiation_success = test_test_classes()
    
    print("\n" + "=" * 50)
    print("📋 验证结果摘要:")
    print(f"模块导入: {'✅ 成功' if import_success else '❌ 失败'}")
    print(f"类实例化: {'✅ 成功' if instantiation_success else '❌ 失败'}")
    
    if import_success and instantiation_success:
        print("\n🎉 所有验证通过！测试文件结构正确。")
        return True
    else:
        print("\n⚠️  部分验证失败，请检查测试文件。")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 