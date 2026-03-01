import { trpc } from "@/lib/trpc";
import { CheckCircle2, Circle, ClipboardList } from "lucide-react";
import { useLocation } from "wouter";

export default function Checklists() {
  const [, setLocation] = useLocation();
  const { data: cases, isLoading } = trpc.cases.list.useQuery({ limit: 100 });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">チェックリスト一覧</h1>
        <p className="text-sm text-muted-foreground mt-0.5">各事件の処理チェックリストの進捗状況です</p>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">読み込み中...</div>
        ) : !cases || cases.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">事件が登録されていません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">事件番号</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">担当弁護士</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">委任契約</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">報酬説明</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">利益相反</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">預り金</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">本人確認</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <ChecklistRow key={c.id} caseData={c} onClick={() => setLocation(`/cases/${c.id}`)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ChecklistRow({ caseData, onClick }: { caseData: any; onClick: () => void }) {
  const { data: checklist } = trpc.checklists.getByCaseId.useQuery({ caseId: caseData.id });

  const Check = ({ checked }: { checked?: boolean | null }) =>
    checked ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
    ) : (
      <Circle className="h-4 w-4 text-muted-foreground/30 mx-auto" />
    );

  return (
    <tr
      onClick={onClick}
      className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3 font-medium text-primary">{caseData.caseNumber || `#${caseData.id}`}</td>
      <td className="px-4 py-3 text-muted-foreground">{caseData.assignedLawyer || "—"}</td>
      <td className="px-4 py-3 text-center"><Check checked={checklist?.contractCreated} /></td>
      <td className="px-4 py-3 text-center"><Check checked={checklist?.feeExplained} /></td>
      <td className="px-4 py-3 text-center"><Check checked={checklist?.conflictChecked} /></td>
      <td className="px-4 py-3 text-center"><Check checked={checklist?.depositChecked} /></td>
      <td className="px-4 py-3 text-center"><Check checked={checklist?.identityVerified} /></td>
    </tr>
  );
}
