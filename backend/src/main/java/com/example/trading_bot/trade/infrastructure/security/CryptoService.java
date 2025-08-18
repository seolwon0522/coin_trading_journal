package com.example.trading_bot.trade.infrastructure.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.security.spec.KeySpec;
import java.util.Base64;

@Service
@Slf4j
public class CryptoService {
    
    private static final String ALGORITHM = "AES/CBC/PKCS5Padding";
    private static final String SECRET_KEY_ALGORITHM = "PBKDF2WithHmacSHA256";
    private static final int ITERATION_COUNT = 65536;
    private static final int KEY_LENGTH = 256;
    
    @Value("${crypto.secret-key:defaultSecretKey123!@#}")
    private String masterKey;
    
    @Value("${crypto.salt:defaultSalt456$%^}")
    private String salt;
    
    /**
     * 문자열을 암호화합니다.
     * 
     * @param plainText 평문
     * @return Base64로 인코딩된 암호문 (IV 포함)
     */
    public String encrypt(String plainText) {
        try {
            // IV 생성
            byte[] iv = new byte[16];
            new SecureRandom().nextBytes(iv);
            IvParameterSpec ivSpec = new IvParameterSpec(iv);
            
            // 키 생성
            SecretKey key = generateKey();
            
            // 암호화
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, key, ivSpec);
            byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            
            // IV와 암호문을 결합
            byte[] combined = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(cipherText, 0, combined, iv.length, cipherText.length);
            
            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            log.error("Encryption failed", e);
            throw new RuntimeException("암호화 실패", e);
        }
    }
    
    /**
     * 암호문을 복호화합니다.
     * 
     * @param encryptedText Base64로 인코딩된 암호문 (IV 포함)
     * @return 평문
     */
    public String decrypt(String encryptedText) {
        try {
            byte[] combined = Base64.getDecoder().decode(encryptedText);
            
            // IV 추출
            byte[] iv = new byte[16];
            System.arraycopy(combined, 0, iv, 0, iv.length);
            IvParameterSpec ivSpec = new IvParameterSpec(iv);
            
            // 암호문 추출
            byte[] cipherText = new byte[combined.length - iv.length];
            System.arraycopy(combined, iv.length, cipherText, 0, cipherText.length);
            
            // 키 생성
            SecretKey key = generateKey();
            
            // 복호화
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, key, ivSpec);
            byte[] plainText = cipher.doFinal(cipherText);
            
            return new String(plainText, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Decryption failed", e);
            throw new RuntimeException("복호화 실패", e);
        }
    }
    
    /**
     * 마스터 키와 salt를 사용하여 AES 키를 생성합니다.
     */
    private SecretKey generateKey() throws Exception {
        SecretKeyFactory factory = SecretKeyFactory.getInstance(SECRET_KEY_ALGORITHM);
        KeySpec spec = new PBEKeySpec(
            masterKey.toCharArray(),
            salt.getBytes(StandardCharsets.UTF_8),
            ITERATION_COUNT,
            KEY_LENGTH
        );
        SecretKey tmp = factory.generateSecret(spec);
        return new SecretKeySpec(tmp.getEncoded(), "AES");
    }
    
    /**
     * API 키를 마스킹합니다. (앞 4자리와 뒤 4자리만 표시)
     * 
     * @param apiKey 원본 API 키
     * @return 마스킹된 API 키
     */
    public String maskApiKey(String apiKey) {
        if (apiKey == null || apiKey.length() < 8) {
            return "****";
        }
        
        int length = apiKey.length();
        String prefix = apiKey.substring(0, 4);
        String suffix = apiKey.substring(length - 4);
        String masked = "*".repeat(Math.max(0, length - 8));
        
        return prefix + masked + suffix;
    }
}