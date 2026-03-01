import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Briefcase, Plus, Search } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const statusLabel: Record<string, { label: string; className: string }> = {
  consultation: { label: "相談のみ", className: "bg-blue-100 text-blue-700" },
  ongoing: { label: "進行中", className: "bg-amber-100 text-amber-700" },
  closed: { label: "終了", className: "bg-gray-100 text-gray-600" },
};

export default function Cases() {
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const { data: cases, isLoading } = trpc.cases.list.useQuery({ search: search || undefined, limit: 100 });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">事件一覧</h1>
          <p className="text-sm text-muted-foreground mt-0.5">登録されている事件の一覧です</p>
        </div>
        <Button onClick={() => setLocation("/cases/new")} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          新規登録
        </Button>
      </div>

      {/* 検索 */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="事件番号・担当弁護士・事件種別で検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* テーブル */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">読み込み中...</div>
        ) : !cases || cases.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">事件が登録されていません</p>
            <Button onClick={() => setLocation("/cases/new")} variant="outline" className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              最初の事件を登録
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">事件番号</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">相談日</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">事件種別</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">担当弁護士</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">ステータス</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => {
                  const st = statusLabel[c.status] ?? statusLabel.consultation;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setLocation(`/cases/${c.id}`)}
                      className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-primary">
                        {c.caseNumber || `#${c.id}`}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.consultationDate
                          ? new Date(c.consultationDate).toLocaleDateString("ja-JP")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">{c.caseType || "—"}</td>
                      <td className="px-4 py-3">{c.assignedLawyer || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${st.className}`}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
