import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ExternalLink, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const LOGO_MARK = "https://d2xsxph8kpxj0f.cloudfront.net/310519663339519816/bWMCToBMaWZYU8v22C5xF4/asahi-logo-mark_b1e753e6.png";
const LOGO_TEXT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663339519816/bWMCToBMaWZYU8v22C5xF4/asahi-logo-text_c0ce50d8.png";

// Google口コミURLは実際のURLに差し替えてください
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

export default function Survey() {
  const [satisfaction, setSatisfaction] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [goodPoints, setGoodPoints] = useState<string[]>([]);
  const [visitTrigger, setVisitTrigger] = useState<string[]>([]);
  const [visitTriggerOther, setVisitTriggerOther] = useState("");
  const [freeComment, setFreeComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [responseId, setResponseId] = useState<number | null>(null);
  const [googleReviewShown, setGoogleReviewShown] = useState(false);

  const submitSurvey = trpc.surveys.submit.useMutation();
  const markReviewClicked = trpc.surveys.markReviewClicked.useMutation();

  const handleSubmit = async () => {
    if (satisfaction === 0) {
      toast.error("満足度を選択してください");
      return;
    }
    try {
      const result = await submitSurvey.mutateAsync({
        satisfaction,
        goodPoints: goodPoints.join(","),
        visitTrigger: visitTrigger.join(","),
        visitTriggerOther: visitTriggerOther || undefined,
        freeComment: freeComment || undefined,
      });
      setResponseId(result.id);
      setGoogleReviewShown(result.googleReviewShown);
      setSubmitted(true);
    } catch {
      toast.error("送信に失敗しました。もう一度お試しください。");
    }
  };

  const handleGoogleReviewClick = async () => {
    if (responseId) {
      await markReviewClicked.mutateAsync({ id: responseId });
    }
    window.open(GOOGLE_REVIEW_URL, "_blank");
  };

  const toggleGoodPoint = (id: string) => {
    setGoodPoints((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleVisitTrigger = (id: string) => {
    setVisitTrigger((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  // 送信完了画面
  if (submitted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="max-w-lg w-full mx-auto text-center space-y-6 p-6">
          <div className="flex justify-center">
            <div className="bg-emerald-100 rounded-full p-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">ご回答ありがとうございました</h2>
            <p className="text-sm text-muted-foreground mt-2">
              いただいた貴重なご意見は、今後の事務所運営に活かしてまいります。
            </p>
          </div>

          {/* Google口コミ誘導（満足度4以上のみ表示） */}
          {googleReviewShown && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-left space-y-3">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">Googleクチコミへのご協力のお願い</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                温かいお言葉をいただきありがとうございます。皆様からのクチコミが、同じ悩みを持つ方が一歩踏み出す勇気になります。もしよろしければ、1分ほどで終わるGoogleクチコミへの投稿にご協力いただけませんか？
              </p>
              <p className="text-xs text-muted-foreground">
                ※お名前を出すのが不安な場合は、ニックネームやイニシャルでの投稿でも大変励みになります。
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
        </div>
      </div>
    );
  }

  // アンケートフォーム
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="text-center space-y-3 py-4">
        <div className="flex items-center justify-center gap-3">
          <img src={LOGO_MARK} alt="ロゴ" className="h-10 w-auto" />
          <img src={LOGO_TEXT} alt="朝日弁護士法人" className="h-7 w-auto" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">法律相談アンケート</h1>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            この度は当事務所にご相談いただき、誠にありがとうございました。<br />
            今後のサービス向上のため、差し支えのない範囲でご意見をお聞かせください。<br />
            <span className="text-xs">（所要時間：約1分 ／ 匿名でご回答いただけます）</span>
          </p>
        </div>
      </div>

      {/* Q1: 満足度 */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Q1. 本日のご相談の満足度を教えてください。
            <span className="text-accent text-xs ml-1">※必須</span>
          </h2>
        </div>
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
            <span>不満</span>
            <span>大変満足</span>
          </div>
        </div>
      </div>

      {/* Q2: 良かった点 */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          Q2. 良かった点はどこですか？（複数回答可）
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {GOOD_POINTS.map((point) => (
            <label
              key={point.id}
              className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                goodPoints.includes(point.id)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <Checkbox
                checked={goodPoints.includes(point.id)}
                onCheckedChange={() => toggleGoodPoint(point.id)}
                className="shrink-0"
              />
              <span className="text-sm">{point.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Q3: 来所の決め手 */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          Q3. 当事務所を選んだ決め手は何でしたか？（複数回答可）
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {VISIT_TRIGGERS.map((trigger) => (
            <label
              key={trigger.id}
              className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                visitTrigger.includes(trigger.id)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <Checkbox
                checked={visitTrigger.includes(trigger.id)}
                onCheckedChange={() => toggleVisitTrigger(trigger.id)}
                className="shrink-0"
              />
              <span className="text-sm">{trigger.label}</span>
            </label>
          ))}
        </div>
        {visitTrigger.includes("other") && (
          <Textarea
            placeholder="その他の理由をご記入ください"
            value={visitTriggerOther}
            onChange={(e) => setVisitTriggerOther(e.target.value)}
            rows={2}
            className="mt-2"
          />
        )}
      </div>

      {/* Q4: 自由記述 */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          Q4. その他、お気づきの点があればお聞かせください。（任意）
        </h2>
        <Textarea
          placeholder="印象に残ったことや、改善してほしい点などをご自由にお書きください。"
          value={freeComment}
          onChange={(e) => setFreeComment(e.target.value)}
          rows={4}
        />
      </div>

      {/* 送信ボタン */}
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
  );
}
