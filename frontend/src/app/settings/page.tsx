'use client';

import { useState, FormEvent } from 'react';
import { User, Database, Keyboard, Bell } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function SettingsPage() {
  const [nickname, setNickname] = useState('');
  const [twoFactor, setTwoFactor] = useState(false);
  const [binanceApiKey, setBinanceApiKey] = useState('');
  const [binanceSecretKey, setBinanceSecretKey] = useState('');

  // 알림 설정 상태
  const [lossAlert, setLossAlert] = useState(true);
  const [consecutiveLossCount, setConsecutiveLossCount] = useState(3);
  const [lossThreshold, setLossThreshold] = useState(5);
  const [marketAlert, setMarketAlert] = useState(true);
  const [tradeAlert, setTradeAlert] = useState(true);

  const handleProfileSave = (e: FormEvent) => {
    e.preventDefault();
    console.log('profile saved', { nickname, twoFactor });
  };

  const handleResetData = () => {
    console.log('reset data');
  };

  const handleExportData = () => {
    console.log('export data');
  };

  const handleImportData = () => {
    console.log('import data');
  };

  const handleBinanceApiSave = () => {
    console.log('바이낸스 API 키 저장', { binanceApiKey, binanceSecretKey });
  };

  const handleNotificationSave = () => {
    console.log('알림 설정 저장', {
      lossAlert,
      consecutiveLossCount,
      lossThreshold,
      marketAlert,
      tradeAlert,
    });
  };

  return (
    <div className="min-h-full bg-background">
      <div className="border-b bg-muted/50">
        <div className="px-6 py-8">
          <h1 className="text-3xl font-bold tracking-tight">설정</h1>
          <p className="text-muted-foreground mt-2">애플리케이션 설정을 관리하세요.</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* 계정 및 프로필 설정 */}
        <section className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="h-5 w-5" /> 계정 및 프로필
            </h2>
            <p className="text-muted-foreground mt-1">프로필 정보와 보안 설정을 관리합니다.</p>
          </div>

          <form onSubmit={handleProfileSave} className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">닉네임</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임을 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar">프로필 이미지</Label>
              <Input id="avatar" type="file" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호 변경</Label>
              <Input id="password" type="password" placeholder="새 비밀번호" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="otp">2단계 인증(OTP)</Label>
                <p className="text-sm text-muted-foreground">추가 보안을 위해 OTP를 사용합니다.</p>
              </div>
              <Switch id="otp" checked={twoFactor} onCheckedChange={setTwoFactor} />
            </div>

            <Button type="submit" className="mt-4">
              변경 사항 저장
            </Button>
          </form>
        </section>

        {/* 데이터 관리 */}
        <section className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Database className="h-5 w-5" /> 데이터 관리
            </h2>
            <p className="text-muted-foreground mt-1">데이터 백업, 복구 및 초기화를 수행합니다.</p>
          </div>

          <div className="p-6 space-y-4">
            <Button variant="destructive" onClick={handleResetData}>
              데이터 초기화
            </Button>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={handleExportData} className="flex-1">
                백업/내보내기
              </Button>
              <Button variant="outline" onClick={handleImportData} className="flex-1">
                데이터 가져오기
              </Button>
            </div>
          </div>
        </section>

        {/* 알림 설정 */}
        <section className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5" /> 알림 설정
            </h2>
            <p className="text-muted-foreground mt-1">거래 활동에 대한 알림을 설정합니다.</p>
          </div>

          <div className="p-6 space-y-6">
            {/* 연속 손실 알림 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="loss-alert">연속 손실 알림</Label>
                  <p className="text-sm text-muted-foreground">
                    연속 손실이 발생하면 경고를 받습니다.
                  </p>
                </div>
                <Switch id="loss-alert" checked={lossAlert} onCheckedChange={setLossAlert} />
              </div>

              {lossAlert && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label htmlFor="consecutive-loss-count">연속 손실 기준</Label>
                    <Input
                      id="consecutive-loss-count"
                      type="number"
                      value={consecutiveLossCount}
                      onChange={(e) => setConsecutiveLossCount(Number(e.target.value))}
                      placeholder="3"
                      min="1"
                      max="10"
                    />
                    <p className="text-sm text-muted-foreground">
                      일 연속 손실 시 알림을 받습니다.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="loss-threshold">손실 임계값</Label>
                    <Input
                      id="loss-threshold"
                      type="number"
                      value={lossThreshold}
                      onChange={(e) => setLossThreshold(Number(e.target.value))}
                      placeholder="5"
                      min="1"
                      max="20"
                    />
                    <p className="text-sm text-muted-foreground">
                      % 이상 손실 시 긴급 알림을 받습니다.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 시장 알림 */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="market-alert">시장 알림</Label>
                <p className="text-sm text-muted-foreground">
                  주요 코인 가격 변동 시 알림을 받습니다.
                </p>
              </div>
              <Switch id="market-alert" checked={marketAlert} onCheckedChange={setMarketAlert} />
            </div>

            {/* 거래 완료 알림 */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="trade-alert">거래 완료 알림</Label>
                <p className="text-sm text-muted-foreground">거래가 완료되면 알림을 받습니다.</p>
              </div>
              <Switch id="trade-alert" checked={tradeAlert} onCheckedChange={setTradeAlert} />
            </div>

            <Button onClick={handleNotificationSave} className="mt-4">
              알림 설정 저장
            </Button>
          </div>
        </section>

        {/* 바이낸스 API 키 설정 */}
        <section className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Keyboard className="h-5 w-5" /> 바이낸스 API 키
            </h2>
            <p className="text-muted-foreground mt-1">
              바이낸스 API 키를 입력하여 거래내역을 조회합니다.
            </p>
            <p className="text-sm text-blue-600 mt-2 bg-blue-50 p-3 rounded-md border border-blue-200">
              🔒 <strong>보안 안내:</strong> 입력하신 API 키와 시크릿 키는 암호화되어 안전하게
              저장되므로 걱정하지 마세요.
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="binance-api-key">API 키</Label>
              <Input
                id="binance-api-key"
                type="password"
                value={binanceApiKey}
                onChange={(e) => setBinanceApiKey(e.target.value)}
                placeholder="바이낸스 API 키를 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="binance-secret-key">시크릿 키</Label>
              <Input
                id="binance-secret-key"
                type="password"
                value={binanceSecretKey}
                onChange={(e) => setBinanceSecretKey(e.target.value)}
                placeholder="바이낸스 시크릿 키를 입력하세요"
              />
            </div>

            <Button onClick={handleBinanceApiSave} className="mt-4">
              API 키 저장
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
