package com.example.trading_bot.nautilus;

/**
 * Nautilus 트레이딩 엔진 통신 중 발생하는 예외
 *
 * 네트워크 오류, API 오류, 타임아웃 등의 상황에서 발생합니다.
 */
public class NautilusClientException extends RuntimeException {

    public NautilusClientException(String message) {
        super(message);
    }

    public NautilusClientException(String message, Throwable cause) {
        super(message, cause);
    }
}