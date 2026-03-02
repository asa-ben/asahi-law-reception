import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Link2,
  Loader2,
  QrCode,
  Search,
  Send,
  Tablet,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  intake: { label: "入力中", color: "bg-slate-100 text-slate-600" },
  waiting: { label: "相談待ち", color: "bg-amber-100 text-amber-700" },
  consulting: { label: "相談中", color: "bg-blue-100 text-blue-700" },
  sf_pending: { label: "SF登録待ち", color: "bg-purple-100 text-purple-700" },
  survey: { label: "アンケート中", color: "bg-emerald-100 text-emerald-700" },
  completed: { label: "完了", color: "bg-green-100 text-green-700" },
};

type Session = {
  id: number;
  sessionToken: string;
  status: string;
  caseCategory: "with_opponent" | "no_opponent" | null;
  caseType: string | null;
  clientName: string | null;
  clientNameKana: string | null;
  clientBirthDate: Date | null;
  clientPostalCode: string | null;
  clientAddress: string | null;
  clientPhone: string | null;
  clientMobile: string | null;
  clientEmail: string | null;
  clientOccupation: string | null;
  clientReferrer: string | null;
  consultationReason: string | null;
  opponentName: string | null;
  opponentNameKana: string | null;
  opponentPostalCode: string | null;
  opponentAddress: string | null;
  opponentPhone: string | null;
  opponentRelation: string | null;
  sfClientSentAt: Date | null;
  sfOpponentSentAt: Date | null;
  intakeCompletedAt: Date | null;
  consultationCompletedAt: Date | null;
  surveyCompletedAt: Date | null;
  paymentAmount: number | null;
  paymentStatus: "pending" | "shown" | "confirmed" | null;
  paymentShownAt: Date | null;
  paymentConfirmedAt: Date | null;
  source: "url" | "tablet" | null;
  createdAt: Date;
};

export default function IntakeSessions() {
  const [search, setSearch] = useState("");
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: sessions = [], isLoading, refetch } = trpc.intake.list.useQuery({ search: search || undefined, limit: 100 });
  const { data: settings } = trpc.settings.getAll.useQuery();

  const createSession = trpc.intake.createSession.useMutation({
    onSuccess: async (data) => {
      const url = `${window.location.origin}/intake/${data.token}`;
      await navigator.clipboard.writeText(url);
      toast.success("受付URLをクリップボードにコピーしました", { description: url });
      refetch();
    },
  });

  const completeConsultation = trpc.intake.completeConsultation.useMutation({
    onSuccess: () => {
      toast.success("相談完了を記録しました。Salesforce登録へ進んでください。");
      utils.intake.list.invalidate();
      refetch();
      if (selectedSession) {
        setSelectedSession({ ...selectedSession, status: "sf_pending" });
      }
    },
  });

  const [paymentAmount, setPaymentAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const showPayment = trpc.intake.showPayment.useMutation({
    onSuccess: () => {
      toast.success("相談料QRを依頼者画面に表示しました");
      setShowPaymentDialog(false);
      utils.intake.list.invalidate();
      refetch();
    },
  });

  const markSfSent = trpc.intake.markSfSent.useMutation({
    onSuccess: () => {
      toast.success("Salesforce送信完了を記録しました");
      utils.intake.list.invalidate();
      refetch();
      if (selectedSession) {
        const updated = { ...selectedSession, status: "survey" };
        setSelectedSession(updated);
      }
    },
  });

  const sfOrgId = settings?.sf_org_id ?? "";
  const sfUrl = settings?.sf_web_to_lead_url ?? "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8";

  // Salesforce Web-to-Lead フォームを開く（情報を自動入力）
  const openSfForm = (session: Session, type: "client" | "opponent") => {
    if (!sfOrgId) {
      toast.error("Salesforce組織IDが未設定です。設定画面で入力してください。");
      return;
    }

    const params = new URLSearchParams({ oid: sfOrgId, retURL: window.location.href });

    if (type === "client") {
      if (session.clientName) {
        const parts = session.clientName.trim().split(/\s+/);
        params.set("last_name", parts[0] ?? "");
        if (parts[1]) params.set("first_name", parts[1]);
      }
      if (session.clientPhone) params.set("phone", session.clientPhone);
      if (session.clientMobile) params.set("mobile", session.clientMobile);
      if (session.clientEmail) params.set("email", session.clientEmail);
      if (session.clientAddress) params.set("street", session.clientAddress);
      if (session.clientPostalCode) params.set("zip", session.clientPostalCode);
      if (session.clientOccupation) params.set("title", session.clientOccupation);
      if (session.caseType) params.set("description", `相談種別: ${session.caseType}${session.consultationReason ? `\n相談概要: ${session.consultationReason}` : ""}`);
      if (session.clientReferrer) params.set("lead_source", session.clientReferrer);
      params.set("company", "個人");
    } else {
      if (session.opponentName) {
        const parts = session.opponentName.trim().split(/\s+/);
        params.set("last_name", parts[0] ?? "");
        if (parts[1]) params.set("first_name", parts[1]);
      }
      if (session.opponentPhone) params.set("phone", session.opponentPhone);
      if (session.opponentAddress) params.set("street", session.opponentAddress);
      if (session.opponentPostalCode) params.set("zip", session.opponentPostalCode);
      const desc = [
        session.opponentRelation ? `依頼者との関係: ${session.opponentRelation}` : "",
        session.caseType ? `相談種別: ${session.caseType}` : "",
        session.clientName ? `依頼者: ${session.clientName}` : "",
      ].filter(Boolean).join("\n");
      if (desc) params.set("description", desc);
      params.set("company", "相手方");
    }

    window.open(`${sfUrl}&${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  // CSV一括ダウンロード（Salesforce用）
  const handleDownloadCSV = () => {
    if (!sessions || sessions.length === 0) { toast.error("データがありません"); return; }
    const headers = [
      "受付日時", "ステータス", "案件種別",
      "依頼者氏名", "依頼者ふりがな", "生年月日", "郵便番号", "住所",
      "電話（自宅）", "携帯電話", "メール", "職業", "紹介者・来所のきっかけ", "相談概要",
      "相手方氏名", "相手方ふりがな", "相手方住所", "相手方電話", "依頼者との関係",
    ];
    const rows = (sessions as Session[]).map((s) => [
      new Date(s.createdAt).toLocaleDateString("ja-JP"),
      STATUS_CONFIG[s.status]?.label ?? s.status,
      s.caseType ?? (s.caseCategory === "with_opponent" ? "相手方あり" : s.caseCategory === "no_opponent" ? "相手方なし" : ""),
      s.clientName ?? "", s.clientNameKana ?? "",
      s.clientBirthDate ? new Date(s.clientBirthDate).toLocaleDateString("ja-JP") : "",
      s.clientPostalCode ?? "", s.clientAddress ?? "",
      s.clientPhone ?? "", s.clientMobile ?? "", s.clientEmail ?? "",
      s.clientOccupation ?? "", s.clientReferrer ?? "", s.consultationReason ?? "",
      s.opponentName ?? "", s.opponentNameKana ?? "",
      s.opponentAddress ?? "", s.opponentPhone ?? "", s.opponentRelation ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));

    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `受付データ_${new Date().toLocaleDateString("ja-JP").replace(/\//g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSVをダウンロードしました");
  };

  const formatDate = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString("ja-JP") : "—";
  const formatTime = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">受付管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">依頼者の受付フロー（個人情報入力 → 相談 → SF登録 → アンケート）を管理します</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={handleDownloadCSV} className="gap-2 text-sm">
            <Download className="h-4 w-4" />
            CSV出力
          </Button>
          <Button
            onClick={() => createSession.mutate()}
            disabled={createSession.isPending}
            className="gap-2 text-sm bg-[#0d2a6e] hover:bg-[#0d2a6e]/90"
          >
            {createSession.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
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
          <li>「受付URLを発行」→ URLをタブレット等で依頼者に渡す</li>
          <li>依頼者が案件種別・個人情報・相手方情報を自己入力（入力完了後は「相談待機」画面に遷移）</li>
          <li>相談終了後、「相談完了 → SF登録へ」ボタンを押す</li>
          <li><span className="text-[#FF0033] font-medium">PayPay</span>「相談料QRを依頼者画面に表示」ボタン → 金額選択（5,000円・10,000円・任意）→ 依頼者画面にQR表示</li>
          <li>依頼者がPayPayで支払い完了ボタンを押す → アンケート画面に自動遷移</li>
          <li>「Salesforceフォームを開く」ボタンで情報が自動入力されたSFフォームが開く</li>
          </ol>
      </div>

      {/* 検索 */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="氏名・電話番号・メールで検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* セッション一覧 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>受付データがありません</p>
          <p className="text-sm mt-1">「受付URLを発行」ボタンから開始してください</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {(sessions as Session[]).map((s) => {
              const cfg = STATUS_CONFIG[s.status] ?? { label: s.status, color: "bg-slate-100 text-slate-600" };
              return (
                <button
                  key={s.id}
                  onClick={() => { setSelectedSession(s); setDialogOpen(true); }}
                  className="w-full p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="bg-muted rounded-full p-2 shrink-0">
                        {s.caseCategory === "with_opponent" ? (
                          <Users className="h-4 w-4 text-blue-600" />
                        ) : s.caseCategory === "no_opponent" ? (
                          <UserX className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">
                          {s.clientName ?? <span className="text-muted-foreground italic">（未入力）</span>}
                          {s.clientNameKana && (
                            <span className="text-xs text-muted-foreground ml-2">{s.clientNameKana}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {s.source === "tablet" && (
                            <span className="inline-flex items-center gap-0.5 bg-violet-100 text-violet-700 text-[10px] px-1.5 py-0.5 rounded-full mr-1.5 font-medium">
                              <Tablet className="h-2.5 w-2.5" />タブレット
                            </span>
                          )}
                          {s.caseType ?? (s.caseCategory === "with_opponent" ? "相手方あり" : s.caseCategory === "no_opponent" ? "相手方なし" : "種別未選択")}
                          {" · "}
                          {new Date(s.createdAt).toLocaleDateString("ja-JP", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* PayPay金額選択ダイアログ */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="bg-[#FF0033] text-white text-sm font-bold px-2 py-0.5 rounded">PayPay</span>
              相談料の金額を選択
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">依頼者画面に表示するPayPay QRコードの金額を選んでください</p>
            <div className="grid grid-cols-3 gap-3">
              {[5000, 10000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setPaymentAmount(paymentAmount === amt ? null : amt)}
                  className={`rounded-xl border-2 p-3 text-center transition-all ${
                    paymentAmount === amt
                      ? "border-[#FF0033] bg-red-50 text-[#FF0033]"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <p className="text-xs text-muted-foreground">相談料</p>
                  <p className="text-lg font-bold">¥{amt.toLocaleString()}</p>
                </button>
              ))}
              <button
                onClick={() => setPaymentAmount(-1)}
                className={`rounded-xl border-2 p-3 text-center transition-all ${
                  paymentAmount === -1
                    ? "border-[#FF0033] bg-red-50 text-[#FF0033]"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className="text-xs text-muted-foreground">任意</p>
                <p className="text-lg font-bold">自由</p>
              </button>
            </div>
            {paymentAmount === -1 && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">金額を入力（円）</label>
                <Input
                  type="number"
                  placeholder="例: 8000"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="text-lg font-bold"
                />
              </div>
            )}
            <Button
              onClick={() => {
                if (!selectedSession) return;
                const amt = paymentAmount === -1 ? parseInt(customAmount, 10) : (paymentAmount ?? 0);
                if (!amt || amt <= 0) { toast.error("金額を入力してください"); return; }
                showPayment.mutate({ token: selectedSession.sessionToken, amount: amt });
              }}
              disabled={showPayment.isPending || paymentAmount === null}
              className="w-full bg-[#FF0033] hover:bg-[#cc0029] text-white gap-2"
            >
              {showPayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              依頼者画面にQRを表示する
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 詳細・操作ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setSelectedSession(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedSession && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <UserCheck className="h-5 w-5 text-[#0d2a6e]" />
                  {selectedSession.clientName ?? "（未入力）"} 様
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                {/* ステータス */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_CONFIG[selectedSession.status]?.color}`}>
                    {STATUS_CONFIG[selectedSession.status]?.label ?? selectedSession.status}
                  </span>
                  {selectedSession.caseType && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{selectedSession.caseType}</span>
                  )}
                  {selectedSession.caseCategory && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                      {selectedSession.caseCategory === "with_opponent" ? "相手方あり" : "相手方なし（破産等）"}
                    </span>
                  )}
                </div>

                {/* 受付URL */}
                <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {window.location.origin}/intake/{selectedSession.sessionToken}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 h-7 px-2"
                    onClick={async () => {
                      await navigator.clipboard.writeText(`${window.location.origin}/intake/${selectedSession.sessionToken}`);
                      toast.success("URLをコピーしました");
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>

                {/* 依頼者情報 */}
                <InfoSection title="依頼者情報" items={[
                  ["氏名", selectedSession.clientName],
                  ["ふりがな", selectedSession.clientNameKana],
                  ["生年月日", selectedSession.clientBirthDate ? formatDate(selectedSession.clientBirthDate) : null],
                  ["郵便番号", selectedSession.clientPostalCode],
                  ["住所", selectedSession.clientAddress],
                  ["電話（自宅）", selectedSession.clientPhone],
                  ["携帯電話", selectedSession.clientMobile],
                  ["メール", selectedSession.clientEmail],
                  ["職業", selectedSession.clientOccupation],
                  ["来所のきっかけ", selectedSession.clientReferrer],
                  ["相談概要", selectedSession.consultationReason],
                ]} />

                {/* 相手方情報 */}
                {selectedSession.caseCategory === "with_opponent" && (
                  <InfoSection title="相手方情報" items={[
                    ["依頼者との関係", selectedSession.opponentRelation],
                    ["氏名", selectedSession.opponentName],
                    ["ふりがな", selectedSession.opponentNameKana],
                    ["郵便番号", selectedSession.opponentPostalCode],
                    ["住所", selectedSession.opponentAddress],
                    ["電話番号", selectedSession.opponentPhone],
                  ]} />
                )}

                {/* タイムライン */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-600">タイムライン</p>
                  {[
                    { label: "受付開始", time: selectedSession.createdAt },
                    { label: "情報入力完了", time: selectedSession.intakeCompletedAt },
                    { label: "相談完了", time: selectedSession.consultationCompletedAt },
                    { label: "アンケート完了", time: selectedSession.surveyCompletedAt },
                  ].map(({ label, time }) => {
                    const t = formatTime(time);
                    if (!t) return null;
                    return (
                      <div key={label} className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span className="text-slate-500">{label}:</span>
                        <span className="text-slate-700 font-medium">{formatDate(time as Date)} {t}</span>
                      </div>
                    );
                  })}
                </div>

                {/* アクションボタン */}
                <div className="border-t border-border pt-4 space-y-3">

                  {/* 相談完了ボタン */}
                  {(selectedSession.status === "waiting" || selectedSession.status === "consulting") && (
                    <Button
                      onClick={() => completeConsultation.mutate({ token: selectedSession.sessionToken })}
                      disabled={completeConsultation.isPending}
                      className="w-full gap-2 bg-[#0d2a6e] hover:bg-[#0d2a6e]/90"
                    >
                      {completeConsultation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      相談完了 → Salesforce登録へ
                    </Button>
                  )}

                  {/* 相談料表示ボタン（sf_pending時に表示） */}
                  {selectedSession.status === "sf_pending" && selectedSession.paymentStatus === "pending" && (
                    <Button
                      onClick={() => setShowPaymentDialog(true)}
                      className="w-full gap-2 bg-[#FF0033] hover:bg-[#cc0029] text-white"
                    >
                      <span className="font-bold">PayPay</span>
                      相談料QRを依頼者画面に表示
                    </Button>
                  )}
                  {selectedSession.status === "sf_pending" && selectedSession.paymentStatus === "shown" && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      相談料QR表示中（依頼者の支払い待ち）— 金額: ¥{(selectedSession.paymentAmount ?? 0).toLocaleString()}
                    </div>
                  )}
                  {selectedSession.status === "sf_pending" && selectedSession.paymentStatus === "confirmed" && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      相談料支払い確認済み — ¥{(selectedSession.paymentAmount ?? 0).toLocaleString()}
                    </div>
                  )}

                  {/* Salesforce登録（sf_pending時） */}
                  {selectedSession.status === "sf_pending" && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-slate-700">Salesforceへ登録</p>
                      {!sfOrgId && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                          ⚠ Salesforce組織IDが未設定です。設定画面（サイドバー「設定」）でSalesforce組織IDを入力してください。
                        </div>
                      )}
                      <p className="text-xs text-slate-500">
                        ボタンを押すとSalesforceのWeb-to-Leadフォームが開き、情報が自動入力されます。内容を確認して送信してください。
                      </p>

                      {/* 依頼者 */}
                      <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-blue-800">依頼者をSalesforceに登録</p>
                          {selectedSession.sfClientSentAt && (
                            <span className="text-xs text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />送信済み {formatDate(selectedSession.sfClientSentAt)}
                            </span>
                          )}
                        </div>
                        <Button
                          onClick={() => openSfForm(selectedSession, "client")}
                          variant="outline"
                          className="w-full gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                        >
                          <ExternalLink className="h-4 w-4" />
                          依頼者のSalesforceフォームを開く
                        </Button>
                        {!selectedSession.sfClientSentAt && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markSfSent.mutate({ token: selectedSession.sessionToken, type: "client" })}
                            disabled={markSfSent.isPending}
                            className="w-full text-xs text-blue-600 hover:text-blue-800"
                          >
                            <Send className="h-3 w-3 mr-1" />
                            依頼者の送信完了を記録する
                          </Button>
                        )}
                      </div>

                      {/* 相手方（with_opponentのみ） */}
                      {selectedSession.caseCategory === "with_opponent" && (
                        <div className="bg-amber-50 rounded-xl p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-amber-800">相手方をSalesforceに登録</p>
                            {selectedSession.sfOpponentSentAt && (
                              <span className="text-xs text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />送信済み {formatDate(selectedSession.sfOpponentSentAt)}
                              </span>
                            )}
                          </div>
                          <Button
                            onClick={() => openSfForm(selectedSession, "opponent")}
                            variant="outline"
                            className="w-full gap-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                          >
                            <ExternalLink className="h-4 w-4" />
                            相手方のSalesforceフォームを開く
                          </Button>
                          {!selectedSession.sfOpponentSentAt && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markSfSent.mutate({ token: selectedSession.sessionToken, type: "opponent" })}
                              disabled={markSfSent.isPending}
                              className="w-full text-xs text-amber-600 hover:text-amber-800"
                            >
                              <Send className="h-3 w-3 mr-1" />
                              相手方の送信完了を記録する
                            </Button>
                          )}
                        </div>
                      )}

                      {/* まとめて完了 */}
                      <Button
                        onClick={() => markSfSent.mutate({ token: selectedSession.sessionToken, type: "both" })}
                        disabled={markSfSent.isPending}
                        className="w-full gap-2"
                        variant="outline"
                      >
                        {markSfSent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                        すべて送信完了 → アンケートへ進む
                      </Button>
                    </div>
                  )}

                  {/* 完了済み */}
                  {(selectedSession.status === "survey" || selectedSession.status === "completed") && (
                    <div className="bg-emerald-50 rounded-xl p-4 text-center space-y-1">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                      <p className="text-sm font-medium text-emerald-800">Salesforce登録・アンケートが完了しています</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoSection({ title, items }: { title: string; items: [string, string | null | undefined][] }) {
  const filtered = items.filter(([, v]) => v);
  if (filtered.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-1">{title}</h3>
      <div className="space-y-1.5">
        {filtered.map(([label, value]) => (
          <div key={label} className="flex gap-3">
            <span className="text-xs text-muted-foreground w-28 shrink-0 pt-0.5">{label}</span>
            <span className="text-sm text-foreground break-all">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
