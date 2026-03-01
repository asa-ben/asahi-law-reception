import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ExternalLink, Loader2, Star } from "lucide-react";
import { useState } from "react";
import { useParams } from "wouter";
import { toast } from "sonner";

const LOGO_MARK = "https://d2xsxph8kpxj0f.cloudfront.net/310519663339519816/bWMCToBMaWZYU8v22C5xF4/asahi-logo-mark_b1e753e6.png";
const LOGO_TEXT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663339519816/bWMCToBMaWZYU8v22C5xF4/asahi-logo-text_c0ce50d8.png";
const GOOGLE_REVIEW_URL = "https://g.page/r/XXXXXXXXXXXXXXXX/review";

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

  const submitSurvey = trpc.surveys.submit.useMutation();
  const completeSurvey = trpc.intake.completeSurvey.useMutation();
  const markReviewClicked = trpc.surveys.markReviewClicked.useMutation();

  const toggleGoodPoint = (id: string) =>
    setGoodPoints((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleVisitTrigger = (id: string) =>
    setVisitTrigger((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleSubmit = async () => {
    if (satisfaction === 0) { toast.error("満足度を選択してください"); return; }
    try {
      const result = await submitSurvey.mutateAsync({
        satisfaction,
        goodPoints: goodPoints.join(","),
        visitTrigger: visitTrigger.join(","),
        visitTriggerOther: visitTriggerOther || undefined,
        freeComment: freeComment || undefined,
      });
      setSurveyResponseId(result.id);
      setGoogleReviewShown(result.googleReviewShown);
      // セッションを完了に更新
      if (token) {
        await completeSurvey.mutateAsync({ token, surveyResponseId: result.id });
      }
      setSubmitted(true);
    } catch {
      toast.error("送信に失敗しました。もう一度お試しください。");
    }
  };

  const handleGoogleReviewClick = async () => {
    if (surveyResponseId) await markReviewClicked.mutateAsync({ id: surveyResponseId });
    window.open(GOOGLE_REVIEW_URL, "_blank");
  };

  if (!token) return <div className="p-8 text-center text-muted-foreground">無効なURLです</div>;
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  // 送信完了画面
  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="bg-primary text-primary-foreground py-4 px-6">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <img src={LOGO_MARK} alt="ロゴ" className="h-8 w-auto brightness-0 invert" />
            <img src={LOGO_TEXT} alt="朝日弁護士法人" className="h-6 w-auto brightness-0 invert" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-lg w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="bg-emerald-100 rounded-full p-4">
                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">ご回答ありがとうございました</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {session?.name ? `${session.name} 様、` : ""}本日はご相談いただき誠にありがとうございました。<br />
                いただいたご意見は、今後のサービス向上に活かしてまいります。
              </p>
            </div>
            {googleReviewShown && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-left space-y-3">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                  <h3 className="text-sm font-semibold text-foreground">Googleクチコミへのご協力のお願い</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  温かいお言葉をいただきありがとうございます。皆様からのクチコミが、同じ悩みを持つ方が一歩踏み出す勇気になります。もしよろしければ、Googleクチコミへの投稿にご協力いただけませんか？
                </p>
                <p className="text-xs text-muted-foreground">
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
            <p className="text-xs text-muted-foreground">この画面は閉じていただいて構いません。</p>
          </div>
        </div>
      </div>
    );
  }

  // アンケートフォーム
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground py-4 px-6">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <img src={LOGO_MARK} alt="ロゴ" className="h-8 w-auto brightness-0 invert" />
          <img src={LOGO_TEXT} alt="朝日弁護士法人" className="h-6 w-auto brightness-0 invert" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">法律相談アンケート</h1>
          {session?.name && (
            <p className="text-sm text-muted-foreground mt-1">{session.name} 様、本日はありがとうございました。</p>
          )}
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            差し支えのない範囲でご意見をお聞かせください。<span className="text-xs">（約1分・匿名可）</span>
          </p>
        </div>

        {/* Q1: 満足度 */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            Q1. 本日のご相談の満足度を教えてください。
            <span className="text-accent text-xs ml-1">※必須</span>
          </h2>
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setSatisfaction(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`h-10 w-10 transition-colors ${
                      star <= (hoveredStar || satisfaction)
                        ? "text-amber-400 fill-amber-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
            {(hoveredStar || satisfaction) > 0 && (
              <p className="text-sm font-medium text-amber-600">
                {SATISFACTION_LABELS[hoveredStar || satisfaction]}
              </p>
            )}
            <div className="flex justify-between w-full max-w-xs text-xs text-muted-foreground">
              <span>不満</span><span>大変満足</span>
            </div>
          </div>
        </div>

        {/* Q2: 良かった点 */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Q2. 良かった点はどこですか？（複数回答可）</h2>
          <div className="grid grid-cols-2 gap-3">
            {GOOD_POINTS.map((point) => (
              <label
                key={point.id}
                className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                  goodPoints.includes(point.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <Checkbox checked={goodPoints.includes(point.id)} onCheckedChange={() => toggleGoodPoint(point.id)} className="shrink-0" />
                <span className="text-sm">{point.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Q3: 来所の決め手 */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Q3. 当事務所を選んだ決め手は何でしたか？（複数回答可）</h2>
          <div className="grid grid-cols-2 gap-3">
            {VISIT_TRIGGERS.map((trigger) => (
              <label
                key={trigger.id}
                className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                  visitTrigger.includes(trigger.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <Checkbox checked={visitTrigger.includes(trigger.id)} onCheckedChange={() => toggleVisitTrigger(trigger.id)} className="shrink-0" />
                <span className="text-sm">{trigger.label}</span>
              </label>
            ))}
          </div>
          {visitTrigger.includes("other") && (
            <Textarea placeholder="その他の理由をご記入ください" value={visitTriggerOther} onChange={(e) => setVisitTriggerOther(e.target.value)} rows={2} className="mt-2" />
          )}
        </div>

        {/* Q4: 自由記述 */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Q4. その他、お気づきの点があればお聞かせください。（任意）</h2>
          <Textarea placeholder="印象に残ったことや、改善してほしい点などをご自由にお書きください。" value={freeComment} onChange={(e) => setFreeComment(e.target.value)} rows={4} />
        </div>

        <div className="pb-8">
          <Button
            onClick={handleSubmit}
            disabled={submitSurvey.isPending || satisfaction === 0}
            className="w-full h-12 text-base font-medium"
          >
            {submitSurvey.isPending ? "送信中..." : "アンケートを送信する"}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            ご回答いただいた内容は、事務所のサービス向上のみに使用いたします。
          </p>
        </div>
      </div>
    </div>
  );
}
