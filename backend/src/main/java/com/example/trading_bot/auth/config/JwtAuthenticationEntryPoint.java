package com.example.trading_bot.auth.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * JWT 인증 실패 시 401 상태 코드를 반환하는 엔트리 포인트
 * Spring Security 기본 동작(403)을 override하여 명확한 인증 실패 응답 제공
 */
@Slf4j
@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {
    
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    @Override
    public void commence(HttpServletRequest request, 
                        HttpServletResponse response,
                        AuthenticationException authException) throws IOException, ServletException {
        
        log.debug("Authentication failed for request: {} - {}", 
                request.getRequestURI(), authException.getMessage());
        
        // 401 Unauthorized 상태 설정
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        
        // 에러 응답 본문 생성
        Map<String, Object> body = new HashMap<>();
        body.put("status", HttpServletResponse.SC_UNAUTHORIZED);
        body.put("error", "Unauthorized");
        body.put("message", "Authentication failed: " + authException.getMessage());
        body.put("path", request.getServletPath());
        body.put("timestamp", System.currentTimeMillis());
        
        // JSON 응답 전송
        objectMapper.writeValue(response.getOutputStream(), body);
    }
}