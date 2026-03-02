/**
 * TabletIntake.tsx
 * 事務所内タブレット専用の受付フロー
 *
 * フロー:
 * 1. 自動でセッションを作成（スタッフ操作不要）
 * 2. 依頼者が個人情報を入力・送信
 * 3. 「相談中」待機画面（スタッフが受付管理から「相談料を表示」を押すまで待機）
 * 4. PayPay QR表示（スタッフが金額選択後、自動遷移）
 * 5. 支払い確認後、アンケート画面
 * 6. アンケート完了後、5秒カウントダウンで自動リセット
 */

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  Scale,
  Star,
  Users,
  UserX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const LOGO_MARK =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663339519816/bWMCToBMaWZYU8v22C5xF4/asahi-logo-mark_b1e753e6.png";
const LOGO_TEXT =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663339519816/bWMCToBMaWZYU8v22C5xF4/asahi-logo-text_c0ce50d8.png";

// PayPay QR画像（ダミー）※後ほど実際の画像URLに差し替えてください
const PAYPAY_QR_5000 =
  "https://placehold.co/280x280/FF0033/white?text=PayPay+QR%0A%C2%A55%2C000";
const PAYPAY_QR_10000 =
  "https://placehold.co/280x280/FF0033/white?text=PayPay+QR%0A%C2%A510%2C000";
const PAYPAY_QR_OTHER =
  "https://placehold.co/280x280/FF0033/white?text=PayPay+QR%0A%E4%BB%BB%E6%84%8F%E9%87%91%E9%A1%8D";

function getQrImage(amount: number): string {
  if (amount === 5000) return PAYPAY_QR_5000;
  if (amount === 10000) return PAYPAY_QR_10000;
  return PAYPAY_QR_OTHER;
}

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

const INITIAL_FORM: FormData = {
  caseCategory: "", caseType: "",
  clientName: "", clientNameKana: "", clientBirthDate: "",
  clientPostalCode: "", clientAddress: "",
  clientPhone: "", clientMobile: "", clientEmail: "",
  clientOccupation: "", clientReferrer: "", consultationReason: "",
  opponentName: "", opponentNameKana: "", opponentPostalCode: "",
  opponentAddress: "", opponentPhone: "", opponentRelation: "",
};

const GOOD_POINTS = [
  { id: "explanation", label: "説明の分かりやすさ" },
  { id: "atmosphere", label: "話しやすさ・雰囲気" },
  { id: "speed", label: "対応の早さ" },
  { id: "attentive", label: "親身な姿勢" },
  { id: "knowledge", label: "専門知識の豊富さ" },
  { id: "cleanliness", label: "清潔感・設備" },
];

const VISIT_TRIGGERS = [
  { id: "hp", label: "ホームページを見た" },
  { id: "referral", label: "知人・家族の紹介" },
  { id: "review", label: "口コミが良かった" },
  { id: "location", label: "場所が近かった" },
  { id: "other", label: "その他" },
];

const SATISFACTION_LABELS = ["", "不満", "やや不満", "普通", "満足", "大変満足"];

// ─── フローステップ ───────────────────────────────────────
type FlowStep =
  | "init"        // セッション作成中
  | "category"    // 案件種別選択
  | "client"      // 依頼者情報入力
  | "opponent"    // 相手方情報入力
  | "confirm"     // 入力内容確認
  | "waiting"     // 相談中待機（スタッフがPayPay金額を選ぶまで）
  | "payment"     // PayPay QR表示
  | "survey"      // アンケート
  | "done";       // 完了・リセットカウントダウン

// ─── ヘッダー ─────────────────────────────────────────────
function Header({ subtitle }: { subtitle?: string }) {
  return (
    <header className="bg-[#0d2a6e] text-white px-4 py-3 sticky top-0 z-10 shadow-md">
      <div className="max-w-lg mx-auto flex items-center gap-3">
        <img src={LOGO_MARK} alt="" className="h-8 w-auto brightness-0 invert" />
        <div>
          <img src={LOGO_TEXT} alt="朝日弁護士法人" className="h-4 w-auto brightness-0 invert" />
          {subtitle && <p className="text-xs text-blue-200 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </header>
  );
}

// ─── フォームフィールド ───────────────────────────────────
function Field({
  label, required, error, children,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-destructive ml-1 text-xs">※必須</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────────
export default function TabletIntake() {
  const [step, setStep] = useState<FlowStep>("init");
  const [token, setToken] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [countdown, setCountdown] = useState(5);

  // アンケート用ステート
  const [satisfaction, setSatisfaction] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [goodPoints, setGoodPoints] = useState<string[]>([]);
  const [visitTrigger, setVisitTrigger] = useState<string[]>([]);
  const [visitTriggerOther, setVisitTriggerOther] = useState("");
  const [freeComment, setFreeComment] = useState("");
  const [googleReviewShown, setGoogleReviewShown] = useState(false);
  const [surveyResponseId, setSurveyResponseId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // ─── tRPC ─────────────────────────────────────────────────────────
  const createSession = trpc.intake.createTabletSession.useMutation();
  const submitIntake = trpc.intake.submitIntake.useMutation();
  const confirmPayment = trpc.intake.confirmPayment.useMutation();
  const submitSurvey = trpc.survey.submit.useMutation();
  const completeSurvey = trpc.intake.completeSurvey.useMutation();
  const clickReview = trpc.survey.clickReview.useMutation();

  const { data: settings } = trpc.settings.getAll.useQuery();
  const googleReviewUrl =
    settings?.google_review_url || "https://g.page/r/XXXXXXXXXXXXXXXX/review";

  // セッションポーリング（waiting / payment 画面中のみ）
  const { data: session } = trpc.intake.getByToken.useQuery(
    { token: token ?? "" },
    {
      enabled: !!token && (step === "waiting" || step === "payment"),
      refetchInterval: 3000,
    }
  );

  // ─── 初期化：セッション自動作成 ───────────────────────
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    createSession.mutateAsync().then(({ token: t }) => {
      setToken(t);
      setStep("category");
    });
  }, []);

  // ─── ポーリング結果で画面遷移 ─────────────────────────
  useEffect(() => {
    if (!session) return;
    if (step === "waiting" && session.paymentStatus === "shown") {
      setStep("payment");
    }
    if (step === "payment" && session.status === "survey") {
      setStep("survey");
    }
  }, [session?.paymentStatus, session?.status, step]);

  // ─── 完了後カウントダウン → リセット ─────────────────
  useEffect(() => {
    if (step !== "done") return;
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          handleReset();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  // ─── リセット処理 ─────────────────────────────────────
  const handleReset = () => {
    setStep("init");
    setToken(null);
    setForm(INITIAL_FORM);
    setErrors({});
    setSatisfaction(0);
    setHoveredStar(0);
    setGoodPoints([]);
    setVisitTrigger([]);
    setVisitTriggerOther("");
    setFreeComment("");
    setGoogleReviewShown(false);
    setSurveyResponseId(null);
    initialized.current = false;
    // 少し遅らせてから新セッション作成
    setTimeout(() => {
      if (!initialized.current) {
        initialized.current = true;
        createSession.mutateAsync().then(({ token: t }) => {
          setToken(t);
          setStep("category");
        });
      }
    }, 100);
  };

  // ─── フォームヘルパー ─────────────────────────────────
  const setField = (key: keyof FormData, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validateClient = () => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.clientName.trim()) e.clientName = "氏名は必須です";
    if (!form.clientNameKana.trim()) e.clientNameKana = "ふりがなは必須です";
    if (!form.clientPhone.trim() && !form.clientMobile.trim())
      e.clientPhone = "電話番号を少なくとも1つ入力してください";
    if (form.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.clientEmail))
      e.clientEmail = "メールアドレスの形式が正しくありません";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── 送信処理 ─────────────────────────────────────────
  const handleSubmit = async () => {
    if (!token) return;
    try {
      await submitIntake.mutateAsync({
        token,
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
      setStep("waiting");
    } catch {
      alert("送信に失敗しました。スタッフにお声がけください。");
    }
  };

  const handleConfirmPayment = async () => {
    if (!token) return;
    try {
      await confirmPayment.mutateAsync({ token });
      setStep("survey");
    } catch {
      alert("エラーが発生しました。スタッフにお声がけください。");
    }
  };

  const handleSurveySubmit = async () => {
    if (satisfaction === 0) { alert("満足度を選択してください"); return; }
    try {
      const showReview = satisfaction >= 4;
      const result = await submitSurvey.mutateAsync({
        sessionToken: token ?? undefined,
        satisfaction,
        goodPoints,
        visitTrigger,
        visitTriggerOther: visitTriggerOther || undefined,
        freeComment: freeComment || undefined,
        googleReviewShown: showReview,
      });
      setSurveyResponseId(result.id);
      setGoogleReviewShown(showReview);
      if (token) {
        await completeSurvey.mutateAsync({ token, surveyResponseId: result.id });
      }
      setStep("done");
    } catch {
      alert("送信に失敗しました。もう一度お試しください。");
    }
  };

  const handleGoogleReviewClick = async () => {
    if (surveyResponseId) {
      await clickReview.mutateAsync({ id: surveyResponseId });
    }
    window.open(googleReviewUrl, "_blank", "noopener,noreferrer");
  };

  const toggleGoodPoint = (id: string) =>
    setGoodPoints((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  const toggleVisitTrigger = (id: string) =>
    setVisitTrigger((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const caseTypes =
    form.caseCategory === "with_opponent"
      ? CASE_TYPES_WITH_OPPONENT
      : CASE_TYPES_NO_OPPONENT;
  const hasOpponent = form.caseCategory === "with_opponent";

  // ─── 初期化中 ─────────────────────────────────────────
  if (step === "init") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <img src={LOGO_MARK} alt="" className="h-16 w-auto" />
        <Loader2 className="h-8 w-8 animate-spin text-[#0d2a6e]" />
        <p className="text-sm text-slate-500">準備中...</p>
      </div>
    );
  }

  // ─── 案件種別選択 ─────────────────────────────────────
  if (step === "category") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header subtitle="ご相談者様 情報入力フォーム" />
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">ご相談の内容を教えてください</h2>
            <p className="text-sm text-slate-500 mt-1">当てはまる方をお選びください</p>
          </div>
          <div className="grid gap-4">
            <button
              onClick={() => { setField("caseCategory", "with_opponent"); setStep("client"); }}
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
              onClick={() => { setField("caseCategory", "no_opponent"); setStep("client"); }}
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
      </div>
    );
  }

  // ─── 依頼者情報入力 ───────────────────────────────────
  if (step === "client") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header subtitle="ご相談者様 情報入力フォーム" />
        <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep("category")} className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-slate-800">ご本人の情報</h2>
              <p className="text-xs text-slate-500">
                {hasOpponent ? "ステップ 1 / 2" : "ステップ 1 / 1"}
              </p>
            </div>
          </div>

          {/* 案件種別 */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">相談の種類</h3>
            <div className="grid grid-cols-2 gap-2">
              {caseTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setField("caseType", t)}
                  className={`text-xs px-3 py-2 rounded-lg border transition-all text-left ${
                    form.caseType === t
                      ? "bg-[#0d2a6e] text-white border-[#0d2a6e]"
                      : "bg-white text-slate-700 border-slate-200 hover:border-[#0d2a6e]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 基本情報 */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">基本情報</h3>
            <Field label="氏名" required error={errors.clientName}>
              <Input
                value={form.clientName}
                onChange={(e) => setField("clientName", e.target.value)}
                placeholder="例：山田 太郎"
              />
            </Field>
            <Field label="ふりがな" required error={errors.clientNameKana}>
              <Input
                value={form.clientNameKana}
                onChange={(e) => setField("clientNameKana", e.target.value)}
                placeholder="例：やまだ たろう"
              />
            </Field>
            <Field label="生年月日">
              <Input
                type="date"
                value={form.clientBirthDate}
                onChange={(e) => setField("clientBirthDate", e.target.value)}
              />
            </Field>
          </div>

          {/* 連絡先 */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">連絡先</h3>
            <Field label="電話番号（自宅）" error={errors.clientPhone}>
              <Input
                type="tel"
                value={form.clientPhone}
                onChange={(e) => setField("clientPhone", e.target.value)}
                placeholder="例：03-1234-5678"
              />
            </Field>
            <Field label="携帯電話番号">
              <Input
                type="tel"
                value={form.clientMobile}
                onChange={(e) => setField("clientMobile", e.target.value)}
                placeholder="例：090-1234-5678"
              />
            </Field>
            <Field label="メールアドレス" error={errors.clientEmail}>
              <Input
                type="email"
                value={form.clientEmail}
                onChange={(e) => setField("clientEmail", e.target.value)}
                placeholder="例：yamada@example.com"
              />
            </Field>
          </div>

          {/* 住所 */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">住所</h3>
            <Field label="郵便番号">
              <Input
                value={form.clientPostalCode}
                onChange={(e) => setField("clientPostalCode", e.target.value)}
                placeholder="例：100-0001"
              />
            </Field>
            <Field label="住所">
              <Textarea
                value={form.clientAddress}
                onChange={(e) => setField("clientAddress", e.target.value)}
                placeholder="例：東京都千代田区千代田1-1"
                rows={2}
              />
            </Field>
          </div>

          {/* その他 */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">その他</h3>
            <Field label="職業">
              <Input
                value={form.clientOccupation}
                onChange={(e) => setField("clientOccupation", e.target.value)}
                placeholder="例：会社員"
              />
            </Field>
            <Field label="紹介者">
              <Input
                value={form.clientReferrer}
                onChange={(e) => setField("clientReferrer", e.target.value)}
                placeholder="例：田中様のご紹介"
              />
            </Field>
            <Field label="ご相談の概要">
              <Textarea
                value={form.consultationReason}
                onChange={(e) => setField("consultationReason", e.target.value)}
                placeholder="ご相談内容を簡単にお書きください"
                rows={3}
              />
            </Field>
          </div>

          <div className="pb-8">
            <Button
              onClick={() => {
                if (!validateClient()) return;
                if (hasOpponent) {
                  setStep("opponent");
                } else {
                  setStep("confirm");
                }
              }}
              className="w-full h-12 text-base bg-[#0d2a6e] hover:bg-[#0d2a6e]/90"
            >
              {hasOpponent ? "次へ（相手方情報）" : "入力内容を確認する"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 相手方情報入力 ───────────────────────────────────
  if (step === "opponent") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header subtitle="ご相談者様 情報入力フォーム" />
        <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep("client")} className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-slate-800">相手方の情報</h2>
              <p className="text-xs text-slate-500">ステップ 2 / 2（わかる範囲で構いません）</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
            <Field label="相手方の氏名・名称">
              <Input
                value={form.opponentName}
                onChange={(e) => setField("opponentName", e.target.value)}
                placeholder="例：鈴木 花子"
              />
            </Field>
            <Field label="相手方のふりがな">
              <Input
                value={form.opponentNameKana}
                onChange={(e) => setField("opponentNameKana", e.target.value)}
                placeholder="例：すずき はなこ"
              />
            </Field>
            <Field label="相手方との関係">
              <Input
                value={form.opponentRelation}
                onChange={(e) => setField("opponentRelation", e.target.value)}
                placeholder="例：配偶者、元雇用主、加害者など"
              />
            </Field>
            <Field label="相手方の電話番号">
              <Input
                type="tel"
                value={form.opponentPhone}
                onChange={(e) => setField("opponentPhone", e.target.value)}
                placeholder="例：03-9876-5432"
              />
            </Field>
            <Field label="相手方の郵便番号">
              <Input
                value={form.opponentPostalCode}
                onChange={(e) => setField("opponentPostalCode", e.target.value)}
                placeholder="例：100-0001"
              />
            </Field>
            <Field label="相手方の住所">
              <Textarea
                value={form.opponentAddress}
                onChange={(e) => setField("opponentAddress", e.target.value)}
                placeholder="例：東京都新宿区1-1-1"
                rows={2}
              />
            </Field>
          </div>

          <div className="pb-8">
            <Button
              onClick={() => setStep("confirm")}
              className="w-full h-12 text-base bg-[#0d2a6e] hover:bg-[#0d2a6e]/90"
            >
              入力内容を確認する
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 確認画面 ─────────────────────────────────────────
  if (step === "confirm") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header subtitle="ご相談者様 情報入力フォーム" />
        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep(hasOpponent ? "opponent" : "client")}
              className="text-slate-400 hover:text-slate-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold text-slate-800">入力内容の確認</h2>
          </div>

          {/* 依頼者情報 */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">ご本人の情報</h3>
            {[
              ["案件種別", form.caseType],
              ["氏名", form.clientName],
              ["ふりがな", form.clientNameKana],
              ["生年月日", form.clientBirthDate],
              ["電話番号", form.clientPhone],
              ["携帯電話", form.clientMobile],
              ["メール", form.clientEmail],
              ["郵便番号", form.clientPostalCode],
              ["住所", form.clientAddress],
              ["職業", form.clientOccupation],
              ["紹介者", form.clientReferrer],
              ["相談概要", form.consultationReason],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="flex gap-3">
                <span className="text-xs text-slate-500 w-24 shrink-0 pt-0.5">{label}</span>
                <span className="text-sm text-slate-800 break-all">{value}</span>
              </div>
            ))}
          </div>

          {/* 相手方情報 */}
          {hasOpponent && (
            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2">
              <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">相手方の情報</h3>
              {[
                ["氏名・名称", form.opponentName],
                ["ふりがな", form.opponentNameKana],
                ["関係", form.opponentRelation],
                ["電話番号", form.opponentPhone],
                ["郵便番号", form.opponentPostalCode],
                ["住所", form.opponentAddress],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <span className="text-xs text-slate-500 w-24 shrink-0 pt-0.5">{label}</span>
                  <span className="text-sm text-slate-800 break-all">{value}</span>
                </div>
              ))}
              {!form.opponentName && (
                <p className="text-sm text-slate-400">入力なし</p>
              )}
            </div>
          )}

          <div className="pb-8 space-y-3">
            <Button
              onClick={handleSubmit}
              disabled={submitIntake.isPending}
              className="w-full h-12 text-base bg-[#0d2a6e] hover:bg-[#0d2a6e]/90"
            >
              {submitIntake.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />送信中...</>
              ) : "この内容で送信する"}
            </Button>
            <p className="text-xs text-center text-slate-400">
              送信後、弁護士の準備ができるまでこの画面でお待ちください。
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── 相談中待機画面 ───────────────────────────────────
  if (step === "waiting") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6 px-4">
          <div className="bg-[#0d2a6e]/10 rounded-full p-6">
            <Clock className="h-14 w-14 text-[#0d2a6e]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {form.clientName ? `${form.clientName} 様` : "ご相談者様"}
            </h2>
            <p className="text-slate-500 mt-2 text-lg">ただいま相談中です</p>
            <p className="text-sm text-slate-400 mt-2">
              相談終了後、この画面が自動的に切り替わります
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-sm w-full text-left">
            <p className="text-xs text-amber-800 leading-relaxed">
              この画面はそのままにしておいてください。<br />
              相談終了後、お支払いとアンケートのご協力をお願いします。
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── PayPay QR表示 ────────────────────────────────────
  if (step === "payment" && session) {
    const amount = session.paymentAmount ?? 0;
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6 px-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-800">
              {session.clientName ? `${session.clientName} 様` : "ご相談者様"}
            </h2>
            <p className="text-slate-500">相談料のお支払いをお願いします</p>
          </div>

          <div className="bg-[#0d2a6e] text-white rounded-2xl px-10 py-5 shadow-lg">
            <p className="text-sm text-blue-200 mb-1">相談料</p>
            <p className="text-4xl font-bold tracking-tight">
              ¥{amount.toLocaleString()}
              <span className="text-lg font-normal ml-1">（税込）</span>
            </p>
          </div>

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

          <div className="w-full max-w-sm space-y-3">
            <Button
              onClick={handleConfirmPayment}
              disabled={confirmPayment.isPending}
              className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {confirmPayment.isPending ? (
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
      </div>
    );
  }

  // ─── アンケート ───────────────────────────────────────
  if (step === "survey") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
          <div>
            <h1 className="text-xl font-bold text-slate-800">法律相談アンケート</h1>
            {form.clientName && (
              <p className="text-sm text-slate-500 mt-1">
                {form.clientName} 様、本日はありがとうございました。
              </p>
            )}
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              差し支えのない範囲でご意見をお聞かせください。
              <span className="text-xs">（約1分・匿名可）</span>
            </p>
          </div>

          {/* Q1: 満足度 */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">
              Q1. 本日のご相談の満足度を教えてください。
              <span className="text-destructive text-xs ml-1">※必須</span>
            </h2>
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => setSatisfaction(star)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`h-10 w-10 transition-colors ${
                      star <= (hoveredStar || satisfaction)
                        ? "text-amber-400 fill-amber-400"
                        : "text-slate-200 fill-slate-200"
                    }`}
                  />
                </button>
              ))}
            </div>
            {satisfaction > 0 && (
              <p className="text-center text-sm font-medium text-[#0d2a6e]">
                {satisfaction}点 — {SATISFACTION_LABELS[satisfaction]}
              </p>
            )}
          </div>

          {/* Q2: 良かった点 */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Q2. 良かった点を選択してください。（複数選択可）</h2>
            <div className="grid grid-cols-2 gap-2">
              {GOOD_POINTS.map((point) => (
                <label key={point.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={goodPoints.includes(point.id)}
                    onCheckedChange={() => toggleGoodPoint(point.id)}
                  />
                  <span className="text-sm text-slate-700">{point.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Q3: 来所の決め手 */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Q3. 当事務所をお選びいただいた決め手は何ですか？</h2>
            <div className="space-y-2">
              {VISIT_TRIGGERS.map((trigger) => (
                <label key={trigger.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={visitTrigger.includes(trigger.id)}
                    onCheckedChange={() => toggleVisitTrigger(trigger.id)}
                  />
                  <span className="text-sm text-slate-700">{trigger.label}</span>
                </label>
              ))}
            </div>
            {visitTrigger.includes("other") && (
              <div className="space-y-1 mt-2">
                <Label className="text-xs text-slate-500">その他の内容</Label>
                <Textarea
                  value={visitTriggerOther}
                  onChange={(e) => setVisitTriggerOther(e.target.value)}
                  placeholder="具体的にお書きください"
                  rows={2}
                />
              </div>
            )}
          </div>

          {/* Q4: 自由記述 */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Q4. ご感想・ご要望をお聞かせください。（任意）</h2>
            <Textarea
              value={freeComment}
              onChange={(e) => setFreeComment(e.target.value)}
              placeholder="印象に残ったことや、改善してほしい点などをご自由にお書きください。"
              rows={4}
            />
          </div>

          <div className="pb-8">
            <Button
              onClick={handleSurveySubmit}
              disabled={submitSurvey.isPending || satisfaction === 0}
              className="w-full h-12 text-base bg-[#0d2a6e] hover:bg-[#0d2a6e]/90"
            >
              {submitSurvey.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />送信中...</>
              ) : "アンケートを送信する"}
            </Button>
            <p className="text-xs text-center text-slate-400 mt-3">
              ご回答は匿名で処理されます。個人を特定する情報は含まれません。
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── 完了・リセットカウントダウン ─────────────────────
  if (step === "done") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-lg w-full text-center space-y-6 py-8">
            <div className="flex justify-center">
              <div className="bg-emerald-100 rounded-full p-4">
                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">ご回答ありがとうございました</h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                {form.clientName ? `${form.clientName} 様、` : ""}
                本日はご相談いただき誠にありがとうございました。
              </p>
            </div>

            {/* Google口コミ誘導（満足度4以上） */}
            {googleReviewShown && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-left space-y-3">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                  <h3 className="text-sm font-semibold text-slate-800">Googleクチコミへのご協力のお願い</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  温かいお言葉をいただきありがとうございます。もしよろしければ、Googleクチコミへの投稿にご協力いただけませんか？
                </p>
                <p className="text-xs text-slate-500">
                  ※ニックネームやイニシャルでの投稿でも大変励みになります。
                </p>
                <Button
                  onClick={handleGoogleReviewClick}
                  className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white border-0"
                >
                  <ExternalLink className="h-4 w-4" />
                  Googleクチコミを投稿する
                </Button>
              </div>
            )}

            {/* 自動リセットカウントダウン */}
            <div className="bg-slate-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-center gap-2 text-slate-600">
                <RefreshCw className="h-4 w-4" />
                <span className="text-sm">{countdown}秒後に次の方の受付画面に切り替わります</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-[#0d2a6e] h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="w-full text-xs"
              >
                今すぐリセット
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // フォールバック
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-3">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <p className="text-sm text-slate-600">エラーが発生しました。スタッフにお声がけください。</p>
        <Button onClick={handleReset} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          リセット
        </Button>
      </div>
    </div>
  );
}
