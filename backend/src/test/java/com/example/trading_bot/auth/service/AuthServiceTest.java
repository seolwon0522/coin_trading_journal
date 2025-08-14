package com.example.trading_bot.auth.service;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.auth.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * AuthService 테스트 클래스
 * 회원가입 DB 저장 테스트
 */
@SpringBootTest
@ActiveProfiles("local")
@Transactional
public class AuthServiceTest {

    @Autowired
    private AuthService authService;
    
    @Autowired
    private UserRepository userRepository;

    @Test
    public void 일반_회원가입_테스트() {
        // given
        String email = "test@example.com";
        String password = "password123!";
        String name = "테스트유저";
        
        // when
        User savedUser = authService.registerLocalUser(email, password, name);
        
        // then
        assertThat(savedUser).isNotNull();
        assertThat(savedUser.getId()).isNotNull();
        assertThat(savedUser.getEmail()).isEqualTo(email);
        assertThat(savedUser.getName()).isEqualTo(name);
        
        // DB에 실제로 저장되었는지 확인
        User foundUser = userRepository.findByEmail(email).orElse(null);
        assertThat(foundUser).isNotNull();
        assertThat(foundUser.getEmail()).isEqualTo(email);
        
        System.out.println("저장된 사용자 ID: " + savedUser.getId());
        System.out.println("저장된 사용자 이메일: " + savedUser.getEmail());
        System.out.println("저장된 사용자 이름: " + savedUser.getName());
    }
}