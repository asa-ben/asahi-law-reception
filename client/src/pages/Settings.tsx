import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ExternalLink, KeyRound, Loader2, Save, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const USE_LOCAL_AUTH = import.meta.env.VITE_USE_LOCAL_AUTH === "true";
const BASE_PATH = import.meta.env.VITE_BASE_PATH ?? "/";
const API_BASE = BASE_PATH === "/" ? "" : BASE_PATH.replace(/\/$/, "");

export default function Settings() {
  const { data: settings, isLoading, refetch } = trpc.settings.getAll.useQuery();
  const setSetting = trpc.settings.set.useMutation({
    onSuccess: () => {
      toast.success("設定を保存しました");
      refetch();
    },
    onError: () => toast.error("保存に失敗しました"),
  });

  const [sfOrgId, setSfOrgId] = useState("");
  const [sfUrl, setSfUrl] = useState("https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  // パスワード変更用ステート
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordChanging, setPasswordChanging] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("新しいパスワードと確認用パスワードが一致しません");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("パスワードは8文字以上で入力してください");
      return;
    }
    setPasswordChanging(true);
    try {
      const res = await fetch(`${API_BASE}/api/local-auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("パスワードを変更しました");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(data.error || "パスワードの変更に失敗しました");
      }
    } catch {
      toast.error("サーバーへの接続に失敗しました");
    } finally {
      setPasswordChanging(false);
    }
  };

  useEffect(() => {
    if (settings) {
      setSfOrgId(settings.sf_org_id ?? "");
      setSfUrl(settings.sf_web_to_lead_url ?? "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8");
      setGoogleReviewUrl(settings.google_review_url ?? "");
    }
  }, [settings]);

  const handleSave = async (key: string, value: string, label: string) => {
    await setSetting.mutateAsync({ key, value });
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings2 className="h-6 w-6" />
          設定
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Salesforce連携・Google口コミの設定を管理します</p>
      </div>

      {/* Salesforce設定 */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">Salesforce Web-to-Lead 設定</h2>
          <p className="text-sm text-muted-foreground mt-1">
            依頼者・相手方の情報をSalesforceに自動入力するための設定です。
          </p>
        </div>

        {/* 組織ID */}
        <div className="space-y-2">
          <Label htmlFor="sf-org-id" className="text-sm font-medium">
            Salesforce 組織ID（OID）
            <span className="text-destructive ml-1">*必須</span>
          </Label>
          <p className="text-xs text-muted-foreground">
            Salesforce管理画面 → 設定 → 会社の情報 で確認できます（例: 00D5j000000XXXXX）
          </p>
          <div className="flex gap-2">
            <Input
              id="sf-org-id"
              value={sfOrgId}
              onChange={(e) => setSfOrgId(e.target.value)}
              placeholder="00D5j000000XXXXX"
              className="font-mono"
            />
            <Button
              onClick={() => handleSave("sf_org_id", sfOrgId, "Salesforce組織ID")}
              disabled={setSetting.isPending}
              className="shrink-0 gap-1.5 bg-[#0d2a6e] hover:bg-[#0d2a6e]/90"
            >
              {saved === "sf_org_id" ? (
                <><CheckCircle2 className="h-4 w-4" />保存済み</>
              ) : setSetting.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <><Save className="h-4 w-4" />保存</>
              )}
            </Button>
          </div>
        </div>

        {/* Web-to-Lead URL */}
        <div className="space-y-2">
          <Label htmlFor="sf-url" className="text-sm font-medium">
            Web-to-Lead 送信先URL
          </Label>
          <p className="text-xs text-muted-foreground">
            通常は変更不要です。Sandboxをご利用の場合は変更が必要です。
          </p>
          <div className="flex gap-2">
            <Input
              id="sf-url"
              value={sfUrl}
              onChange={(e) => setSfUrl(e.target.value)}
              placeholder="https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8"
              className="font-mono text-xs"
            />
            <Button
              onClick={() => handleSave("sf_web_to_lead_url", sfUrl, "Web-to-Lead URL")}
              disabled={setSetting.isPending}
              className="shrink-0 gap-1.5 bg-[#0d2a6e] hover:bg-[#0d2a6e]/90"
            >
              {saved === "sf_web_to_lead_url" ? (
                <><CheckCircle2 className="h-4 w-4" />保存済み</>
              ) : (
                <><Save className="h-4 w-4" />保存</>
              )}
            </Button>
          </div>
        </div>

        {/* Salesforce Web-to-Lead設定手順 */}
        <div className="bg-blue-50 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-blue-800">Salesforce Web-to-Lead の有効化手順</p>
          <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
            <li>Salesforce管理画面 → 設定 → 「Web-to-Lead」を検索</li>
            <li>「Web-to-Leadを有効化」にチェックを入れて保存</li>
            <li>「Web-to-Leadフォームを作成」から組織IDを確認</li>
            <li>上記フォームに組織IDを入力して保存</li>
          </ol>
          <a
            href="https://help.salesforce.com/s/articleView?id=sf.setting_up_web-to-lead.htm"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-2"
          >
            <ExternalLink className="h-3 w-3" />
            Salesforce公式ヘルプを開く
          </a>
        </div>
      </div>

      {/* パスワード変更（VPS環境のみ表示） */}
      {USE_LOCAL_AUTH && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              パスワード変更
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              管理画面のログインパスワードを変更します。
            </p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password" className="text-sm font-medium">
                現在のパスワード
              </Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="現在のパスワードを入力"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm font-medium">
                新しいパスワード
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="8文字以上で入力"
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-medium">
                新しいパスワード（確認）
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="新しいパスワードを再入力"
                required
                minLength={8}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">パスワードが一致しません</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={passwordChanging || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              className="gap-1.5 bg-[#0d2a6e] hover:bg-[#0d2a6e]/90"
            >
              {passwordChanging ? (
                <><Loader2 className="h-4 w-4 animate-spin" />変更中...</>
              ) : (
                <><KeyRound className="h-4 w-4" />パスワードを変更</>
              )}
            </Button>
          </form>
        </div>
      )}

      {/* Google口コミ設定 */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">Google口コミ設定</h2>
          <p className="text-sm text-muted-foreground mt-1">
            アンケートで満足度4以上の依頼者に表示するGoogle口コミのURLを設定します。
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="google-review-url" className="text-sm font-medium">
            GoogleビジネスプロフィールのクチコミURL
          </Label>
          <p className="text-xs text-muted-foreground">
            Googleビジネスプロフィール管理画面 → 「クチコミを取得」からURLを取得できます（例: https://g.page/r/XXXXXXXX/review）
          </p>
          <div className="flex gap-2">
            <Input
              id="google-review-url"
              value={googleReviewUrl}
              onChange={(e) => setGoogleReviewUrl(e.target.value)}
              placeholder="https://g.page/r/XXXXXXXXXXXXXXXX/review"
            />
            <Button
              onClick={() => handleSave("google_review_url", googleReviewUrl, "Google口コミURL")}
              disabled={setSetting.isPending}
              className="shrink-0 gap-1.5 bg-[#0d2a6e] hover:bg-[#0d2a6e]/90"
            >
              {saved === "google_review_url" ? (
                <><CheckCircle2 className="h-4 w-4" />保存済み</>
              ) : (
                <><Save className="h-4 w-4" />保存</>
              )}
            </Button>
          </div>
          {googleReviewUrl && (
            <a
              href={googleReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              設定したURLを確認する
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
