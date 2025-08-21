import base64
import logging
import os
from pickle import NONE
import re
import time
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import ddddocr
import requests
from lxml import etree

from .time_utils import format_date_utc8

logger = logging.getLogger(__name__)
logging.getLogger(__name__).disabled = True
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
# 配置信息
BASE_URL = "https://srh.bankofchina.com/search/whpj/"
CAPTCHA_URL = BASE_URL + "CaptchaServlet.jsp"
SEARCH_URL = BASE_URL + "search_cn.jsp"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0"

def get_captcha():
    """获取验证码"""
    response = requests.get(CAPTCHA_URL)
    response.raise_for_status()
    token = response.headers.get("token")
    with open("captcha.png", "wb") as f:
        f.write(base64.b64decode(response.content))
    return token

def get_captcha_char(ocr: ddddocr.DdddOcr):
    """解析验证码"""
    with open("captcha.png", "rb") as f:
        image = f.read()
    result = ocr.classification(image)
    logger.info(f"验证码识别结果: {result}")
    return result

def query_data(
    start_date: str,
    end_date: str,
    token: str,
    captcha_char: str,
    paramtk: str,
    page,
    is_first: bool = False,
    currency = "港币"
):
    """
    :param start_date: 开始日期
    :param end_date: 结束日期
    :param token: token 随验证码同时生成的token,包含其过期时间
    :param captcha_char: 验证码
    :param paramtk: paramtk  查询翻页时的token,包含过期时间
    :param page: 页码
    :param is_first: 是否是第一次请求
    """
    headers = {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
    }
    if is_first:
        data = {
            "erectDate": start_date,
            "nothing": end_date,
            "pjname": currency,
            "head": "head_620.js",
            "bottom": "bottom_591.js",
            "first": 1,
            "token": token,
            "captcha": captcha_char,
        }
    else:
        data = {
            "erectDate": start_date,
            "nothing": end_date,
            "page": page,
            "pjname": currency,
            "head": "head_620.js",
            "bottom": "bottom_591.js",
            "paramtk": paramtk,
            "token": token,
        }
    logger.debug(f"请求体: {data}")
    
    error = None
    paramtk = None
    m_nRecordCount = 0
    content = []
    try:
        response = requests.post(SEARCH_URL, headers=headers, data=data)
        response.raise_for_status()
        html_content = response.text.replace("GBK", "UTF-8").replace("\n", "").replace("\r", "").replace("\t", "")
        if "验证码错误" in html_content:
            error = "验证码错误"
        elif "验证码已过期" in html_content:
            error = "验证码已过期"
        else:
            paramtk = re.findall('paramtk" value="(.*?)">', html_content)
            paramtk = paramtk[0] if paramtk else None
            
            m_nRecordCount_match = re.findall('m_nRecordCount" value="(.*?)">', html_content)
            m_nRecordCount = int(m_nRecordCount_match[0]) if m_nRecordCount_match else 0
            content = parse_html(html_content)
            
    except Exception as e:
        error = f"请求失败: {e}"
    
    return error, paramtk, m_nRecordCount, content

def parse_html(html_content):
    """解析HTML内容"""
    try:
        tree = etree.HTML(html_content)
        # 修改XPath选择器，直接选择表格中的行，跳过表头
        rows = tree.xpath('//div[@class="BOC_main publish"]//table//tr[position()>1]')
        
        content = []
        for row in rows:
            cells = row.xpath('.//td/text()')
            if len(cells) >= 7:
                content.append({
                    "货币名称": cells[0].strip(),
                    "现汇买入价": cells[1].strip(),
                    "现钞买入价": cells[2].strip(),
                    "现汇卖出价": cells[3].strip(),
                    "现钞卖出价": cells[4].strip(),
                    "中行折算价": cells[5].strip(),
                    "发布时间": cells[6].strip()
                })
        
        return content
    except Exception as e:
        logger.error(f"解析HTML失败: {e}")
        return []

def work_on(start_date, end_date, currency, db_manager=None):
    """
    获取汇率的主要函数
    :param start_date: 开始日期
    :param end_date: 结束日期
    :param currency: 货币代码 (USD, HKD)
    :param db_manager: 数据库管理器（可选）
    :return: (买入价, 卖出价)
    """
    # 如果提供了数据库管理器，先尝试从缓存获取
    if db_manager:
        try:
            # 获取今天的日期作为缓存键，使用format_date_utc8确保格式一致
            today = format_date_utc8()
            latest_rate = db_manager.get_latest_exchange_rate(currency, today)
            if latest_rate:
                logger.info(f"从缓存获取 {currency} 汇率: {latest_rate}")
                return Decimal(latest_rate['buy_in_price']), Decimal(latest_rate['sell_out_price'])
        except Exception as e:
            logger.warning(f"从缓存获取汇率失败: {e}")
    
    # 缓存中没有，执行原来的逻辑
    symbol_mapping = {
        "HKD": "港币",
        "USD": "美元"
    }
    ocr = ddddocr.DdddOcr(show_ad=False)
    paramtk = ""
    token = ""
    captcha_str = ""
    logger.info(f"获取第1页数据")
    while True:
        token = get_captcha()  # 获取验证码token
        captcha_str = get_captcha_char(ocr)  # 获取验证码字符
        error, paramtk, record_count, content = query_data(
            start_date, end_date, token, captcha_str, "", 1, True, symbol_mapping[currency]
        )
        if error:
            logger.error(error)
        else:
            break
        logger.info("2s后重试获取")
        time.sleep(2)
    
    page = 2
    while True:
        logger.info(f"获取第{page}页数据")
        error, paramtk, record_count, content = query_data(
            start_date, end_date, token, captcha_str, paramtk, page, False, symbol_mapping[currency]
        )
        if record_count <= 20:
            break
        if error:
            logger.error(error)
        if content:
           break
    
    # df = pandas.DataFrame(contents)
    # print(df.head())
    if os.path.exists("captcha.png"):
        os.remove("captcha.png")
    if not content:
        return Decimal(114), Decimal(114)
    
    buy_in_price = Decimal(content[0]["现汇买入价"])
    sell_out_price = Decimal(content[0]["现汇卖出价"])
    
    # 如果提供了数据库管理器，保存到缓存
    if db_manager:
        try:
            import uuid
            rate_data = {
                'id': str(uuid.uuid4()),
                'foreign_currency': currency,
                'buy_in_price': buy_in_price,
                'sell_out_price': sell_out_price
            }
            db_manager.set_exchange_rate(rate_data)
            logger.info(f"汇率已保存到缓存: {currency}")
        except Exception as e:
            logger.warning(f"保存汇率到缓存失败: {e}")
    
    return buy_in_price, sell_out_price


def convert_currency_amount(amount: Decimal, from_currency, to_currency, date=None, db_manager=None):
    """
    货币转换函数，支持指定日期和缓存
    :param amount: 转换金额
    :param from_currency: 源货币
    :param to_currency: 目标货币
    :param date: 指定日期（可选，默认为昨天到今天）
    :param db_manager: 数据库管理器（可选）
    """
    valid_unit = ["CNY", "USD", "HKD"]
    if not from_currency in valid_unit or not to_currency in valid_unit:
        raise ValueError(f'{from_currency} or {to_currency} is not one of {valid_unit}')
    
    if from_currency == to_currency:
        return amount
    
    # 如果没有指定日期，使用默认的昨天到今天
    if date is None:
        start_date = format_date_utc8(datetime.now(timezone.utc) - timedelta(days=1))
        end_date = format_date_utc8()
    else:
        # 如果指定了日期，使用该日期作为查询日期
        start_date = date
        end_date = date
    
    buy_in, _ = work_on(start_date, end_date, from_currency, db_manager)
    rmb_after = amount / Decimal(100) * buy_in
    _, sell_out = work_on(start_date, end_date, to_currency, db_manager)
    target_amount = rmb_after / sell_out * Decimal(100)
    return target_amount

if __name__ == "__main__":
    print(convert_currency_amount(Decimal(2448.81), "USD", "HKD")+Decimal(50292.57)) 