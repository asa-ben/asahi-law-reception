import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ExternalLink, Loader2, Star } from "lucide-react";
import { useState } from "react";
import { useParams } from "wouter";
import { toast } from "sonner";

const LOGO_MARK = "https://d2xsxph8kpxj0f.cloudfront.net/310519663339519816/bWMCToBMaWZYU8v22C5xF4/asahi-logo-mark_b1e753e6.png";
const LOGO_TEXT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663339519816/bWMCToBMaWZYU8v22C5xF4/asahi-logo-text_c0ce50d8.png";
// Google口コミURLは設定画面から動的に取得

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

export default function IntakeSurvey() {
  const { token } = useParams<{ token: string }>();
  const { data: settings } = trpc.settings.getAll.useQuery();
  const googleReviewUrl = settings?.google_review_url || "https://g.page/r/XXXXXXXXXXXXXXXX/review";
  const { data: session, isLoading } = trpc.intake.getByToken.useQuery(
    { token: token ?? "" },
    { enabled: !!token }
  );

  const [satisfaction, setSatisfaction] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [goodPoints, setGoodPoints] = useState<string[]>([]);
  const [visitTrigger, setVisitTrigger] = useState<string[]>([]);
  const [visitTriggerOther, setVisitTriggerOther] = useState("");
  const [freeComment, setFreeComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [googleReviewShown, setGoogleReviewShown] = useState(false);
  const [surveyResponseId, setSurveyResponseId] = useState<number | null>(null);

  const submitSurvey = trpc.survey.submit.useMutation();
  const completeSurvey = trpc.intake.completeSurvey.useMutation();
  const clickReview = trpc.survey.clickReview.useMutation();

  const toggleGoodPoint = (id: string) =>
    setGoodPoints((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleVisitTrigger = (id: string) =>
    setVisitTrigger((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleSubmit = async () => {
    if (satisfaction === 0) { toast.error("満足度を選択してください"); return; }
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
      setSubmitted(true);
    } catch {
      toast.error("送信に失敗しました。もう一度お試しください。");
    }
  };

  const handleGoogleReviewClick = async () => {
    if (surveyResponseId) {
      await clickReview.mutateAsync({ id: surveyResponseId });
    }
    window.open(googleReviewUrl, "_blank", "noopener,noreferrer");
  };

  if (!token || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0d2a6e]" />
      </div>
    );
  }

  // サンクスページ
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-[#0d2a6e] text-white px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <img src={LOGO_MARK} alt="" className="h-8 w-auto brightness-0 invert" />
            <img src={LOGO_TEXT} alt="朝日弁護士法人" className="h-4 w-auto brightness-0 invert" />
          </div>
        </header>
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
                {session?.clientName ? `${session.clientName} 様、` : ""}本日はご相談いただき誠にありがとうございました。<br />
                いただいたご意見は、今後のサービス向上に活かしてまいります。
              </p>
            </div>
            {googleReviewShown && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-left space-y-3">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                  <h3 className="text-sm font-semibold text-slate-800">Googleクチコミへのご協力のお願い</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  温かいお言葉をいただきありがとうございます。皆様からのクチコミが、同じ悩みを持つ方が一歩踏み出す勇気になります。もしよろしければ、Googleクチコミへの投稿にご協力いただけませんか？
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
            <p className="text-xs text-slate-400">この画面は閉じていただいて構いません。</p>
          </div>
        </div>
      </div>
    );
  }

  // アンケートフォーム
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#0d2a6e] text-white px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <img src={LOGO_MARK} alt="" className="h-8 w-auto brightness-0 invert" />
          <img src={LOGO_TEXT} alt="朝日弁護士法人" className="h-4 w-auto brightness-0 invert" />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">法律相談アンケート</h1>
          {session?.clientName && (
            <p className="text-sm text-slate-500 mt-1">{session.clientName} 様、本日はありがとうございました。</p>
          )}
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">
            差し支えのない範囲でご意見をお聞かせください。<span className="text-xs">（約1分・匿名可）</span>
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
            onClick={handleSubmit}
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
