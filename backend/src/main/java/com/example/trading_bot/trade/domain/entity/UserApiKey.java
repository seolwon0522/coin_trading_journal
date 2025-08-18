package com.example.trading_bot.trade.domain.entity;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_api_keys", indexes = {
    @Index(name = "idx_user_api_keys_user_id", columnList = "user_id"),
    @Index(name = "idx_user_api_keys_exchange", columnList = "exchange")
})
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class UserApiKey extends BaseTimeEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(nullable = false, length = 20)
    private String exchange; // "BINANCE", "UPBIT", etc.
    
    @Column(nullable = false, length = 100)
    private String apiKey;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String encryptedSecretKey; // AES-256으로 암호화된 Secret Key
    
    @Column(length = 50)
    private String keyName; // 사용자가 지정한 키 이름
    
    @Column
    @Builder.Default
    private Boolean isActive = true;
    
    @Column
    @Builder.Default
    private Boolean canTrade = false;
    
    @Column
    @Builder.Default
    private Boolean canWithdraw = false;
    
    @Column
    private LocalDateTime lastUsedAt;
    
    @Column
    private LocalDateTime lastSyncAt;
    
    @Column
    @Builder.Default
    private Integer syncFailureCount = 0;
    
    @Column(columnDefinition = "TEXT")
    private String permissions; // JSON 형태로 저장된 권한 목록
}