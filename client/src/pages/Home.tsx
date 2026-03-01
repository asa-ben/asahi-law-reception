import { trpc } from "@/lib/trpc";
import { CheckCircle2, ClipboardList, Link2, MessageSquare, Star, Users } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { data: stats, isLoading } = trpc.intake.stats.useQuery();
  const { data: surveyStats } = trpc.survey.stats.useQuery();
  const [, setLocation] = useLocation();
  const createSession = trpc.intake.createSession.useMutation({
    onSuccess: async (data) => {
      const url = `${window.location.origin}/intake/${data.token}`;
      await navigator.clipboard.writeText(url);
      import("sonner").then(({ toast }) =>
        toast.success("受付URLをコピーしました", { description: url })
      );
    },
  });

  const statCards = [
    {
      label: "本日の受付",
      value: stats?.todayCount ?? 0,
      icon: Users,
      color: "text-[#0d2a6e]",
      bg: "bg-[#0d2a6e]/10",
    },
    {
      label: "相談待ち・相談中",
      value: stats?.waiting ?? 0,
      icon: ClipboardList,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "SF登録待ち",
      value: stats?.sfPending ?? 0,
      icon: CheckCircle2,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "アンケート回答数",
      value: surveyStats?.total ?? 0,
      icon: MessageSquare,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">ダッシュボード</h1>
        <p className="text-sm text-muted-foreground mt-1">朝日弁護士法人 依頼者登録システム</p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-card rounded-xl border border-border p-5"
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
          </div>
        ))}
      </div>

      {/* アンケート満足度サマリー */}
      {surveyStats && surveyStats.total > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            アンケート満足度サマリー
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-[#0d2a6e]">{surveyStats.avgSatisfaction}</p>
              <p className="text-sm text-muted-foreground mt-1">平均満足度（5点満点）</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-emerald-600">
                {surveyStats.distribution.slice(3).reduce((a, b) => a + b, 0)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">高評価（4点以上）</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-foreground">{surveyStats.total}</p>
              <p className="text-sm text-muted-foreground mt-1">総回答数</p>
            </div>
          </div>
        </div>
      )}

      {/* クイックアクション */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="text-base font-semibold text-foreground mb-4">クイックアクション</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            onClick={() => createSession.mutate()}
            disabled={createSession.isPending}
            className="flex items-center gap-3 p-5 h-auto justify-start bg-[#0d2a6e] hover:bg-[#0d2a6e]/90"
          >
            <div className="bg-white/20 p-2 rounded-lg shrink-0">
              <Link2 className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">受付URLを発行</p>
              <p className="text-xs text-white/70">依頼者に渡す受付フォームURLを生成</p>
            </div>
          </Button>
          <Button
            onClick={() => setLocation("/intake-sessions")}
            variant="outline"
            className="flex items-center gap-3 p-5 h-auto justify-start"
          >
            <div className="bg-primary/10 p-2 rounded-lg shrink-0">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">受付管理を開く</p>
              <p className="text-xs text-muted-foreground">Salesforce登録・アンケート管理</p>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
