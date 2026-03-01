import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Scale,
  Users,
  UserX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";

const LOGO_MARK = "https://d2xsxph8kpxj0f.cloudfront.net/310519663339519816/bWMCToBMaWZYU8v22C5xF4/asahi-logo-mark_b1e753e6.png";
const LOGO_TEXT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663339519816/bWMCToBMaWZYU8v22C5xF4/asahi-logo-text_c0ce50d8.png";

type CaseCategory = "with_opponent" | "no_opponent";

const CASE_TYPES_WITH_OPPONENT = [
  "離婚・男女問題", "交通事故", "債権回収", "労働問題（解雇・未払い賃金）",
  "損害賠償請求", "不動産トラブル", "相続争い（遺産分割）", "刑事事件", "その他",
];
const CASE_TYPES_NO_OPPONENT = [
  "自己破産", "個人再生", "任意整理", "相続手続き（遺産整理）",
  "遺言書作成", "成年後見", "会社設立・法人手続き", "その他",
];

type FormData = {
  caseCategory: CaseCategory | "";
  caseType: string;
  clientName: string;
  clientNameKana: string;
  clientBirthDate: string;
  clientPostalCode: string;
  clientAddress: string;
  clientPhone: string;
  clientMobile: string;
  clientEmail: string;
  clientOccupation: string;
  clientReferrer: string;
  consultationReason: string;
  opponentName: string;
  opponentNameKana: string;
  opponentPostalCode: string;
  opponentAddress: string;
  opponentPhone: string;
  opponentRelation: string;
};

const INITIAL: FormData = {
  caseCategory: "", caseType: "",
  clientName: "", clientNameKana: "", clientBirthDate: "",
  clientPostalCode: "", clientAddress: "",
  clientPhone: "", clientMobile: "", clientEmail: "",
  clientOccupation: "", clientReferrer: "", consultationReason: "",
  opponentName: "", opponentNameKana: "", opponentPostalCode: "",
  opponentAddress: "", opponentPhone: "", opponentRelation: "",
};

const Header = () => (
  <header className="bg-[#0d2a6e] text-white px-4 py-3 sticky top-0 z-10 shadow-md">
    <div className="max-w-lg mx-auto flex items-center gap-3">
      <img src={LOGO_MARK} alt="" className="h-8 w-auto brightness-0 invert" />
      <div>
        <img src={LOGO_TEXT} alt="朝日弁護士法人" className="h-4 w-auto brightness-0 invert" />
        <p className="text-xs text-blue-200 mt-0.5">ご相談者様 情報入力フォーム</p>
      </div>
    </div>
  </header>
);

export default function IntakeForm() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0); // 0=案件種別, 1=依頼者, 2=相手方, 3=確認, 4=待機
  const [form, setForm] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: session, isLoading } = trpc.intake.getByToken.useQuery(
    { token: token ?? "" },
    {
      enabled: !!token,
      refetchInterval: (query) => {
        const data = query.state.data;
        if (!data) return false;
        // 待機中・SF登録待ちの場合はポーリング継続
        if (data.status === "waiting" || data.status === "sf_pending") return 3000;
        return false;
      },
    }
  );

  const submitIntake = trpc.intake.submitIntake.useMutation();
  const confirmPayment = trpc.intake.confirmPayment.useMutation();

  // 既存セッション（ページ再読み込み）の場合、stepを適切に設定
  useEffect(() => {
    if (!session) return;
    if (!submitted) {
      // paymentStatus=shownならQR画面
      if (session.paymentStatus === "shown" || session.paymentStatus === "confirmed") {
        setStep(5);
      } else if (session.status === "waiting" || session.status === "sf_pending" || session.status === "consulting") {
        // 送信済みで待機中なら待機画面
        setStep(4);
      }
    }
    // 支払い待ち→ QR表示画面に切り替わる
    if (session.paymentStatus === "shown" && step === 4) {
      setStep(5);
    }
    // アンケート→ 遷移
    if (session.status === "survey") {
      navigate(`/intake/${token}/survey`);
    }
  }, [session?.paymentStatus, session?.status, token, navigate, submitted]);

  if (!token || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#0d2a6e]" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-6">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
          <p className="font-medium">無効なURLです</p>
          <p className="text-sm text-muted-foreground mt-1">スタッフにお声がけください。</p>
        </div>
      </div>
    );
  }

  // step=4: 待機画面（送信後）
  if (step === 4) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <WaitingScreen clientName={session.clientName} />
      </div>
    );
  }

  if (session.status === "completed") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
            <p className="text-lg font-semibold">すべての手続きが完了しました</p>
            <p className="text-sm text-muted-foreground">ご協力ありがとうございました。</p>
          </div>
        </div>
      </div>
    );
  }

  const setField = (key: keyof FormData, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validateClient = () => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.clientName.trim()) e.clientName = "氏名は必須です";
    if (!form.clientNameKana.trim()) e.clientNameKana = "ふりがなは必須です";
    if (!form.clientPhone.trim() && !form.clientMobile.trim()) e.clientPhone = "電話番号を少なくとも1つ入力してください";
    if (form.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.clientEmail)) e.clientEmail = "メールアドレスの形式が正しくありません";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    try {
      await submitIntake.mutateAsync({
        token: token ?? "",
        caseCategory: form.caseCategory as CaseCategory,
        caseType: form.caseType || undefined,
        clientName: form.clientName,
        clientNameKana: form.clientNameKana || undefined,
        clientBirthDate: form.clientBirthDate || undefined,
        clientPostalCode: form.clientPostalCode || undefined,
        clientAddress: form.clientAddress || undefined,
        clientPhone: form.clientPhone || undefined,
        clientMobile: form.clientMobile || undefined,
        clientEmail: form.clientEmail || undefined,
        clientOccupation: form.clientOccupation || undefined,
        clientReferrer: form.clientReferrer || undefined,
        consultationReason: form.consultationReason || undefined,
        opponentName: form.opponentName || undefined,
        opponentNameKana: form.opponentNameKana || undefined,
        opponentPostalCode: form.opponentPostalCode || undefined,
        opponentAddress: form.opponentAddress || undefined,
        opponentPhone: form.opponentPhone || undefined,
        opponentRelation: form.opponentRelation || undefined,
      });
      setSubmitted(true);
      setStep(4);
    } catch {
      alert("送信に失敗しました。スタッフにお声がけください。");
    }
  };

  const caseTypes = form.caseCategory === "with_opponent" ? CASE_TYPES_WITH_OPPONENT : CASE_TYPES_NO_OPPONENT;
  const hasOpponent = form.caseCategory === "with_opponent";

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-6">

        {/* ── ステップ0: 案件種別選択 ── */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800">ご相談の内容を教えてください</h2>
              <p className="text-sm text-slate-500 mt-1">当てはまる方をお選びください</p>
            </div>

            <div className="grid gap-4">
              <button
                onClick={() => { setField("caseCategory", "with_opponent"); setStep(1); }}
                className="bg-white border-2 border-slate-200 hover:border-[#0d2a6e] rounded-2xl p-5 text-left transition-all hover:shadow-md group"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-blue-50 rounded-xl p-3 group-hover:bg-blue-100 transition-colors">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-base">相手方がいる</p>
                    <p className="text-sm text-slate-500 mt-1">離婚・交通事故・債権回収・労働問題・損害賠償など</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => { setField("caseCategory", "no_opponent"); setStep(1); }}
                className="bg-white border-2 border-slate-200 hover:border-[#0d2a6e] rounded-2xl p-5 text-left transition-all hover:shadow-md group"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-50 rounded-xl p-3 group-hover:bg-emerald-100 transition-colors">
                    <UserX className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-base">相手方がいない</p>
                    <p className="text-sm text-slate-500 mt-1">破産・相続・遺言・成年後見・会社設立など</p>
                  </div>
                </div>
              </button>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 flex gap-3">
              <Scale className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">ご入力いただいた情報は、弁護士業務のみに使用し、適切に管理いたします。</p>
            </div>
          </div>
        )}

        {/* ── ステップ1: 依頼者情報 ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(0)} className="text-slate-400 hover:text-slate-600">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800">あなたの情報を入力してください</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {hasOpponent ? "ステップ 1 / 3" : "ステップ 1 / 2"}
                </p>
              </div>
            </div>

            {/* 案件種別 */}
            <div className="bg-white rounded-2xl p-5 space-y-3 border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">ご相談の種別（任意）</h3>
              <div className="grid grid-cols-2 gap-2">
                {caseTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setField("caseType", form.caseType === t ? "" : t)}
                    className={`text-xs py-2 px-3 rounded-lg border text-left transition-colors ${
                      form.caseType === t
                        ? "border-[#0d2a6e] bg-[#0d2a6e]/5 text-[#0d2a6e] font-medium"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* 基本情報 */}
            <div className="bg-white rounded-2xl p-5 space-y-4 border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">基本情報</h3>
              <Field label="お名前" required error={errors.clientName}>
                <Input value={form.clientName} onChange={(e) => setField("clientName", e.target.value)} placeholder="朝日 太郎" className={errors.clientName ? "border-destructive" : ""} />
              </Field>
              <Field label="ふりがな" required error={errors.clientNameKana}>
                <Input value={form.clientNameKana} onChange={(e) => setField("clientNameKana", e.target.value)} placeholder="あさひ たろう" className={errors.clientNameKana ? "border-destructive" : ""} />
              </Field>
              <Field label="生年月日">
                <Input type="date" value={form.clientBirthDate} onChange={(e) => setField("clientBirthDate", e.target.value)} />
              </Field>
              <Field label="ご職業">
                <Input value={form.clientOccupation} onChange={(e) => setField("clientOccupation", e.target.value)} placeholder="会社員、自営業、主婦など" />
              </Field>
            </div>

            {/* 住所 */}
            <div className="bg-white rounded-2xl p-5 space-y-4 border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">ご住所</h3>
              <Field label="郵便番号">
                <Input value={form.clientPostalCode} onChange={(e) => setField("clientPostalCode", e.target.value)} placeholder="530-0001" maxLength={8} className="max-w-[160px]" />
              </Field>
              <Field label="住所">
                <Input value={form.clientAddress} onChange={(e) => setField("clientAddress", e.target.value)} placeholder="大阪府大阪市北区..." />
              </Field>
            </div>

            {/* 連絡先 */}
            <div className="bg-white rounded-2xl p-5 space-y-4 border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">ご連絡先</h3>
              <Field label="電話番号（自宅・固定）" error={errors.clientPhone}>
                <Input type="tel" value={form.clientPhone} onChange={(e) => setField("clientPhone", e.target.value)} placeholder="06-0000-0000" className={errors.clientPhone ? "border-destructive" : ""} />
                {errors.clientPhone && <p className="text-xs text-destructive mt-1">{errors.clientPhone}</p>}
              </Field>
              <Field label="携帯電話">
                <Input type="tel" value={form.clientMobile} onChange={(e) => setField("clientMobile", e.target.value)} placeholder="090-0000-0000" />
              </Field>
              <Field label="メールアドレス" error={errors.clientEmail}>
                <Input type="email" value={form.clientEmail} onChange={(e) => setField("clientEmail", e.target.value)} placeholder="example@email.com" className={errors.clientEmail ? "border-destructive" : ""} />
              </Field>
            </div>

            {/* その他 */}
            <div className="bg-white rounded-2xl p-5 space-y-4 border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">その他</h3>
              <Field label="当事務所をお知りになったきっかけ">
                <Input value={form.clientReferrer} onChange={(e) => setField("clientReferrer", e.target.value)} placeholder="インターネット、知人の紹介など" />
              </Field>
              <Field label="ご相談の概要（任意）">
                <Textarea value={form.consultationReason} onChange={(e) => setField("consultationReason", e.target.value)} placeholder="ご相談内容を簡単にお書きください" rows={3} />
              </Field>
            </div>

            <Button
              onClick={() => { if (!validateClient()) return; setStep(hasOpponent ? 2 : 3); }}
              className="w-full h-12 text-base gap-2 bg-[#0d2a6e] hover:bg-[#0d2a6e]/90"
            >
              次へ <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* ── ステップ2: 相手方情報 ── */}
        {step === 2 && hasOpponent && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-600">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800">相手方の情報を入力してください</h2>
                <p className="text-sm text-slate-500 mt-0.5">ステップ 2 / 3　（わかる範囲で構いません）</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              わかる範囲でご記入ください。不明な項目は空欄で構いません。
            </div>

            <div className="bg-white rounded-2xl p-5 space-y-4 border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">相手方の基本情報</h3>
              <Field label="相手方との関係">
                <Input value={form.opponentRelation} onChange={(e) => setField("opponentRelation", e.target.value)} placeholder="元配偶者、加害者、雇用主など" />
              </Field>
              <Field label="相手方のお名前">
                <Input value={form.opponentName} onChange={(e) => setField("opponentName", e.target.value)} placeholder="山田 花子" />
              </Field>
              <Field label="ふりがな">
                <Input value={form.opponentNameKana} onChange={(e) => setField("opponentNameKana", e.target.value)} placeholder="やまだ はなこ" />
              </Field>
            </div>

            <div className="bg-white rounded-2xl p-5 space-y-4 border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">相手方の連絡先</h3>
              <Field label="郵便番号">
                <Input value={form.opponentPostalCode} onChange={(e) => setField("opponentPostalCode", e.target.value)} placeholder="530-0001" maxLength={8} className="max-w-[160px]" />
              </Field>
              <Field label="住所">
                <Input value={form.opponentAddress} onChange={(e) => setField("opponentAddress", e.target.value)} placeholder="大阪府..." />
              </Field>
              <Field label="電話番号">
                <Input type="tel" value={form.opponentPhone} onChange={(e) => setField("opponentPhone", e.target.value)} placeholder="06-0000-0000" />
              </Field>
            </div>

            <Button onClick={() => setStep(3)} className="w-full h-12 text-base gap-2 bg-[#0d2a6e] hover:bg-[#0d2a6e]/90">
              次へ <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* ── ステップ3: 確認 ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(hasOpponent ? 2 : 1)} className="text-slate-400 hover:text-slate-600">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800">入力内容の確認</h2>
                <p className="text-sm text-slate-500 mt-0.5">内容をご確認の上、送信してください</p>
              </div>
            </div>

            <ConfirmSection title="あなたの情報" items={[
              ["ご相談種別", form.caseType || (hasOpponent ? "相手方あり" : "相手方なし")],
              ["お名前", form.clientName],
              ["ふりがな", form.clientNameKana],
              ["生年月日", form.clientBirthDate],
              ["住所", [form.clientPostalCode, form.clientAddress].filter(Boolean).join(" ")],
              ["電話（自宅）", form.clientPhone],
              ["携帯電話", form.clientMobile],
              ["メール", form.clientEmail],
              ["職業", form.clientOccupation],
              ["来所のきっかけ", form.clientReferrer],
              ["相談概要", form.consultationReason],
            ]} />

            {hasOpponent && (
              <ConfirmSection title="相手方の情報" items={[
                ["関係", form.opponentRelation],
                ["お名前", form.opponentName],
                ["ふりがな", form.opponentNameKana],
                ["住所", [form.opponentPostalCode, form.opponentAddress].filter(Boolean).join(" ")],
                ["電話番号", form.opponentPhone],
              ]} emptyMessage="相手方情報は入力されていません" />
            )}

            <Button
              onClick={handleSubmit}
              disabled={submitIntake.isPending}
              className="w-full h-12 text-base bg-[#0d2a6e] hover:bg-[#0d2a6e]/90"
            >
              {submitIntake.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />送信中...</> : "この内容で送信する"}
            </Button>
            <p className="text-xs text-center text-slate-400">送信後は修正できません。内容をよくご確認ください。</p>
          </div>
        )}

        {/* ── ステップ4: 待機画面 ── */}
        {step === 4 && (
          <WaitingScreen clientName={form.clientName} />
        )}

        {/* ── ステップ5: 相談料・PayPay QR表示 ── */}
        {step === 5 && (
          <PaymentScreen
            clientName={form.clientName}
            amount={session?.paymentAmount ?? 0}
            onConfirm={async () => {
              try {
                await confirmPayment.mutateAsync({ token: token ?? "" });
              } catch {
                alert("スタッフにお声がけください。");
              }
            }}
            isPending={confirmPayment.isPending}
          />
        )}
      </div>
    </div>
  );
}

// ── 共通コンポーネント ──────────────────────────────────────────

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm text-slate-700">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ConfirmSection({ title, items, emptyMessage }: {
  title: string;
  items: [string, string][];
  emptyMessage?: string;
}) {
  const filtered = items.filter(([, v]) => v);
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">{title}</h3>
      {filtered.length > 0 ? filtered.map(([label, value]) => (
        <div key={label} className="flex gap-3">
          <span className="text-xs text-slate-500 w-28 shrink-0 pt-0.5">{label}</span>
          <span className="text-sm text-slate-800 break-all">{value}</span>
        </div>
      )) : (
        <p className="text-sm text-slate-400">{emptyMessage ?? "入力なし"}</p>
      )}
    </div>
  );
}

// PayPay QR画像（ダミー）
// ※ 後ほど実際のPayPay QR画像URLに差し替えてください
const PAYPAY_QR_5000 = "https://placehold.co/280x280/FF0033/white?text=PayPay+QR%0A%C2%A55%2C000";
const PAYPAY_QR_10000 = "https://placehold.co/280x280/FF0033/white?text=PayPay+QR%0A%C2%A510%2C000";
const PAYPAY_QR_OTHER = "https://placehold.co/280x280/FF0033/white?text=PayPay+QR%0A%E4%BB%BB%E6%84%8F%E9%87%91%E9%A1%8D";

function getQrImage(amount: number): string {
  if (amount === 5000) return PAYPAY_QR_5000;
  if (amount === 10000) return PAYPAY_QR_10000;
  return PAYPAY_QR_OTHER;
}

function PaymentScreen({
  clientName,
  amount,
  onConfirm,
  isPending,
}: {
  clientName: string | null;
  amount: number;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] text-center space-y-6 px-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-800">
          {clientName ? `${clientName} 様` : "ご相談者様"}
        </h2>
        <p className="text-slate-500">相談料のお支払いをお願いします</p>
      </div>

      {/* 金額表示 */}
      <div className="bg-[#0d2a6e] text-white rounded-2xl px-10 py-5 shadow-lg">
        <p className="text-sm text-blue-200 mb-1">相談料</p>
        <p className="text-4xl font-bold tracking-tight">
          ¥{amount.toLocaleString()}
          <span className="text-lg font-normal ml-1">（税込）</span>
        </p>
      </div>

      {/* PayPay QRコード */}
      <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-100 space-y-3">
        <div className="flex items-center justify-center gap-2">
          <div className="bg-[#FF0033] rounded-lg px-3 py-1">
            <span className="text-white font-bold text-sm">PayPay</span>
          </div>
          <span className="text-sm font-medium text-slate-700">でお支払いください</span>
        </div>
        <img
          src={getQrImage(amount)}
          alt="PayPay QRコード"
          className="w-56 h-56 mx-auto rounded-xl object-cover"
        />
        <p className="text-xs text-slate-400">QRコードをPayPayアプリで読み取ってください</p>
      </div>

      {/* 支払い完了ボタン */}
      <div className="w-full max-w-sm space-y-3">
        <Button
          onClick={onConfirm}
          disabled={isPending}
          className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 gap-2"
        >
          {isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" />処理中...</>
          ) : (
            <><CheckCircle2 className="h-5 w-5" />お支払いが完了しました</>
          )}
        </Button>
        <p className="text-xs text-slate-400">
          お支払い完了後、アンケートにご協力ください
        </p>
      </div>
    </div>
  );
}

function WaitingScreen({ clientName }: { clientName: string | null }) {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const interval = setInterval(() => setDots((d) => d.length >= 3 ? "." : d + "."), 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] text-center space-y-6 px-4">
      <div className="bg-[#0d2a6e]/10 rounded-full p-6">
        <Clock className="h-14 w-14 text-[#0d2a6e]" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          {clientName ? `${clientName} 様` : "ご相談者様"}
        </h2>
        <p className="text-slate-500 mt-2">情報の送信が完了しました</p>
        <p className="text-sm text-slate-400 mt-1">
          弁護士の準備ができましたら、<br />この画面が自動的に切り替わります{dots}
        </p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-sm w-full text-left">
        <p className="text-xs text-amber-800 leading-relaxed">
          この画面はそのままにしておいてください。<br />
          相談終了後、アンケートのご協力をお願いします。
        </p>
      </div>
    </div>
  );
}
