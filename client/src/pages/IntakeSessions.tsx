import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Plus,
  QrCode,
  Search,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  intake: { label: "入力中", color: "bg-blue-100 text-blue-700" },
  waiting: { label: "相談待ち", color: "bg-amber-100 text-amber-700" },
  consulting: { label: "相談中", color: "bg-violet-100 text-violet-700" },
  survey: { label: "アンケート中", color: "bg-orange-100 text-orange-700" },
  completed: { label: "完了", color: "bg-emerald-100 text-emerald-700" },
};

// Salesforce用フィールドマッピング
const SF_FIELDS = [
  { key: "name", label: "姓名" },
  { key: "nameKana", label: "姓名（カナ）" },
  { key: "birthDate", label: "生年月日" },
  { key: "postalCode", label: "郵便番号" },
  { key: "address", label: "住所" },
  { key: "phone", label: "電話番号（自宅）" },
  { key: "mobile", label: "携帯電話" },
  { key: "email", label: "メールアドレス" },
  { key: "occupation", label: "職業" },
  { key: "referrer", label: "紹介者・来所のきっかけ" },
  { key: "consultationReason", label: "相談概要" },
];

export default function IntakeSessions() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: sessions, isLoading } = trpc.intake.list.useQuery({ search: search || undefined, limit: 100 });
  const createSession = trpc.intake.createSession.useMutation({
    onSuccess: () => utils.intake.list.invalidate(),
  });
  const completeConsultation = trpc.intake.completeConsultation.useMutation({
    onSuccess: () => { utils.intake.list.invalidate(); toast.success("相談完了。依頼者の画面がアンケートに切り替わります。"); },
  });
  const markExported = trpc.intake.markExported.useMutation({
    onSuccess: () => utils.intake.list.invalidate(),
  });

  type SessionItem = NonNullable<typeof sessions>[number];
  const selectedSession: SessionItem | undefined = sessions?.find((s) => s.id === selectedId);

  // 新規セッション作成
  const handleCreateSession = async () => {
    const result = await createSession.mutateAsync();
    const url = `${window.location.origin}/intake/${result.token}`;
    await navigator.clipboard.writeText(url);
    toast.success("受付URLをクリップボードにコピーしました", { description: url });
  };

  // 相談完了ボタン
  const handleCompleteConsultation = async (token: string) => {
    await completeConsultation.mutateAsync({ token });
  };

  // Salesforce用CSVダウンロード（全件）
  const handleDownloadCSV = () => {
    if (!sessions || sessions.length === 0) { toast.error("データがありません"); return; }
    const header = SF_FIELDS.map((f) => f.label).join(",");
    const rows = sessions
      .filter((s) => s.name)
      .map((s) =>
        SF_FIELDS.map((f) => {
          const val = (s as any)[f.key] ?? "";
          const str = val instanceof Date ? val.toLocaleDateString("ja-JP") : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        }).join(",")
      );
    const csv = "\uFEFF" + [header, ...rows].join("\n"); // BOM付きUTF-8
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `受付データ_${new Date().toLocaleDateString("ja-JP").replace(/\//g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSVをダウンロードしました");
  };

  // 個別コピー（Salesforce貼り付け用）
  const handleCopySalesforce = async (session: SessionItem) => {
    const lines = SF_FIELDS.map((f) => {
      const val = (session as any)[f.key] ?? "";
      const str = val instanceof Date ? val.toLocaleDateString("ja-JP") : String(val);
      return `${f.label}: ${str}`;
    }).join("\n");
    await navigator.clipboard.writeText(lines);
    await markExported.mutateAsync({ id: session.id });
    toast.success("Salesforce用データをコピーしました");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">受付管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">依頼者の受付フロー（個人情報入力→相談→アンケート）を管理します</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={handleDownloadCSV} className="gap-2 text-sm">
            <Download className="h-4 w-4" />
            CSV出力
          </Button>
          <Button onClick={handleCreateSession} disabled={createSession.isPending} className="gap-2 text-sm">
            <Plus className="h-4 w-4" />
            受付URLを発行
          </Button>
        </div>
      </div>

      {/* 使い方ガイド */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
          <QrCode className="h-4 w-4" />
          受付フローの使い方
        </h3>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>「受付URLを発行」ボタンを押してURLを生成（自動でクリップボードにコピー）</li>
          <li>URLをタブレット・QRコードで依頼者に渡す → 依頼者が個人情報を自己入力</li>
          <li>相談終了後、一覧の「相談完了」ボタンを押す → 依頼者の画面が自動でアンケートに切り替わる</li>
          <li>アンケート完了後、「Salesforceコピー」ボタンで個人情報をコピーしてSalesforceに貼り付け</li>
        </ol>
      </div>

      <div className="flex gap-4">
        {/* 一覧 */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="氏名・メールで検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">読み込み中...</div>
            ) : !sessions || sessions.length === 0 ? (
              <div className="p-12 text-center">
                <UserCheck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">受付データがありません</p>
                <p className="text-xs text-muted-foreground mt-1">「受付URLを発行」ボタンから開始してください</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedId(s.id === selectedId ? null : s.id)}
                    className={`p-4 cursor-pointer transition-colors ${selectedId === s.id ? "bg-primary/5" : "hover:bg-muted/30"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground text-sm">
                            {s.name || <span className="text-muted-foreground italic">未入力</span>}
                          </span>
                          {s.nameKana && <span className="text-xs text-muted-foreground">{s.nameKana}</span>}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[s.status]?.color}`}>
                            {STATUS_LABELS[s.status]?.label ?? s.status}
                          </span>
                          {s.exportedToSalesforce && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              SF出力済
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {s.phone && <span>{s.phone}</span>}
                          {s.mobile && <span>{s.mobile}</span>}
                          {s.email && <span className="truncate max-w-[180px]">{s.email}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(s.createdAt).toLocaleDateString("ja-JP", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* 受付URLコピー */}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const url = `${window.location.origin}/intake/${s.sessionToken}`;
                            await navigator.clipboard.writeText(url);
                            toast.success("受付URLをコピーしました");
                          }}
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="受付URLをコピー"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                        {/* 相談完了ボタン */}
                        {(s.status === "waiting" || s.status === "consulting") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); handleCompleteConsultation(s.sessionToken); }}
                            disabled={completeConsultation.isPending}
                            className="text-xs h-7 gap-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            相談完了
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 詳細パネル（選択時） */}
        {selectedSession && (
          <div className="w-80 shrink-0">
            <div className="bg-card rounded-xl border border-border p-5 space-y-4 sticky top-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">詳細情報</h3>
                <button onClick={() => setSelectedId(null)} className="text-xs text-muted-foreground hover:text-foreground">閉じる</button>
              </div>

              <div className="space-y-2">
                {SF_FIELDS.map((f) => {
                  const val = (selectedSession as any)[f.key];
                  if (!val) return null;
                  const str = val instanceof Date ? val.toLocaleDateString("ja-JP") : String(val);
                  return (
                    <div key={f.key}>
                      <p className="text-xs text-muted-foreground">{f.label}</p>
                      <p className="text-sm text-foreground font-medium">{str}</p>
                    </div>
                  );
                })}
              </div>

              {/* タイムライン */}
              <div className="border-t border-border pt-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">タイムライン</p>
                {[
                  { label: "受付開始", time: selectedSession.createdAt },
                  { label: "情報入力完了", time: selectedSession.intakeCompletedAt },
                  { label: "相談完了", time: selectedSession.consultationCompletedAt },
                  { label: "アンケート完了", time: selectedSession.surveyCompletedAt },
                ].map(({ label, time }) => time && (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">{label}:</span>
                    <span className="text-foreground">{new Date(time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                ))}
              </div>

              {/* Salesforceコピーボタン */}
              <Button
                onClick={() => handleCopySalesforce(selectedSession)}
                className="w-full gap-2 text-sm"
                variant="outline"
              >
                <Copy className="h-4 w-4" />
                Salesforce用データをコピー
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
