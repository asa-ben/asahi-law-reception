import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { BarChart3, MessageSquare, Search, Star, ThumbsUp } from "lucide-react";
import { useState } from "react";

const GOOD_POINT_LABELS: Record<string, string> = {
  explanation: "説明の分かりやすさ",
  atmosphere: "話しやすさ・雰囲気",
  speed: "対応の早さ",
  attentive: "親身な姿勢",
  knowledge: "専門知識の豊富さ",
  cleanliness: "清潔感・設備",
};

const VISIT_TRIGGER_LABELS: Record<string, string> = {
  hp: "ホームページ",
  referral: "知人・家族の紹介",
  review: "口コミ",
  location: "場所が近い",
  other: "その他",
};

export default function Surveys() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = trpc.surveys.list.useQuery({ search: search || undefined, limit: 100 });

  const surveys = data?.surveys ?? [];
  const stats = data?.stats;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">アンケート管理</h1>
        <p className="text-sm text-muted-foreground mt-0.5">相談後アンケートの回答一覧と集計です</p>
      </div>

      {/* 統計サマリー */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-4 w-4 text-violet-600" />
              <p className="text-xs text-muted-foreground">総回答数</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-muted-foreground">平均満足度</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.avgSatisfaction}<span className="text-sm text-muted-foreground">/5</span></p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <ThumbsUp className="h-4 w-4 text-emerald-600" />
              <p className="text-xs text-muted-foreground">高評価（4以上）</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.highSatisfaction}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <p className="text-xs text-muted-foreground">口コミ誘導数</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.googleReviewShown}</p>
          </div>
        </div>
      )}

      {/* 満足度分布バー */}
      {stats && stats.total > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">満足度分布</h2>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.distribution?.[star] ?? 0;
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16 shrink-0">
                    <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-sm text-muted-foreground">{star}</span>
                  </div>
                  <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-16 text-right">{count}件 ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 検索 */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="コメントで検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 回答一覧 */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">読み込み中...</div>
        ) : surveys.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">アンケート回答がありません</p>
          </div>
        ) : (
          surveys.map((s) => (
            <div key={s.id} className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${star <= s.satisfaction ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20"}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {["", "不満", "やや不満", "普通", "満足", "大変満足"][s.satisfaction]}
                  </span>
                  {s.googleReviewShown && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 font-medium">
                      口コミ誘導済
                    </span>
                  )}
                  {s.googleReviewClicked && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 font-medium">
                      口コミクリック済
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(s.submittedAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              </div>

              {/* 良かった点 */}
              {s.goodPoints && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {s.goodPoints.split(",").filter(Boolean).map((p) => (
                    <span key={p} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium">
                      {GOOD_POINT_LABELS[p] ?? p}
                    </span>
                  ))}
                </div>
              )}

              {/* 来所の決め手 */}
              {s.visitTrigger && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {s.visitTrigger.split(",").filter(Boolean).map((t) => (
                    <span key={t} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground font-medium">
                      {VISIT_TRIGGER_LABELS[t] ?? t}
                    </span>
                  ))}
                  {s.visitTriggerOther && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground font-medium">
                      {s.visitTriggerOther}
                    </span>
                  )}
                </div>
              )}

              {/* 自由記述 */}
              {s.freeComment && (
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-sm text-foreground leading-relaxed">{s.freeComment}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
