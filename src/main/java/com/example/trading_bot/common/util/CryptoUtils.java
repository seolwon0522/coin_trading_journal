package com.example.trading_bot.common.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM 암호화 유틸리티
 * API 키와 같은 민감한 정보를 안전하게 암호화/복호화합니다.
 */
@Slf4j
@Component
public class CryptoUtils {
    
    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int TAG_LENGTH_BIT = 128;
    private static final int IV_LENGTH_BYTE = 12;
    private static final int KEY_SIZE = 256;
    
    private final SecretKey secretKey;
    
    /**
     * 생성자 - 환경 변수에서 암호화 키를 로드하거나 새로 생성합니다.
     * 
     * @param encodedKey Base64로 인코딩된 암호화 키 (환경 변수에서 로드)
     */
    public CryptoUtils(@Value("${crypto.secret.key:}") String encodedKey) {
        if (encodedKey == null || encodedKey.isEmpty()) {
            // 개발 환경용 - 프로덕션에서는 반드시 환경 변수 설정 필요
            log.warn("암호화 키가 설정되지 않았습니다. 새로운 키를 생성합니다.");
            this.secretKey = generateNewKey();
            log.info("새로운 암호화 키 (환경 변수에 설정 필요): {}", 
                    Base64.getEncoder().encodeToString(this.secretKey.getEncoded()));
        } else {
            byte[] decodedKey = Base64.getDecoder().decode(encodedKey);
            this.secretKey = new SecretKeySpec(decodedKey, 0, decodedKey.length, ALGORITHM);
        }
    }
    
    /**
     * 문자열을 암호화합니다.
     * 
     * @param plainText 암호화할 평문
     * @return Base64로 인코딩된 암호문 (IV 포함)
     */
    public String encrypt(String plainText) {
        if (plainText == null || plainText.isEmpty()) {
            return null;
        }
        
        try {
            // IV 생성 (각 암호화마다 새로운 IV 사용)
            byte[] iv = generateIv();
            
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, parameterSpec);
            
            byte[] cipherText = cipher.doFinal(plainText.getBytes());
            
            // IV와 암호문을 함께 저장 (IV + 암호문)
            byte[] cipherTextWithIv = new byte[IV_LENGTH_BYTE + cipherText.length];
            System.arraycopy(iv, 0, cipherTextWithIv, 0, IV_LENGTH_BYTE);
            System.arraycopy(cipherText, 0, cipherTextWithIv, IV_LENGTH_BYTE, cipherText.length);
            
            return Base64.getEncoder().encodeToString(cipherTextWithIv);
        } catch (Exception e) {
            log.error("암호화 중 오류 발생", e);
            throw new RuntimeException("암호화 실패", e);
        }
    }
    
    /**
     * 암호화된 문자열을 복호화합니다.
     * 
     * @param encryptedText Base64로 인코딩된 암호문 (IV 포함)
     * @return 복호화된 평문
     */
    public String decrypt(String encryptedText) {
        if (encryptedText == null || encryptedText.isEmpty()) {
            return null;
        }
        
        try {
            byte[] cipherTextWithIv = Base64.getDecoder().decode(encryptedText);
            
            // IV와 암호문 분리
            byte[] iv = new byte[IV_LENGTH_BYTE];
            byte[] cipherText = new byte[cipherTextWithIv.length - IV_LENGTH_BYTE];
            System.arraycopy(cipherTextWithIv, 0, iv, 0, IV_LENGTH_BYTE);
            System.arraycopy(cipherTextWithIv, IV_LENGTH_BYTE, cipherText, 0, cipherText.length);
            
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, parameterSpec);
            
            byte[] plainText = cipher.doFinal(cipherText);
            return new String(plainText);
        } catch (Exception e) {
            log.error("복호화 중 오류 발생", e);
            throw new RuntimeException("복호화 실패", e);
        }
    }
    
    /**
     * 새로운 AES-256 키를 생성합니다.
     * 
     * @return 새로운 SecretKey
     */
    private SecretKey generateNewKey() {
        try {
            KeyGenerator keyGenerator = KeyGenerator.getInstance(ALGORITHM);
            keyGenerator.init(KEY_SIZE);
            return keyGenerator.generateKey();
        } catch (Exception e) {
            log.error("키 생성 중 오류 발생", e);
            throw new RuntimeException("키 생성 실패", e);
        }
    }
    
    /**
     * 무작위 IV(Initialization Vector)를 생성합니다.
     * 
     * @return 12바이트 IV
     */
    private byte[] generateIv() {
        byte[] iv = new byte[IV_LENGTH_BYTE];
        new SecureRandom().nextBytes(iv);
        return iv;
    }
    
    /**
     * 암호화 키가 유효한지 확인합니다.
     * 
     * @return 키가 유효하면 true
     */
    public boolean isKeyValid() {
        try {
            String testText = "test";
            String encrypted = encrypt(testText);
            String decrypted = decrypt(encrypted);
            return testText.equals(decrypted);
        } catch (Exception e) {
            return false;
        }
    }
}