from datetime import datetime, timezone, timedelta
import pytz

# 定义UTC+8时区
UTC_PLUS_8 = timezone(timedelta(hours=8))
BEIJING_TZ = pytz.timezone('Asia/Shanghai')

def get_current_time_utc8() -> datetime:
    """获取当前UTC+8时间"""
    return datetime.now(UTC_PLUS_8)

def get_current_time_beijing() -> datetime:
    """获取当前北京时间（考虑夏令时）"""
    return datetime.now(BEIJING_TZ)

def format_datetime_utc8(dt: datetime = None) -> str:
    """格式化UTC+8时间为字符串"""
    if dt is None:
        dt = get_current_time_utc8()
    elif dt.tzinfo is None:
        # 如果时间没有时区信息，假设为UTC+8
        dt = dt.replace(tzinfo=UTC_PLUS_8)
    return dt.strftime('%Y-%m-%d %H:%M:%S')

def format_date_utc8(dt: datetime = None) -> str:
    """格式化UTC+8日期为字符串"""
    if dt is None:
        dt = get_current_time_utc8()
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC_PLUS_8)
    return dt.strftime('%Y-%m-%d')

def isoformat_utc8(dt: datetime = None) -> str:
    """获取UTC+8时间的ISO格式字符串"""
    if dt is None:
        dt = get_current_time_utc8()
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC_PLUS_8)
    return dt.isoformat()

def format_datetime_with_timezone(dt: datetime = None) -> str:
    """获取带时区格式的UTC+8时间字符串 (YYYY-MM-DD HH:MM:SS+08:00)"""
    if dt is None:
        dt = get_current_time_utc8()
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC_PLUS_8)
    return dt.strftime('%Y-%m-%d %H:%M:%S+08:00')

def parse_datetime_utc8(date_string: str) -> datetime:
    """解析日期字符串为UTC+8时间"""
    try:
        # 尝试解析ISO格式
        dt = datetime.fromisoformat(date_string.replace('Z', '+00:00'))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC_PLUS_8)
        return dt
    except ValueError:
        # 尝试解析其他格式
        for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%Y-%m-%dT%H:%M:%S']:
            try:
                dt = datetime.strptime(date_string, fmt)
                return dt.replace(tzinfo=UTC_PLUS_8)
            except ValueError:
                continue
        raise ValueError(f"无法解析日期字符串: {date_string}")

def get_sqlite_datetime_utc8() -> str:
    """获取SQLite格式的UTC+8时间字符串"""
    return get_current_time_utc8().strftime('%Y-%m-%d %H:%M:%S') 