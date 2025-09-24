"""
Nautilus Trading 로깅 시스템
"""
import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
from datetime import datetime
from typing import Optional


class ColoredFormatter(logging.Formatter):
    """콘솔 출력용 색상 포맷터"""

    COLORS = {
        "DEBUG": "\033[36m",    # 시안
        "INFO": "\033[32m",     # 초록
        "WARNING": "\033[33m",  # 노랑
        "ERROR": "\033[31m",    # 빨강
        "CRITICAL": "\033[35m", # 자홍
    }
    RESET = "\033[0m"

    def format(self, record):
        log_color = self.COLORS.get(record.levelname, self.RESET)
        record.levelname = f"{log_color}{record.levelname}{self.RESET}"
        record.msg = f"{log_color}{record.msg}{self.RESET}"
        return super().format(record)


def setup_logger(
    name: str = "nautilus",
    log_level: str = "INFO",
    log_file: Optional[str] = None,
    console_output: bool = True,
    max_bytes: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 5,
) -> logging.Logger:
    """
    파일 및 콘솔 핸들러를 갖춘 로거 설정

    Args:
        name: 로거 이름
        log_level: 로깅 레벨 (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: 로그 파일 경로 (선택사항)
        console_output: 콘솔 출력 여부
        max_bytes: 최대 로그 파일 크기 (바이트)
        backup_count: 백업 파일 개수
    """
    logger = logging.getLogger(name)

    # 기존 핸들러 제거
    logger.handlers = []

    # 로그 레벨 설정
    level = getattr(logging, log_level.upper(), logging.INFO)
    logger.setLevel(level)

    # 포맷터 생성
    file_formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    console_formatter = ColoredFormatter(
        "%(asctime)s - %(levelname)s - %(message)s",
        datefmt="%H:%M:%S"
    )

    # 로그 파일이 지정된 경우 파일 핸들러 추가
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)

        # 로테이팅 파일 핸들러 사용
        file_handler = RotatingFileHandler(
            log_path,
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding="utf-8"
        )
        file_handler.setFormatter(file_formatter)
        file_handler.setLevel(level)
        logger.addHandler(file_handler)

    # 콘솔 핸들러 추가
    if console_output:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(console_formatter)
        console_handler.setLevel(level)
        logger.addHandler(console_handler)

    # 루트 로거로 전파 방지
    logger.propagate = False

    return logger


def get_logger(name: str) -> logging.Logger:
    """
    로거 인스턴스 가져오기

    Args:
        name: 로거 이름 (보통 __name__)
    """
    return logging.getLogger(name)


class TradingLogger:
    """트레이딩 작업 전용 로거"""

    def __init__(self, logger: logging.Logger):
        self.logger = logger

    def trade_signal(self, strategy: str, symbol: str, side: str, price: float, quantity: float):
        """트레이딩 시그널 로깅"""
        self.logger.info(
            f"[시그널] 전략: {strategy} | 심볼: {symbol} | "
            f"방향: {side} | 가격: {price} | 수량: {quantity}"
        )

    def order_placed(self, order_id: str, symbol: str, side: str, price: float, quantity: float):
        """주문 생성 로깅"""
        self.logger.info(
            f"[주문 생성] ID: {order_id} | 심볼: {symbol} | "
            f"방향: {side} | 가격: {price} | 수량: {quantity}"
        )

    def order_filled(self, order_id: str, symbol: str, filled_price: float, filled_quantity: float):
        """주문 체결 로깅"""
        self.logger.info(
            f"[주문 체결] ID: {order_id} | 심볼: {symbol} | "
            f"체결가: {filled_price} | 체결량: {filled_quantity}"
        )

    def order_cancelled(self, order_id: str, reason: str):
        """주문 취소 로깅"""
        self.logger.warning(f"[주문 취소] ID: {order_id} | 사유: {reason}")

    def position_opened(self, symbol: str, side: str, entry_price: float, quantity: float):
        """포지션 오픈 로깅"""
        self.logger.info(
            f"[포지션 오픈] 심볼: {symbol} | 방향: {side} | "
            f"진입가: {entry_price} | 수량: {quantity}"
        )

    def position_closed(self, symbol: str, exit_price: float, pnl: float):
        """포지션 종료 로깅"""
        color = "\033[32m" if pnl > 0 else "\033[31m"
        self.logger.info(
            f"[포지션 종료] 심볼: {symbol} | 청산가: {exit_price} | "
            f"손익: {color}{pnl:+.2f}\033[0m"
        )

    def risk_alert(self, message: str):
        """리스크 관리 경고 로깅"""
        self.logger.warning(f"[리스크 경고] {message}")

    def error(self, message: str, exception: Optional[Exception] = None):
        """에러 로깅 (예외 포함 가능)"""
        if exception:
            self.logger.error(f"[에러] {message}: {str(exception)}", exc_info=True)
        else:
            self.logger.error(f"[에러] {message}")

    def performance_update(self, metrics: dict):
        """성과 지표 로깅"""
        self.logger.info(
            f"[성과] 총 손익: {metrics.get('total_pnl', 0):+.2f} | "
            f"승률: {metrics.get('win_rate', 0):.1%} | "
            f"샤프 비율: {metrics.get('sharpe_ratio', 0):.2f}"
        )