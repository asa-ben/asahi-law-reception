import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ChevronRight, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type Step = "case" | "client" | "opponent" | "done";

export default function CaseNew() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("case");
  const [caseId, setCaseId] = useState<number | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);

  // Step 1: 事件基本情報
  const [caseForm, setCaseForm] = useState({
    caseNumber: "",
    consultationDate: new Date().toISOString().split("T")[0],
    status: "consultation" as "consultation" | "ongoing" | "closed",
    assignedLawyer: "",
    caseType: "",
    notes: "",
  });

  // Step 2: 依頼者情報
  const [clientForm, setClientForm] = useState({
    nameKana: "",
    name: "",
    birthDate: "",
    postalCode: "",
    address: "",
    phone: "",
    mobile: "",
    fax: "",
    email: "",
    emailType: "pc" as "pc" | "mobile",
    invoiceSendMethod: "email" as "email" | "mail",
    otherPostalCode: "",
    otherAddress: "",
    otherPhone: "",
    referrer: "",
    occupation: "",
  });

  // Step 3: 相手方情報
  const [opponentForm, setOpponentForm] = useState({
    nameKana: "",
    name: "",
    birthDate: "",
    postalCode: "",
    address: "",
    phone: "",
    mobile: "",
    fax: "",
    agentName: "",
    agentPostalCode: "",
    agentAddress: "",
    agentPhone: "",
    agentFax: "",
    mailOption: "mail_ok" as "mail_ok" | "mail_ng",
    envelopeType: "" as "" | "office" | "plain",
    mailDestination: "" as "" | "home" | "work" | "other",
    mailDestinationOther: "",
  });

  const createCase = trpc.cases.create.useMutation();
  const createClient = trpc.clients.create.useMutation();
  const createOpponent = trpc.opponents.create.useMutation();
  const upsertChecklist = trpc.checklists.upsert.useMutation();

  const handleCaseSubmit = async () => {
    if (!caseForm.assignedLawyer && !caseForm.caseType) {
      // 最低限の入力チェック
    }
    try {
      const result = await createCase.mutateAsync({
        ...caseForm,
        consultationDate: caseForm.consultationDate || undefined,
      });
      setCaseId(result.id);
      // チェックリストも初期化
      await upsertChecklist.mutateAsync({ caseId: result.id });
      setStep("client");
    } catch {
      toast.error("事件情報の保存に失敗しました");
    }
  };

  const handleClientSubmit = async () => {
    if (!caseId) return;
    if (!clientForm.name) {
      toast.error("依頼者氏名は必須です");
      return;
    }
    try {
      const result = await createClient.mutateAsync({
        caseId,
        ...clientForm,
        birthDate: clientForm.birthDate || undefined,
        envelopeType: undefined,
      } as any);
      setClientId(result.id);
      setStep("opponent");
    } catch {
      toast.error("依頼者情報の保存に失敗しました");
    }
  };

  const handleOpponentSubmit = async () => {
    if (!caseId) return;
    try {
      if (opponentForm.name) {
        await createOpponent.mutateAsync({
          caseId,
          ...opponentForm,
          birthDate: opponentForm.birthDate || undefined,
          envelopeType: opponentForm.envelopeType || undefined,
          mailDestination: opponentForm.mailDestination || undefined,
        } as any);
      }
      toast.success("事件情報を登録しました");
      setLocation(`/cases/${caseId}`);
    } catch {
      toast.error("相手方情報の保存に失敗しました");
    }
  };

  const steps = [
    { key: "case", label: "事件情報" },
    { key: "client", label: "依頼者情報" },
    { key: "opponent", label: "相手方情報" },
  ];

  return (
    <div className="space-y-5 max-w-3xl">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <button onClick={() => setLocation("/cases")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">新規事件登録</h1>
          <p className="text-sm text-muted-foreground mt-0.5">事件依頼簿に基づいて情報を入力してください</p>
        </div>
      </div>

      {/* ステップインジケーター */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              step === s.key
                ? "bg-primary text-primary-foreground"
                : steps.findIndex((x) => x.key === step) > i
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            }`}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs bg-current/20">
                {i + 1}
              </span>
              {s.label}
            </div>
            {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: 事件基本情報 */}
      {step === "case" && (
        <div className="bg-card rounded-xl border border-border p-6 space-y-5">
          <h2 className="text-base font-semibold text-primary border-b border-border pb-3">事件基本情報</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>事件番号</Label>
              <Input placeholder="例: 2024-001" value={caseForm.caseNumber} onChange={(e) => setCaseForm({ ...caseForm, caseNumber: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>相談日</Label>
              <Input type="date" value={caseForm.consultationDate} onChange={(e) => setCaseForm({ ...caseForm, consultationDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>担当弁護士</Label>
              <Input placeholder="担当弁護士名" value={caseForm.assignedLawyer} onChange={(e) => setCaseForm({ ...caseForm, assignedLawyer: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>事件種別</Label>
              <Input placeholder="例: 離婚、相続、交通事故" value={caseForm.caseType} onChange={(e) => setCaseForm({ ...caseForm, caseType: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>ステータス</Label>
              <Select value={caseForm.status} onValueChange={(v) => setCaseForm({ ...caseForm, status: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">相談のみ終了</SelectItem>
                  <SelectItem value="ongoing">継続相談</SelectItem>
                  <SelectItem value="closed">受任・終了</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>備考</Label>
            <Textarea placeholder="備考・メモ" value={caseForm.notes} onChange={(e) => setCaseForm({ ...caseForm, notes: e.target.value })} rows={3} />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleCaseSubmit} disabled={createCase.isPending} className="gap-2">
              次へ（依頼者情報）<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: 依頼者情報 */}
      {step === "client" && (
        <div className="bg-card rounded-xl border border-border p-6 space-y-6">
          <h2 className="text-base font-semibold text-primary border-b border-border pb-3">依頼者情報</h2>

          {/* 基本情報 */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">基本情報</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>ふりがな</Label>
                <Input placeholder="やまだ たろう" value={clientForm.nameKana} onChange={(e) => setClientForm({ ...clientForm, nameKana: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>氏名 <span className="text-accent text-xs">※必須</span></Label>
                <Input placeholder="山田 太郎" value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>生年月日</Label>
                <Input type="date" value={clientForm.birthDate} onChange={(e) => setClientForm({ ...clientForm, birthDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>ご職業</Label>
                <Input placeholder="会社員" value={clientForm.occupation} onChange={(e) => setClientForm({ ...clientForm, occupation: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>紹介者</Label>
                <Input placeholder="紹介者名" value={clientForm.referrer} onChange={(e) => setClientForm({ ...clientForm, referrer: e.target.value })} />
              </div>
            </div>
          </div>

          {/* 住所 */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">住所</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>郵便番号</Label>
                <Input placeholder="000-0000" value={clientForm.postalCode} onChange={(e) => setClientForm({ ...clientForm, postalCode: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>住所</Label>
                <Input placeholder="都道府県・市区町村・番地" value={clientForm.address} onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })} />
              </div>
            </div>
          </div>

          {/* 連絡先 */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">連絡先</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>電話番号</Label>
                <Input placeholder="000-0000-0000" value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>携帯番号</Label>
                <Input placeholder="000-0000-0000" value={clientForm.mobile} onChange={(e) => setClientForm({ ...clientForm, mobile: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>FAX</Label>
                <Input placeholder="000-0000-0000" value={clientForm.fax} onChange={(e) => setClientForm({ ...clientForm, fax: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Eメール</Label>
                <Input type="email" placeholder="example@email.com" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>メール種別</Label>
                <Select value={clientForm.emailType} onValueChange={(v) => setClientForm({ ...clientForm, emailType: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pc">PC</SelectItem>
                    <SelectItem value="mobile">携帯</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>請求書送付方法</Label>
                <Select value={clientForm.invoiceSendMethod} onValueChange={(v) => setClientForm({ ...clientForm, invoiceSendMethod: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">メール</SelectItem>
                    <SelectItem value="mail">郵送</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* その他連絡先 */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">その他連絡先（任意）</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>郵便番号</Label>
                <Input placeholder="000-0000" value={clientForm.otherPostalCode} onChange={(e) => setClientForm({ ...clientForm, otherPostalCode: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>電話番号</Label>
                <Input placeholder="000-0000-0000" value={clientForm.otherPhone} onChange={(e) => setClientForm({ ...clientForm, otherPhone: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>住所</Label>
                <Input placeholder="その他住所" value={clientForm.otherAddress} onChange={(e) => setClientForm({ ...clientForm, otherAddress: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("case")}>戻る</Button>
            <Button onClick={handleClientSubmit} disabled={createClient.isPending} className="gap-2">
              次へ（相手方情報）<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: 相手方情報 */}
      {step === "opponent" && (
        <div className="bg-card rounded-xl border border-border p-6 space-y-6">
          <h2 className="text-base font-semibold text-primary border-b border-border pb-3">相手方情報</h2>
          <p className="text-sm text-muted-foreground">相手方情報が不明な場合は空欄のまま登録できます。</p>

          {/* 相手方基本情報 */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">相手方基本情報</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>ふりがな</Label>
                <Input placeholder="やまだ はなこ" value={opponentForm.nameKana} onChange={(e) => setOpponentForm({ ...opponentForm, nameKana: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>氏名</Label>
                <Input placeholder="山田 花子" value={opponentForm.name} onChange={(e) => setOpponentForm({ ...opponentForm, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>生年月日</Label>
                <Input type="date" value={opponentForm.birthDate} onChange={(e) => setOpponentForm({ ...opponentForm, birthDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>郵便番号</Label>
                <Input placeholder="000-0000" value={opponentForm.postalCode} onChange={(e) => setOpponentForm({ ...opponentForm, postalCode: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>住所</Label>
                <Input placeholder="住所" value={opponentForm.address} onChange={(e) => setOpponentForm({ ...opponentForm, address: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>電話番号</Label>
                <Input placeholder="000-0000-0000" value={opponentForm.phone} onChange={(e) => setOpponentForm({ ...opponentForm, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>携帯番号</Label>
                <Input placeholder="000-0000-0000" value={opponentForm.mobile} onChange={(e) => setOpponentForm({ ...opponentForm, mobile: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>FAX</Label>
                <Input placeholder="000-0000-0000" value={opponentForm.fax} onChange={(e) => setOpponentForm({ ...opponentForm, fax: e.target.value })} />
              </div>
            </div>
          </div>

          {/* 相手方代理人 */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">相手方代理人</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>代理人名</Label>
                <Input placeholder="代理人弁護士名" value={opponentForm.agentName} onChange={(e) => setOpponentForm({ ...opponentForm, agentName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>郵便番号</Label>
                <Input placeholder="000-0000" value={opponentForm.agentPostalCode} onChange={(e) => setOpponentForm({ ...opponentForm, agentPostalCode: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>住所</Label>
                <Input placeholder="事務所住所" value={opponentForm.agentAddress} onChange={(e) => setOpponentForm({ ...opponentForm, agentAddress: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>電話番号</Label>
                <Input placeholder="000-0000-0000" value={opponentForm.agentPhone} onChange={(e) => setOpponentForm({ ...opponentForm, agentPhone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>FAX</Label>
                <Input placeholder="000-0000-0000" value={opponentForm.agentFax} onChange={(e) => setOpponentForm({ ...opponentForm, agentFax: e.target.value })} />
              </div>
            </div>
          </div>

          {/* 郵送設定 */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">ご連絡方法</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>郵送可否</Label>
                <Select value={opponentForm.mailOption} onValueChange={(v) => setOpponentForm({ ...opponentForm, mailOption: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mail_ok">郵送可</SelectItem>
                    <SelectItem value="mail_ng">郵送不可</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {opponentForm.mailOption === "mail_ok" && (
                <>
                  <div className="space-y-1.5">
                    <Label>封筒種別</Label>
                    <Select value={opponentForm.envelopeType} onValueChange={(v) => setOpponentForm({ ...opponentForm, envelopeType: v as any })}>
                      <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="office">事務所封筒</SelectItem>
                        <SelectItem value="plain">無地封筒</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>送付先</Label>
                    <Select value={opponentForm.mailDestination} onValueChange={(v) => setOpponentForm({ ...opponentForm, mailDestination: v as any })}>
                      <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="home">自宅宛</SelectItem>
                        <SelectItem value="work">職場宛</SelectItem>
                        <SelectItem value="other">その他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {opponentForm.mailDestination === "other" && (
                    <div className="space-y-1.5">
                      <Label>その他送付先</Label>
                      <Input placeholder="送付先を入力" value={opponentForm.mailDestinationOther} onChange={(e) => setOpponentForm({ ...opponentForm, mailDestinationOther: e.target.value })} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("client")}>戻る</Button>
            <Button onClick={handleOpponentSubmit} disabled={createOpponent.isPending} className="gap-2">
              <Save className="h-4 w-4" />
              登録完了
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
