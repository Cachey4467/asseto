#!/usr/bin/env python3
"""
定时任务包
"""

from .currency_rate_scheduler import setup_currency_rate_scheduler
from .stock_price_scheduler import setup_stock_price_scheduler
from .longport_sync_scheduler import setup_longport_sync_scheduler
from .total_asset_price_scheduler import setup_total_asset_price_scheduler

__all__ = [
    'setup_currency_rate_scheduler',
    'setup_stock_price_scheduler',
    'setup_longport_sync_scheduler',
    'setup_total_asset_price_scheduler'
]
