import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

const LOGO_MARK = "https://d2xsxph8kpxj0f.cloudfront.net/310519663339519816/bWMCToBMaWZYU8v22C5xF4/asahi-logo-mark_b1e753e6.png";
const LOGO_TEXT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663339519816/bWMCToBMaWZYU8v22C5xF4/asahi-logo-text_c0ce50d8.png";

export default function IntakeForm() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();

  const { data: session, isLoading, refetch } = trpc.intake.getByToken.useQuery(
    { token: token ?? "" },
    { enabled: !!token, refetchInterval: 3000 } // 3秒ごとにポーリング
  );

  // ステータスが survey になったらアンケートへ遷移
  useEffect(() => {
    if (session?.status === "survey") {
      setLocation(`/intake/${token}/survey`);
    }
  }, [session?.status, token, setLocation]);

  if (!token) return <div className="p-8 text-center text-muted-foreground">無効なURLです</div>;
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!session) return <div className="p-8 text-center text-muted-foreground">セッションが見つかりません</div>;

  if (session.status === "waiting" || session.status === "consulting") {
    return <WaitingScreen name={session.name} />;
  }

  if (session.status === "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
          <p className="text-lg font-semibold text-foreground">すべての手続きが完了しました</p>
          <p className="text-sm text-muted-foreground">ご協力ありがとうございました。</p>
        </div>
      </div>
    );
  }

  return <IntakeFormFields token={token} />;
}

// ─── 個人情報入力フォーム ──────────────────────────────────────────────────────

function IntakeFormFields({ token }: { token: string }) {
  const [form, setForm] = useState({
    nameKana: "",
    name: "",
    birthDate: "",
    postalCode: "",
    address: "",
    phone: "",
    mobile: "",
    email: "",
    occupation: "",
    referrer: "",
    consultationReason: "",
  });

  const submitIntake = trpc.intake.submitIntake.useMutation();

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("お名前を入力してください");
      return;
    }
    try {
      await submitIntake.mutateAsync({ token, ...form });
    } catch {
      toast.error("送信に失敗しました。もう一度お試しください。");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <div className="bg-primary text-primary-foreground py-4 px-6">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <img src={LOGO_MARK} alt="ロゴ" className="h-8 w-auto brightness-0 invert" />
          <img src={LOGO_TEXT} alt="朝日弁護士法人" className="h-6 w-auto brightness-0 invert" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">ご相談者情報の入力</h1>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            法律相談の前に、以下の項目をご入力ください。<br />
            入力いただいた情報は、相談業務にのみ使用いたします。
          </p>
        </div>

        {/* 基本情報 */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">基本情報</h2>

          <div className="space-y-1.5">
            <Label htmlFor="nameKana" className="text-sm">ふりがな</Label>
            <Input id="nameKana" placeholder="あさひ たろう" value={form.nameKana} onChange={set("nameKana")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm">
              お名前 <span className="text-accent text-xs">※必須</span>
            </Label>
            <Input id="name" placeholder="朝日 太郎" value={form.name} onChange={set("name")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="birthDate" className="text-sm">生年月日</Label>
            <Input id="birthDate" type="date" value={form.birthDate} onChange={set("birthDate")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="occupation" className="text-sm">ご職業</Label>
            <Input id="occupation" placeholder="会社員・自営業・主婦 など" value={form.occupation} onChange={set("occupation")} />
          </div>
        </div>

        {/* 住所 */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">ご住所</h2>

          <div className="space-y-1.5">
            <Label htmlFor="postalCode" className="text-sm">郵便番号</Label>
            <Input id="postalCode" placeholder="000-0000" value={form.postalCode} onChange={set("postalCode")} className="max-w-[160px]" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-sm">住所</Label>
            <Input id="address" placeholder="都道府県・市区町村・番地" value={form.address} onChange={set("address")} />
          </div>
        </div>

        {/* 連絡先 */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">ご連絡先</h2>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-sm">電話番号（自宅）</Label>
            <Input id="phone" type="tel" placeholder="00-0000-0000" value={form.phone} onChange={set("phone")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mobile" className="text-sm">携帯電話</Label>
            <Input id="mobile" type="tel" placeholder="000-0000-0000" value={form.mobile} onChange={set("mobile")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm">メールアドレス</Label>
            <Input id="email" type="email" placeholder="example@email.com" value={form.email} onChange={set("email")} />
          </div>
        </div>

        {/* 紹介者・相談概要 */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">その他</h2>

          <div className="space-y-1.5">
            <Label htmlFor="referrer" className="text-sm">紹介者・来所のきっかけ</Label>
            <Input id="referrer" placeholder="例：〇〇様のご紹介、ホームページを見て" value={form.referrer} onChange={set("referrer")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="consultationReason" className="text-sm">ご相談の概要（任意）</Label>
            <Textarea
              id="consultationReason"
              placeholder="ご相談内容の概要をご記入ください（弁護士が事前に確認します）"
              value={form.consultationReason}
              onChange={set("consultationReason")}
              rows={3}
            />
          </div>
        </div>

        <div className="pb-8">
          <Button
            onClick={handleSubmit}
            disabled={submitIntake.isPending || !form.name.trim()}
            className="w-full h-12 text-base font-medium"
          >
            {submitIntake.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />送信中...</>
            ) : (
              "入力内容を送信する"
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            入力いただいた個人情報は、当事務所の個人情報保護方針に基づき適切に管理いたします。
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── 相談待機画面 ──────────────────────────────────────────────────────────────

function WaitingScreen({ name }: { name: string | null }) {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-primary text-primary-foreground py-4 px-6">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <img src={LOGO_MARK} alt="ロゴ" className="h-8 w-auto brightness-0 invert" />
          <img src={LOGO_TEXT} alt="朝日弁護士法人" className="h-6 w-auto brightness-0 invert" />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center space-y-6 max-w-sm">
          <div className="bg-primary/10 rounded-full p-6 inline-flex mx-auto">
            <Clock className="h-14 w-14 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {name ? `${name} 様` : "ご相談者様"}
            </h2>
            <p className="text-base text-muted-foreground mt-2">
              情報の送信が完了しました。
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              弁護士の準備ができましたら、<br />
              この画面が自動的に切り替わります{dots}
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
            <p className="text-xs text-amber-800 leading-relaxed">
              この画面はそのままにしておいてください。<br />
              相談終了後、アンケートのご協力をお願いします。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
