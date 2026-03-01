import { trpc } from "@/lib/trpc";
import { Briefcase, ClipboardCheck, MessageSquare, Star, TrendingUp, Users } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const [, setLocation] = useLocation();

  const statCards = [
    {
      label: "総事件数",
      value: stats?.totalCases ?? 0,
      icon: Briefcase,
      color: "text-primary",
      bg: "bg-primary/10",
      action: () => setLocation("/cases"),
    },
    {
      label: "進行中の事件",
      value: stats?.ongoingCases ?? 0,
      icon: TrendingUp,
      color: "text-amber-600",
      bg: "bg-amber-50",
      action: () => setLocation("/cases"),
    },
    {
      label: "依頼者数",
      value: stats?.totalClients ?? 0,
      icon: Users,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      action: () => setLocation("/clients"),
    },
    {
      label: "アンケート回答数",
      value: stats?.surveyStats.total ?? 0,
      icon: MessageSquare,
      color: "text-violet-600",
      bg: "bg-violet-50",
      action: () => setLocation("/surveys"),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">ダッシュボード</h1>
        <p className="text-sm text-muted-foreground mt-1">朝日弁護士法人 業務管理システム</p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <button
            key={card.label}
            onClick={card.action}
            className="bg-card rounded-xl border border-border p-5 text-left hover:shadow-md transition-all hover:border-primary/30 group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {isLoading ? "—" : card.value.toLocaleString()}
                </p>
              </div>
              <div className={`${card.bg} p-2.5 rounded-lg`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* アンケート満足度サマリー */}
      {stats && stats.surveyStats.total > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            アンケート満足度サマリー
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">{stats.surveyStats.avgSatisfaction}</p>
              <p className="text-sm text-muted-foreground mt-1">平均満足度（5点満点）</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-emerald-600">{stats.surveyStats.highSatisfaction}</p>
              <p className="text-sm text-muted-foreground mt-1">高評価（4点以上）</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-foreground">{stats.surveyStats.total}</p>
              <p className="text-sm text-muted-foreground mt-1">総回答数</p>
            </div>
          </div>
        </div>
      )}

      {/* クイックアクション */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          クイックアクション
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            onClick={() => setLocation("/cases/new")}
            className="flex items-center gap-3 p-4 rounded-lg border border-dashed border-primary/40 hover:bg-primary/5 hover:border-primary transition-all text-left"
          >
            <div className="bg-primary/10 p-2 rounded-lg">
              <Briefcase className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">新規事件登録</p>
              <p className="text-xs text-muted-foreground">依頼者情報・事件情報を入力</p>
            </div>
          </button>
          <button
            onClick={() => setLocation("/survey")}
            className="flex items-center gap-3 p-4 rounded-lg border border-dashed border-violet-300 hover:bg-violet-50 hover:border-violet-400 transition-all text-left"
          >
            <div className="bg-violet-100 p-2 rounded-lg">
              <MessageSquare className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">アンケートを開く</p>
              <p className="text-xs text-muted-foreground">相談後に相談者へ渡す</p>
            </div>
          </button>
          <button
            onClick={() => setLocation("/surveys")}
            className="flex items-center gap-3 p-4 rounded-lg border border-dashed border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 transition-all text-left"
          >
            <div className="bg-emerald-100 p-2 rounded-lg">
              <Star className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">回答一覧を確認</p>
              <p className="text-xs text-muted-foreground">アンケート回答を管理</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
