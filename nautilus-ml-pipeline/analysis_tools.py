"""
1년치 백테스트 및 ML 모델 성능 분석 도구
- 거래 성과 분석
- 모델 성능 비교
- 시각화 및 리포트 생성
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import json
from datetime import datetime, timedelta
import logging
from typing import Dict, List, Optional, Tuple
import warnings
warnings.filterwarnings('ignore')

# 한글 폰트 설정
plt.rcParams['font.family'] = ['DejaVu Sans', 'Arial', 'sans-serif']
plt.rcParams['axes.unicode_minus'] = False

logger = logging.getLogger(__name__)

class BacktestAnalyzer:
    """백테스트 결과 분석기"""
    
    def __init__(self):
        """분석기 초기화"""
        self.backtest_data = None
        self.model_metrics = {}
        
    def load_backtest_results(self, results_dir: str = "data/backtest_results") -> pd.DataFrame:
        """
        백테스트 결과 로드
        
        Args:
            results_dir: 결과 디렉토리
            
        Returns:
            통합된 백테스트 데이터
        """
        logger.info(f"백테스트 결과 로드 중: {results_dir}")
        
        backtest_files = list(Path(results_dir).glob("*.csv"))
        
        if not backtest_files:
            logger.warning("백테스트 파일을 찾을 수 없습니다")
            return pd.DataFrame()
        
        # 한글 주석: 모든 백테스트 파일 통합
        all_data = []
        for file_path in backtest_files:
            try:
                df = pd.read_csv(file_path)
                df['source_file'] = file_path.name
                all_data.append(df)
                logger.info(f"로드 완료: {file_path.name} ({len(df)}건)")
            except Exception as e:
                logger.error(f"파일 로드 실패 {file_path}: {e}")
        
        if all_data:
            self.backtest_data = pd.concat(all_data, ignore_index=True)
            logger.info(f"총 {len(self.backtest_data)}건의 거래 로드")
        else:
            self.backtest_data = pd.DataFrame()
        
        return self.backtest_data
    
    def analyze_trading_performance(self) -> Dict:
        """
        거래 성과 분석
        
        Returns:
            성과 분석 결과
        """
        if self.backtest_data is None or len(self.backtest_data) == 0:
            logger.warning("분석할 백테스트 데이터가 없습니다")
            return {}
        
        df = self.backtest_data.copy()
        
        # 한글 주석: 기본 통계
        total_trades = len(df)
        winning_trades = len(df[df['return_pct'] > 0])
        losing_trades = len(df[df['return_pct'] < 0])
        
        win_rate = winning_trades / total_trades * 100 if total_trades > 0 else 0
        
        # 한글 주석: 수익률 통계
        total_return = df['return_pct'].sum()
        avg_return = df['return_pct'].mean()
        avg_winning_return = df[df['return_pct'] > 0]['return_pct'].mean() if winning_trades > 0 else 0
        avg_losing_return = df[df['return_pct'] < 0]['return_pct'].mean() if losing_trades > 0 else 0
        
        # 한글 주석: 리스크 메트릭
        volatility = df['return_pct'].std()
        sharpe_ratio = avg_return / volatility if volatility > 0 else 0
        
        # 한글 주석: 최대 낙폭
        cumulative_returns = (1 + df['return_pct'] / 100).cumprod()
        running_max = cumulative_returns.expanding().max()
        drawdown = (cumulative_returns - running_max) / running_max * 100
        max_drawdown = drawdown.min()
        
        # 한글 주석: 거래 지속시간
        if 'duration_minutes' in df.columns:
            avg_trade_duration = df['duration_minutes'].mean()
            max_trade_duration = df['duration_minutes'].max()
        else:
            avg_trade_duration = None
            max_trade_duration = None
        
        performance_metrics = {
            'basic_stats': {
                'total_trades': total_trades,
                'winning_trades': winning_trades,
                'losing_trades': losing_trades,
                'win_rate_pct': round(win_rate, 2)
            },
            'returns': {
                'total_return_pct': round(total_return, 2),
                'avg_return_pct': round(avg_return, 4),
                'avg_winning_return_pct': round(avg_winning_return, 4),
                'avg_losing_return_pct': round(avg_losing_return, 4)
            },
            'risk_metrics': {
                'volatility_pct': round(volatility, 4),
                'sharpe_ratio': round(sharpe_ratio, 4),
                'max_drawdown_pct': round(max_drawdown, 2)
            },
            'trade_duration': {
                'avg_duration_minutes': round(avg_trade_duration, 1) if avg_trade_duration else None,
                'max_duration_minutes': max_trade_duration
            }
        }
        
        logger.info(f"거래 성과 분석 완료: 승률 {win_rate:.1f}%, 샤프비율 {sharpe_ratio:.3f}")
        return performance_metrics
    
    def load_model_metrics(self, models_dir: str = "data/models") -> Dict:
        """
        모델 성능 메트릭 로드
        
        Args:
            models_dir: 모델 디렉토리
            
        Returns:
            모델 성능 메트릭
        """
        logger.info(f"모델 메트릭 로드 중: {models_dir}")
        
        metadata_files = list(Path(models_dir).glob("*metadata*.json"))
        
        if not metadata_files:
            logger.warning("모델 메타데이터 파일을 찾을 수 없습니다")
            return {}
        
        # 한글 주석: 최신 모델 메타데이터 로드
        latest_metadata = max(metadata_files, key=lambda f: f.stat().st_mtime)
        
        try:
            with open(latest_metadata, 'r') as f:
                self.model_metrics = json.load(f)
            
            logger.info(f"모델 메트릭 로드 완료: {latest_metadata.name}")
            return self.model_metrics
            
        except Exception as e:
            logger.error(f"모델 메트릭 로드 실패: {e}")
            return {}
    
    def create_performance_visualizations(self, save_dir: str = "data/reports/charts"):
        """
        성과 시각화 생성
        
        Args:
            save_dir: 차트 저장 디렉토리
        """
        if self.backtest_data is None or len(self.backtest_data) == 0:
            logger.warning("시각화할 데이터가 없습니다")
            return
        
        Path(save_dir).mkdir(parents=True, exist_ok=True)
        
        df = self.backtest_data.copy()
        
        # 한글 주석: 1. 수익률 분포 히스토그램
        plt.figure(figsize=(12, 8))
        
        plt.subplot(2, 2, 1)
        plt.hist(df['return_pct'], bins=50, alpha=0.7, color='skyblue', edgecolor='black')
        plt.axvline(df['return_pct'].mean(), color='red', linestyle='--', label=f'평균: {df["return_pct"].mean():.3f}%')
        plt.title('거래 수익률 분포')
        plt.xlabel('수익률 (%)')
        plt.ylabel('빈도')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        # 한글 주석: 2. 누적 수익률 곡선
        plt.subplot(2, 2, 2)
        cumulative_returns = (1 + df['return_pct'] / 100).cumprod()
        plt.plot(cumulative_returns.index, cumulative_returns.values, linewidth=2, color='green')
        plt.title('누적 수익률 곡선')
        plt.xlabel('거래 번호')
        plt.ylabel('누적 수익률')
        plt.grid(True, alpha=0.3)
        
        # 한글 주석: 3. 수익/손실 거래 비교
        plt.subplot(2, 2, 3)
        winning_trades = df[df['return_pct'] > 0]['return_pct']
        losing_trades = df[df['return_pct'] < 0]['return_pct']
        
        labels = ['수익 거래', '손실 거래']
        counts = [len(winning_trades), len(losing_trades)]
        colors = ['green', 'red']
        
        plt.pie(counts, labels=labels, colors=colors, autopct='%1.1f%%', startangle=90)
        plt.title('수익/손실 거래 비율')
        
        # 한글 주석: 4. 월별 성과 (timestamp가 있는 경우)
        plt.subplot(2, 2, 4)
        if 'timestamp' in df.columns:
            try:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                df['month'] = df['timestamp'].dt.to_period('M')
                monthly_returns = df.groupby('month')['return_pct'].sum()
                
                monthly_returns.plot(kind='bar', color='purple', alpha=0.7)
                plt.title('월별 총 수익률')
                plt.xlabel('월')
                plt.ylabel('수익률 (%)')
                plt.xticks(rotation=45)
                plt.grid(True, alpha=0.3)
            except:
                plt.text(0.5, 0.5, '월별 데이터\n분석 불가', ha='center', va='center', transform=plt.gca().transAxes)
                plt.title('월별 성과')
        else:
            plt.text(0.5, 0.5, '타임스탬프\n데이터 없음', ha='center', va='center', transform=plt.gca().transAxes)
            plt.title('월별 성과')
        
        plt.tight_layout()
        
        # 한글 주석: 차트 저장
        chart_path = Path(save_dir) / f"performance_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        plt.savefig(chart_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info(f"성과 시각화 저장: {chart_path}")
        
        # 한글 주석: 드로우다운 차트 별도 생성
        self._create_drawdown_chart(df, save_dir)
    
    def _create_drawdown_chart(self, df: pd.DataFrame, save_dir: str):
        """드로우다운 차트 생성"""
        
        cumulative_returns = (1 + df['return_pct'] / 100).cumprod()
        running_max = cumulative_returns.expanding().max()
        drawdown = (cumulative_returns - running_max) / running_max * 100
        
        plt.figure(figsize=(12, 6))
        
        plt.subplot(2, 1, 1)
        plt.plot(cumulative_returns.index, cumulative_returns.values, linewidth=2, color='blue', label='누적 수익률')
        plt.plot(running_max.index, running_max.values, linewidth=1, color='red', linestyle='--', label='최고점')
        plt.title('누적 수익률과 최고점')
        plt.ylabel('누적 수익률')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        plt.subplot(2, 1, 2)
        plt.fill_between(drawdown.index, drawdown.values, 0, color='red', alpha=0.3)
        plt.plot(drawdown.index, drawdown.values, linewidth=2, color='red')
        plt.title(f'드로우다운 (최대: {drawdown.min():.2f}%)')
        plt.xlabel('거래 번호')
        plt.ylabel('드로우다운 (%)')
        plt.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        drawdown_path = Path(save_dir) / f"drawdown_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        plt.savefig(drawdown_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info(f"드로우다운 차트 저장: {drawdown_path}")
    
    def generate_comprehensive_report(self, save_path: str = None) -> Dict:
        """
        종합 분석 리포트 생성
        
        Args:
            save_path: 리포트 저장 경로
            
        Returns:
            종합 리포트
        """
        logger.info("종합 분석 리포트 생성 중...")
        
        # 한글 주석: 거래 성과 분석
        trading_performance = self.analyze_trading_performance()
        
        # 한글 주석: 모델 성능 로드
        model_performance = self.load_model_metrics()
        
        # 한글 주석: 시각화 생성
        self.create_performance_visualizations()
        
        # 한글 주석: 종합 리포트 구성
        comprehensive_report = {
            'report_metadata': {
                'generated_at': datetime.now().isoformat(),
                'analysis_period': '1_year_backtest',
                'total_data_points': len(self.backtest_data) if self.backtest_data is not None else 0
            },
            'trading_performance': trading_performance,
            'model_performance': model_performance.get('metrics', {}),
            'key_insights': self._generate_key_insights(trading_performance, model_performance),
            'recommendations': self._generate_recommendations(trading_performance, model_performance)
        }
        
        # 한글 주석: 리포트 저장
        if save_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            save_path = f"data/reports/comprehensive_report_{timestamp}.json"
        
        Path(save_path).parent.mkdir(parents=True, exist_ok=True)
        
        with open(save_path, 'w', encoding='utf-8') as f:
            json.dump(comprehensive_report, f, indent=2, ensure_ascii=False)
        
        logger.info(f"종합 리포트 저장: {save_path}")
        return comprehensive_report
    
    def _generate_key_insights(self, trading_perf: Dict, model_perf: Dict) -> List[str]:
        """핵심 인사이트 생성"""
        insights = []
        
        if trading_perf.get('basic_stats'):
            win_rate = trading_perf['basic_stats']['win_rate_pct']
            total_trades = trading_perf['basic_stats']['total_trades']
            
            if win_rate > 60:
                insights.append(f"높은 승률 달성: {win_rate:.1f}% (총 {total_trades:,}건 거래)")
            elif win_rate > 45:
                insights.append(f"적정 승률 유지: {win_rate:.1f}% (총 {total_trades:,}건 거래)")
            else:
                insights.append(f"승률 개선 필요: {win_rate:.1f}% (총 {total_trades:,}건 거래)")
        
        if trading_perf.get('risk_metrics'):
            sharpe = trading_perf['risk_metrics']['sharpe_ratio']
            mdd = trading_perf['risk_metrics']['max_drawdown_pct']
            
            if sharpe > 1.0:
                insights.append(f"우수한 위험조정수익률: 샤프비율 {sharpe:.3f}")
            elif sharpe > 0.5:
                insights.append(f"양호한 위험조정수익률: 샤프비율 {sharpe:.3f}")
            else:
                insights.append(f"위험조정수익률 개선 필요: 샤프비율 {sharpe:.3f}")
                
            if abs(mdd) < 10:
                insights.append(f"안정적인 리스크 관리: 최대낙폭 {mdd:.1f}%")
            else:
                insights.append(f"리스크 관리 주의 필요: 최대낙폭 {mdd:.1f}%")
        
        if model_perf.get('test_r2'):
            r2 = model_perf['test_r2']
            if r2 > 0.3:
                insights.append(f"높은 예측 성능: R² {r2:.3f}")
            elif r2 > 0.1:
                insights.append(f"적정 예측 성능: R² {r2:.3f}")
            else:
                insights.append(f"예측 성능 개선 필요: R² {r2:.3f}")
        
        return insights
    
    def _generate_recommendations(self, trading_perf: Dict, model_perf: Dict) -> List[str]:
        """개선 추천사항 생성"""
        recommendations = []
        
        # 한글 주석: 거래 성과 기반 추천
        if trading_perf.get('basic_stats', {}).get('win_rate_pct', 0) < 45:
            recommendations.append("전략 임계값을 조정하여 거래 품질을 개선하세요")
        
        if trading_perf.get('risk_metrics', {}).get('sharpe_ratio', 0) < 0.5:
            recommendations.append("포지션 사이징과 리스크 관리 로직을 강화하세요")
        
        if abs(trading_perf.get('risk_metrics', {}).get('max_drawdown_pct', 0)) > 15:
            recommendations.append("최대낙폭 관리를 위한 손절매 로직을 개선하세요")
        
        # 한글 주석: 모델 성능 기반 추천
        if model_perf.get('test_r2', 0) < 0.1:
            recommendations.append("피처 엔지니어링을 개선하여 모델 예측력을 높이세요")
        
        if model_perf.get('overfit_ratio', 0) > 0.1:
            recommendations.append("정규화 파라미터를 조정하여 과적합을 방지하세요")
        
        # 한글 주석: 일반적인 추천
        total_trades = trading_perf.get('basic_stats', {}).get('total_trades', 0)
        if total_trades < 1000:
            recommendations.append("더 많은 거래 데이터를 수집하여 통계적 신뢰성을 높이세요")
        
        if not recommendations:
            recommendations.append("현재 성능이 양호합니다. 라이브 트레이딩을 고려해보세요")
        
        return recommendations

def quick_analysis(
    backtest_dir: str = "data/backtest_results",
    models_dir: str = "data/models"
) -> Dict:
    """
    빠른 분석 실행
    
    Args:
        backtest_dir: 백테스트 결과 디렉토리
        models_dir: 모델 디렉토리
        
    Returns:
        분석 결과
    """
    logger.info("빠른 분석 시작")
    
    analyzer = BacktestAnalyzer()
    
    # 한글 주석: 데이터 로드
    analyzer.load_backtest_results(backtest_dir)
    
    # 한글 주석: 종합 리포트 생성
    report = analyzer.generate_comprehensive_report()
    
    logger.info("빠른 분석 완료")
    return report

if __name__ == "__main__":
    # 한글 주석: 분석 도구 단독 실행
    logging.basicConfig(level=logging.INFO)
    
    print("🔍 1년치 백테스트 분석 시작...")
    
    try:
        report = quick_analysis()
        
        print("\n📊 분석 결과 요약:")
        if report.get('trading_performance', {}).get('basic_stats'):
            stats = report['trading_performance']['basic_stats']
            print(f"   총 거래: {stats['total_trades']:,}건")
            print(f"   승률: {stats['win_rate_pct']:.1f}%")
        
        if report.get('trading_performance', {}).get('risk_metrics'):
            risk = report['trading_performance']['risk_metrics']
            print(f"   샤프비율: {risk['sharpe_ratio']:.3f}")
            print(f"   최대낙폭: {risk['max_drawdown_pct']:.1f}%")
        
        print("\n💡 핵심 인사이트:")
        for insight in report.get('key_insights', [])[:3]:
            print(f"   • {insight}")
        
        print("\n✅ 분석 완료! 상세 리포트가 data/reports/에 저장되었습니다.")
        
    except Exception as e:
        print(f"❌ 분석 실패: {e}")
        logger.error(f"분석 도구 실행 실패: {e}")

