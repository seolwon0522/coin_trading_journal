package com.example.trading_bot.common.util;

import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

/**
 * 암호화 키 생성 유틸리티
 * 올바른 형식의 AES-256 키를 생성합니다.
 */
public class CryptoKeyGen {
    
    public static void main(String[] args) throws NoSuchAlgorithmException {
        // AES-256 키 생성
        KeyGenerator keyGen = KeyGenerator.getInstance("AES");
        keyGen.init(256); // AES-256
        SecretKey secretKey = keyGen.generateKey();
        String encodedKey = Base64.getEncoder().encodeToString(secretKey.getEncoded());
        
        System.out.println("===========================================");
        System.out.println("새로운 AES-256 암호화 키:");
        System.out.println(encodedKey);
        System.out.println("===========================================");
        System.out.println("키 길이: " + secretKey.getEncoded().length + " 바이트");
        System.out.println("===========================================");
        
        // JWT용 키도 생성 (최소 32자)
        String jwtKey = "ThisIsAVerySecureJWTSecretKeyForDevelopmentUse1234567890AbcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        System.out.println("JWT 시크릿 키:");
        System.out.println(jwtKey);
        System.out.println("JWT 키 길이: " + jwtKey.length() + " 문자");
        System.out.println("===========================================");
    }
}