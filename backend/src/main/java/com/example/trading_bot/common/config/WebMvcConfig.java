package com.example.trading_bot.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC 설정 - API 경로와 정적 리소스 경로 명확히 구분
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
    
    /**
     * 정적 리소스 핸들러 설정
     * API 경로는 정적 리소스로 처리되지 않도록 명시적으로 설정
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 정적 리소스는 /static/ 경로에서만 제공
        registry.addResourceHandler("/static/**")
                .addResourceLocations("classpath:/static/");
        
        // Swagger UI를 위한 설정
        registry.addResourceHandler("/swagger-ui/**")
                .addResourceLocations("classpath:/META-INF/resources/webjars/springfox-swagger-ui/");
        
        // API 경로는 정적 리소스 핸들러에서 제외
        // /api/** 경로는 컨트롤러에서만 처리
    }
}