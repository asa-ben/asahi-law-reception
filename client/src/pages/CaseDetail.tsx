import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ClipboardList,
  Edit2,
  MessageSquare,
  Save,
  User,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

const statusLabel: Record<string, { label: string; className: string }> = {
  consultation: { label: "相談のみ", className: "bg-blue-100 text-blue-700" },
  ongoing: { label: "進行中", className: "bg-amber-100 text-amber-700" },
  closed: { label: "終了", className: "bg-gray-100 text-gray-600" },
};

function CheckItem({
  label,
  checked,
  onChange,
  dateValue,
  onDateChange,
  dateLabel,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  dateValue?: string;
  onDateChange?: (v: string) => void;
  dateLabel?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <button
        onClick={() => onChange(!checked)}
        className="mt-0.5 shrink-0 transition-colors"
      >
        {checked ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground/40" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${checked ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
        {checked && onDateChange && (
          <div className="mt-1.5 flex items-center gap-2">
            <Label className="text-xs text-muted-foreground shrink-0">{dateLabel || "日付"}</Label>
            <Input
              type="date"
              value={dateValue || ""}
              onChange={(e) => onDateChange(e.target.value)}
              className="h-7 text-xs w-36"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function CaseDetail() {
  const params = useParams<{ id: string }>();
  const caseId = parseInt(params.id ?? "0");
  const [, setLocation] = useLocation();

  const { data: detail, isLoading, refetch } = trpc.cases.detail.useQuery({ id: caseId });
  const updateCase = trpc.cases.update.useMutation({ onSuccess: () => { toast.success("保存しました"); refetch(); } });
  const upsertChecklist = trpc.checklists.upsert.useMutation({ onSuccess: () => { toast.success("チェックリストを保存しました"); refetch(); } });

  const [editingCase, setEditingCase] = useState(false);
  const [caseForm, setCaseForm] = useState({ status: "consultation" as any, assignedLawyer: "", caseType: "", notes: "" });
  const [checklist, setChecklist] = useState<Record<string, any>>({});

  useEffect(() => {
    if (detail?.case) {
      setCaseForm({
        status: detail.case.status,
        assignedLawyer: detail.case.assignedLawyer || "",
        caseType: detail.case.caseType || "",
        notes: detail.case.notes || "",
      });
    }
    if (detail?.checklist) {
      const cl = detail.checklist;
      setChecklist({
        contractCreated: cl.contractCreated ?? false,
        contractDate: cl.contractDate ? new Date(cl.contractDate).toISOString().split("T")[0] : "",
        feeExplained: cl.feeExplained ?? false,
        feeExplainDate: cl.feeExplainDate ? new Date(cl.feeExplainDate).toISOString().split("T")[0] : "",
        conflictChecked: cl.conflictChecked ?? false,
        conflictResult: cl.conflictResult || "none",
        depositChecked: cl.depositChecked ?? false,
        depositExists: cl.depositExists ?? false,
        depositReceiptIssued: cl.depositReceiptIssued ?? false,
        identityVerified: cl.identityVerified ?? false,
        identityVerifyType: cl.identityVerifyType || "not_required",
        identityVerifyDate: cl.identityVerifyDate ? new Date(cl.identityVerifyDate).toISOString().split("T")[0] : "",
        identityVerifier: cl.identityVerifier || "",
        processingStatus: cl.processingStatus || "consultation_only",
        fileStatus: cl.fileStatus || "",
      });
    } else if (detail?.case) {
      setChecklist({
        contractCreated: false, contractDate: "", feeExplained: false, feeExplainDate: "",
        conflictChecked: false, conflictResult: "none", depositChecked: false, depositExists: false,
        depositReceiptIssued: false, identityVerified: false, identityVerifyType: "not_required",
        identityVerifyDate: "", identityVerifier: "", processingStatus: "consultation_only", fileStatus: "",
      });
    }
  }, [detail]);

  const handleSaveCase = async () => {
    await updateCase.mutateAsync({ id: caseId, data: caseForm });
    setEditingCase(false);
  };

  const handleSaveChecklist = async () => {
    await upsertChecklist.mutateAsync({
      caseId,
      ...checklist,
      contractDate: checklist.contractDate || undefined,
      feeExplainDate: checklist.feeExplainDate || undefined,
      identityVerifyDate: checklist.identityVerifyDate || undefined,
      fileStatus: checklist.fileStatus || undefined,
    } as any);
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">読み込み中...</div>;
  if (!detail) return <div className="p-8 text-center text-muted-foreground">事件が見つかりません</div>;

  const { case: c, client, opponent, surveys } = detail;
  const st = statusLabel[c.status] ?? statusLabel.consultation;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/cases")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{c.caseNumber || `事件 #${c.id}`}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${st.className}`}>{st.label}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {c.consultationDate ? `相談日: ${new Date(c.consultationDate).toLocaleDateString("ja-JP")}` : ""}
              {c.assignedLawyer ? ` ｜ 担当: ${c.assignedLawyer}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 事件情報 */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> 事件情報
            </h2>
            <button onClick={() => setEditingCase(!editingCase)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Edit2 className="h-3 w-3" />{editingCase ? "キャンセル" : "編集"}
            </button>
          </div>
          {editingCase ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">ステータス</Label>
                <Select value={caseForm.status} onValueChange={(v) => setCaseForm({ ...caseForm, status: v as any })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultation">相談のみ終了</SelectItem>
                    <SelectItem value="ongoing">継続相談</SelectItem>
                    <SelectItem value="closed">受任・終了</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">担当弁護士</Label>
                <Input className="h-8 text-sm" value={caseForm.assignedLawyer} onChange={(e) => setCaseForm({ ...caseForm, assignedLawyer: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">事件種別</Label>
                <Input className="h-8 text-sm" value={caseForm.caseType} onChange={(e) => setCaseForm({ ...caseForm, caseType: e.target.value })} />
              </div>
              <Button size="sm" onClick={handleSaveCase} disabled={updateCase.isPending} className="gap-1.5 w-full">
                <Save className="h-3.5 w-3.5" />保存
              </Button>
            </div>
          ) : (
            <dl className="space-y-2 text-sm">
              {[
                ["事件種別", c.caseType],
                ["担当弁護士", c.assignedLawyer],
                ["備考", c.notes],
              ].map(([k, v]) => v ? (
                <div key={k} className="flex gap-2">
                  <dt className="text-muted-foreground w-24 shrink-0">{k}</dt>
                  <dd className="text-foreground">{v}</dd>
                </div>
              ) : null)}
            </dl>
          )}
        </div>

        {/* 依頼者情報 */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-primary flex items-center gap-2 mb-4">
            <User className="h-4 w-4" /> 依頼者情報
          </h2>
          {client ? (
            <dl className="space-y-2 text-sm">
              {[
                ["氏名", client.name + (client.nameKana ? `（${client.nameKana}）` : "")],
                ["生年月日", client.birthDate ? new Date(client.birthDate).toLocaleDateString("ja-JP") : null],
                ["住所", client.address ? `〒${client.postalCode || ""} ${client.address}` : null],
                ["電話", client.phone],
                ["携帯", client.mobile],
                ["メール", client.email],
                ["職業", client.occupation],
                ["紹介者", client.referrer],
              ].map(([k, v]) => v ? (
                <div key={k} className="flex gap-2">
                  <dt className="text-muted-foreground w-16 shrink-0">{k}</dt>
                  <dd className="text-foreground">{v}</dd>
                </div>
              ) : null)}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">依頼者情報が登録されていません</p>
          )}
        </div>

        {/* 相手方情報 */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-primary flex items-center gap-2 mb-4">
            <Users className="h-4 w-4" /> 相手方情報
          </h2>
          {opponent ? (
            <dl className="space-y-2 text-sm">
              {[
                ["氏名", opponent.name + (opponent.nameKana ? `（${opponent.nameKana}）` : "")],
                ["住所", opponent.address ? `〒${opponent.postalCode || ""} ${opponent.address}` : null],
                ["電話", opponent.phone],
                ["代理人", opponent.agentName],
                ["代理人TEL", opponent.agentPhone],
              ].map(([k, v]) => v ? (
                <div key={k} className="flex gap-2">
                  <dt className="text-muted-foreground w-16 shrink-0">{k}</dt>
                  <dd className="text-foreground">{v}</dd>
                </div>
              ) : null)}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">相手方情報が登録されていません</p>
          )}
        </div>

        {/* アンケート */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-primary flex items-center gap-2 mb-4">
            <MessageSquare className="h-4 w-4" /> アンケート回答
          </h2>
          {surveys && surveys.length > 0 ? (
            <div className="space-y-3">
              {surveys.map((s) => (
                <div key={s.id} className="bg-muted/40 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">満足度:</span>
                    <span className="text-amber-600 font-bold">{"★".repeat(s.satisfaction)}{"☆".repeat(5 - s.satisfaction)}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(s.submittedAt).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                  {s.freeComment && <p className="text-muted-foreground text-xs mt-1">{s.freeComment}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">アンケート回答がありません</p>
          )}
        </div>
      </div>

      {/* 処理チェックリスト */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-primary flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> 処理チェックリスト
          </h2>
          <Button size="sm" onClick={handleSaveChecklist} disabled={upsertChecklist.isPending} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />保存
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 divide-y divide-border md:divide-y-0">
          {/* 左列 */}
          <div className="space-y-1 divide-y divide-border">
            <CheckItem
              label="委任契約書の作成"
              checked={checklist.contractCreated ?? false}
              onChange={(v) => setChecklist({ ...checklist, contractCreated: v })}
              dateValue={checklist.contractDate}
              onDateChange={(v) => setChecklist({ ...checklist, contractDate: v })}
              dateLabel="作成日"
            />
            <CheckItem
              label="報酬及びその他費用の説明"
              checked={checklist.feeExplained ?? false}
              onChange={(v) => setChecklist({ ...checklist, feeExplained: v })}
              dateValue={checklist.feeExplainDate}
              onDateChange={(v) => setChecklist({ ...checklist, feeExplainDate: v })}
              dateLabel="説明日"
            />
            <CheckItem
              label="利益相反の確認"
              checked={checklist.conflictChecked ?? false}
              onChange={(v) => setChecklist({ ...checklist, conflictChecked: v })}
            />
            {checklist.conflictChecked && (
              <div className="pl-8 py-2">
                <Select value={checklist.conflictResult} onValueChange={(v) => setChecklist({ ...checklist, conflictResult: v })}>
                  <SelectTrigger className="h-7 text-xs w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">該当なし</SelectItem>
                    <SelectItem value="applicable">該当あり</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* 右列 */}
          <div className="space-y-1 divide-y divide-border">
            <CheckItem
              label="預り金の確認"
              checked={checklist.depositChecked ?? false}
              onChange={(v) => setChecklist({ ...checklist, depositChecked: v })}
            />
            {checklist.depositChecked && (
              <div className="pl-8 py-2 space-y-1">
                <CheckItem
                  label="預り金あり"
                  checked={checklist.depositExists ?? false}
                  onChange={(v) => setChecklist({ ...checklist, depositExists: v })}
                />
                <CheckItem
                  label="預り証発行済み"
                  checked={checklist.depositReceiptIssued ?? false}
                  onChange={(v) => setChecklist({ ...checklist, depositReceiptIssued: v })}
                />
              </div>
            )}
            <CheckItem
              label="本人特定事項の確認"
              checked={checklist.identityVerified ?? false}
              onChange={(v) => setChecklist({ ...checklist, identityVerified: v })}
              dateValue={checklist.identityVerifyDate}
              onDateChange={(v) => setChecklist({ ...checklist, identityVerifyDate: v })}
              dateLabel="確認日"
            />
            {checklist.identityVerified && (
              <div className="pl-8 py-2 space-y-2">
                <Select value={checklist.identityVerifyType} onValueChange={(v) => setChecklist({ ...checklist, identityVerifyType: v })}>
                  <SelectTrigger className="h-7 text-xs w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_required">不要</SelectItem>
                    <SelectItem value="normal">通常の本人確認</SelectItem>
                    <SelectItem value="strict">厳格な本人確認</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="h-7 text-xs w-48"
                  placeholder="確認者名"
                  value={checklist.identityVerifier}
                  onChange={(e) => setChecklist({ ...checklist, identityVerifier: e.target.value })}
                />
              </div>
            )}
          </div>
        </div>

        {/* 処理状況 */}
        <div className="mt-4 pt-4 border-t border-border">
          <h3 className="text-xs font-medium text-muted-foreground mb-3">処理状況</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">処理区分</Label>
              <Select value={checklist.processingStatus} onValueChange={(v) => setChecklist({ ...checklist, processingStatus: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation_only">相談のみ終了</SelectItem>
                  <SelectItem value="ongoing">継続相談</SelectItem>
                  <SelectItem value="accepted">受任</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ファイル処理</Label>
              <Select value={checklist.fileStatus || ""} onValueChange={(v) => setChecklist({ ...checklist, fileStatus: v || undefined })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="選択してください" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="filed">ファイル化</SelectItem>
                  <SelectItem value="pdf">PDF保存</SelectItem>
                  <SelectItem value="unnecessary">不要</SelectItem>
                  <SelectItem value="consultation_file">相談ファイルへ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
