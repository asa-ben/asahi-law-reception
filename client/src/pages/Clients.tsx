import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Search, User } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Clients() {
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const { data: clients, isLoading } = trpc.clients.list.useQuery({ search: search || undefined, limit: 100 });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">依頼者一覧</h1>
        <p className="text-sm text-muted-foreground mt-0.5">登録されている依頼者の一覧です</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="氏名・ふりがなで検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">読み込み中...</div>
        ) : !clients || clients.length === 0 ? (
          <div className="p-12 text-center">
            <User className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">依頼者が登録されていません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">氏名</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">ふりがな</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">電話番号</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">メール</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">紹介者</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setLocation(`/cases/${c.caseId}`)}
                    className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.nameKana || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.phone || c.mobile || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.email || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.referrer || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
