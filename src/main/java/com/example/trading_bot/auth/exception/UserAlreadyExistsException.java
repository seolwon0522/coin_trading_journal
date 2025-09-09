package com.example.trading_bot.auth.exception;

import com.example.trading_bot.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

/**
 * 사용자 중복 예외
 */
public class UserAlreadyExistsException extends BusinessException {
    
    public UserAlreadyExistsException(String email) {
        super(String.format("이미 존재하는 이메일입니다: %s", email), 
              HttpStatus.CONFLICT, 
              "USER_ALREADY_EXISTS");
    }
}