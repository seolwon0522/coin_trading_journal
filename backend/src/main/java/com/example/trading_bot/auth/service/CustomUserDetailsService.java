package com.example.trading_bot.auth.service;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.auth.exception.AuthException;
import com.example.trading_bot.auth.repository.UserRepository;
import com.example.trading_bot.auth.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Spring Security와 통합되는 사용자 상세 정보 서비스
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * 이메일로 사용자 정보 로드
     */
    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다: " + email));
        
        return new UserPrincipal(user);
    }
    
    /**
     * ID로 사용자 정보 로드 (JWT 필터에서 사용)
     */
    @Transactional(readOnly = true)
    public UserDetails loadUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(AuthException::userNotFound);
        
        return new UserPrincipal(user);
    }
}
