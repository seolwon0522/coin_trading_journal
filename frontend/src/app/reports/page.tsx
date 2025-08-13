export default function ReportsPage() {
  return (
    <div className="min-h-full bg-background">
      <div className="border-b bg-muted/50">
        <div className="px-6 py-8">
          <h1 className="text-3xl font-bold tracking-tight">리포트</h1>
          <p className="text-muted-foreground mt-2">투자 성과 분석 리포트를 확인하세요.</p>
        </div>
      </div>

      <div className="p-6">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-8 text-center">
          <h3 className="text-lg font-semibold mb-2">리포트 준비 중</h3>
          <p className="text-muted-foreground">리포트 기능이 곧 제공될 예정입니다.</p>
        </div>
      </div>
    </div>
  );
}
