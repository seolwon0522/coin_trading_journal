package com.example.trading_bot.dashboard.controller;

import com.example.trading_bot.dashboard.dto.DashboardSummaryResponse;
import com.example.trading_bot.dashboard.service.DashboardService;
import com.example.trading_bot.user.model.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Slf4j
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    public ResponseEntity<DashboardSummaryResponse> getSummary(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        log.info("GET /api/dashboard/summary - user: {}", userDetails.getUsername());

        DashboardSummaryResponse summary = dashboardService.getSummary(userDetails.getId());
        return ResponseEntity.ok(summary);
    }
}