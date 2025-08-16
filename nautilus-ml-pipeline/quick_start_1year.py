"""
1년치 자동매매 백테스트 + ML 훈련 빠른 시작 스크립트

사용법:
python quick_start_1year.py --symbol BTCUSDT --days 365
python quick_start_1year.py --symbol ETHUSDT --chunk-size 15
python quick_start_1year.py --all-symbols  # BTC, ETH 모두 실행
"""

import argparse
import asyncio
import logging
from datetime import datetime
import sys
from pathlib import Path

# 한글 주석: 프로젝트 루트를 패스에 추가
sys.path.append(str(Path(__file__).parent))

from run_1year_backtest import YearLongBacktestRunner
from ml_pipeline.large_dataset_trainer import train_large_dataset

# 한글 주석: 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def quick_start_single_symbol(
    symbol: str, 
    chunk_days: int = 30, 
    timeframe: str = "1m",
    use_large_trainer: bool = True
):
    """
    단일 심볼 1년치 백테스트 + ML 훈련
    
    Args:
        symbol: 거래 심볼 (예: BTCUSDT)
        chunk_days: 청크 크기 (일)
        timeframe: 시간 프레임
        use_large_trainer: 대용량 데이터 훈련기 사용 여부
    """
    logger.info(f"🚀 {symbol} 1년치 백테스트 + ML 훈련 시작")
    logger.info(f"설정: 청크 {chunk_days}일, 시간프레임 {timeframe}")
    
    start_time = datetime.now()
    
    try:
        # 한글 주석: 1단계 - 1년치 백테스트 실행
        logger.info("📊 1단계: 1년치 백테스트 실행 중...")
        runner = YearLongBacktestRunner()
        
        backtest_report = await runner.run_year_long_backtest(
            symbol=symbol,
            chunk_days=chunk_days,
            timeframe=timeframe
        )
        
        trades_count = backtest_report['execution_summary']['total_trades_generated']
        logger.info(f"✅ 백테스트 완료: {trades_count:,}건의 거래 생성")
        
        # 한글 주석: 2단계 - ML 모델 훈련
        if trades_count > 100:  # 최소 거래 수 확인
            logger.info("🤖 2단계: ML 모델 훈련 중...")
            
            # 한글 주석: 최신 훈련 데이터 파일 찾기
            training_data_dir = Path("data/training_data")
            training_files = list(training_data_dir.glob("training_data_*.csv"))
            
            if training_files:
                latest_file = max(training_files, key=lambda f: f.stat().st_mtime)
                logger.info(f"최신 훈련 데이터: {latest_file.name}")
                
                # 한글 주석: 대용량 데이터 훈련기 사용
                if use_large_trainer:
                    loop = asyncio.get_event_loop()
                    ml_metrics = await loop.run_in_executor(
                        None, 
                        train_large_dataset, 
                        str(latest_file), 
                        False  # incremental=False
                    )
                else:
                    # 한글 주석: 일반 훈련기 사용
                    from ml_pipeline.model_trainer import train_new_model
                    loop = asyncio.get_event_loop()
                    model_path = await loop.run_in_executor(
                        None, 
                        train_new_model, 
                        str(latest_file)
                    )
                    ml_metrics = {'model_path': model_path}
                
                # 한글 주석: ML 훈련 결과 출력
                if ml_metrics.get('test_r2'):
                    logger.info(f"✅ ML 모델 훈련 완료!")
                    logger.info(f"   R² 스코어: {ml_metrics['test_r2']:.4f}")
                    logger.info(f"   RMSE: {ml_metrics.get('test_rmse', 'N/A')}")
                    
                    if ml_metrics.get('model_path'):
                        logger.info(f"   모델 저장: {Path(ml_metrics['model_path']).name}")
                else:
                    logger.warning("⚠️ ML 모델 훈련 실패 또는 성능 부족")
            else:
                logger.error("❌ 훈련 데이터 파일을 찾을 수 없습니다")
        else:
            logger.warning(f"⚠️ 거래 데이터 부족 ({trades_count}건) - ML 훈련 스킵")
        
        # 한글 주석: 최종 결과 요약
        execution_time = (datetime.now() - start_time).total_seconds()
        logger.info(f"🎉 {symbol} 전체 프로세스 완료!")
        logger.info(f"   실행 시간: {execution_time/3600:.2f}시간")
        logger.info(f"   생성된 거래: {trades_count:,}건")
        
        return {
            'symbol': symbol,
            'success': True,
            'trades_generated': trades_count,
            'execution_time_hours': round(execution_time / 3600, 2),
            'backtest_report': backtest_report
        }
        
    except Exception as e:
        logger.error(f"❌ {symbol} 프로세스 실패: {e}")
        return {
            'symbol': symbol,
            'success': False,
            'error': str(e),
            'execution_time_hours': round((datetime.now() - start_time).total_seconds() / 3600, 2)
        }

async def quick_start_multiple_symbols(
    symbols: list, 
    chunk_days: int = 30,
    timeframe: str = "1m"
):
    """
    여러 심볼 순차 실행
    
    Args:
        symbols: 심볼 리스트
        chunk_days: 청크 크기
        timeframe: 시간 프레임
    """
    logger.info(f"🚀 다중 심볼 1년치 백테스트 시작: {', '.join(symbols)}")
    
    results = []
    
    for i, symbol in enumerate(symbols, 1):
        logger.info(f"\n{'='*50}")
        logger.info(f"진행 상황: {i}/{len(symbols)} - {symbol}")
        logger.info(f"{'='*50}")
        
        result = await quick_start_single_symbol(
            symbol=symbol,
            chunk_days=chunk_days,
            timeframe=timeframe
        )
        
        results.append(result)
        
        # 한글 주석: 심볼 간 휴식 (마지막 제외)
        if i < len(symbols):
            logger.info(f"⏳ 다음 심볼까지 5분 대기...")
            await asyncio.sleep(300)
    
    # 한글 주석: 전체 결과 요약
    logger.info(f"\n{'='*60}")
    logger.info(f"🎊 전체 다중 심볼 백테스트 완료!")
    logger.info(f"{'='*60}")
    
    total_trades = sum(r.get('trades_generated', 0) for r in results)
    successful_symbols = [r['symbol'] for r in results if r['success']]
    failed_symbols = [r['symbol'] for r in results if not r['success']]
    
    logger.info(f"성공한 심볼: {', '.join(successful_symbols) if successful_symbols else '없음'}")
    if failed_symbols:
        logger.info(f"실패한 심볼: {', '.join(failed_symbols)}")
    logger.info(f"총 생성된 거래: {total_trades:,}건")
    
    return results

def main():
    """메인 실행 함수"""
    parser = argparse.ArgumentParser(description="1년치 자동매매 백테스트 + ML 훈련 도구")
    
    # 한글 주석: 명령행 인자 설정
    parser.add_argument('--symbol', type=str, help='거래 심볼 (예: BTCUSDT)')
    parser.add_argument('--all-symbols', action='store_true', help='모든 주요 심볼 실행 (BTC, ETH)')
    parser.add_argument('--chunk-size', type=int, default=30, help='백테스트 청크 크기 (일)')
    parser.add_argument('--timeframe', type=str, default='1m', choices=['1m', '5m', '1h'], help='시간 프레임')
    parser.add_argument('--small-trainer', action='store_true', help='일반 훈련기 사용 (대신 대용량 훈련기)')
    
    args = parser.parse_args()
    
    # 한글 주석: 실행 모드 결정
    if args.all_symbols:
        symbols = ['BTCUSDT', 'ETHUSDT']
        logger.info(f"🎯 다중 심볼 모드: {', '.join(symbols)}")
        
        # 한글 주석: 다중 심볼 실행
        results = asyncio.run(quick_start_multiple_symbols(
            symbols=symbols,
            chunk_days=args.chunk_size,
            timeframe=args.timeframe
        ))
        
    elif args.symbol:
        logger.info(f"🎯 단일 심볼 모드: {args.symbol}")
        
        # 한글 주석: 단일 심볼 실행
        result = asyncio.run(quick_start_single_symbol(
            symbol=args.symbol,
            chunk_days=args.chunk_size,
            timeframe=args.timeframe,
            use_large_trainer=not args.small_trainer
        ))
        
        if result['success']:
            logger.info("✅ 프로세스 성공적으로 완료!")
        else:
            logger.error("❌ 프로세스 실패")
            sys.exit(1)
    
    else:
        logger.error("❌ --symbol 또는 --all-symbols 중 하나를 선택해주세요")
        parser.print_help()
        sys.exit(1)

if __name__ == "__main__":
    main()

