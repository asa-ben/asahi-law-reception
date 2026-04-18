import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Eye, EyeOff } from "lucide-react";

const LOGO_MARK = "https://d2xsxph8kpxj0f.cloudfront.net/310519663339519816/bWMCToBMaWZYU8v22C5xF4/asahi-logo-mark_b1e753e6.png";
const LOGO_TEXT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663339519816/bWMCToBMaWZYU8v22C5xF4/asahi-logo-text_c0ce50d8.png";

const BASE_PATH = import.meta.env.VITE_BASE_PATH ?? "/";

export default function LocalLogin() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const apiBase = BASE_PATH === "/" ? "" : BASE_PATH.replace(/\/$/, "");
    try {
      const res = await fetch(`${apiBase}/api/local-auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });

      if (res.ok) {
        window.location.href = BASE_PATH;
      } else {
        const data = await res.json();
        setError(data.error || "ログインに失敗しました");
      }
    } catch {
      setError("サーバーへの接続に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src={LOGO_MARK} alt="朝日ロゴ" className="h-10 w-auto" />
          <img src={LOGO_TEXT} alt="朝日弁護士法人" className="h-6 w-auto" />
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-lg font-semibold text-[#0d2a6e] flex items-center justify-center gap-2">
              <Lock className="h-5 w-5" />
              管理システム ログイン
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  パスワード
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワードを入力"
                    className="pr-10"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading || !password}
                className="w-full bg-[#0d2a6e] hover:bg-[#0d2a6e]/90 text-white"
              >
                {loading ? "ログイン中..." : "ログイン"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          朝日弁護士法人 依頼者登録システム
        </p>
      </div>
    </div>
  );
}
