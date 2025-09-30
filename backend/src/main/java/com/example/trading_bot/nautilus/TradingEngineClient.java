package com.example.trading_bot.nautilus;

import com.example.trading_bot.nautilus.dto.NautilusStartStrategyRequest;
import com.example.trading_bot.nautilus.dto.NautilusStrategyStatus;

import java.util.Optional;

/**
 * 트레이딩 엔진 클라이언트 인터페이스
 *
 * 외부 트레이딩 엔진(Nautilus 등)과의 통신을 추상화합니다.
 * 테스트 용이성과 확장성을 위해 인터페이스로 정의되었습니다.
 *
 * @see NautilusClient 기본 구현체
 */
public interface TradingEngineClient {

    /**
     * 트레이딩 전략 시작
     *
     * @param request 전략 설정 정보
     * @throws NautilusClientException 요청 실패 시
     */
    void startStrategy(NautilusStartStrategyRequest request);

    /**
     * 실행 중인 전략 중지
     *
     * @param strategyId 전략 ID
     * @throws NautilusClientException 요청 실패 시
     */
    void stopStrategy(String strategyId);

    /**
     * 전략 상태 조회
     *
     * @param strategyId 전략 ID
     * @return 전략 상태 (존재하지 않으면 empty)
     * @throws NautilusClientException 요청 실패 시
     */
    Optional<NautilusStrategyStatus> getStrategyStatus(String strategyId);

    /**
     * 트레이딩 엔진 가용성 확인
     *
     * @return 엔진이 정상적으로 응답하면 true
     */
    boolean isHealthy();
}