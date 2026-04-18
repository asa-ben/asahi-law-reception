import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Router } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import IntakeForm from "./pages/IntakeForm";
import IntakeSurvey from "./pages/IntakeSurvey";
import IntakeSessions from "./pages/IntakeSessions";
import Settings from "./pages/Settings";
import TabletIntake from "./pages/TabletIntake";
import LocalLogin from "./pages/LocalLogin";

// VPS環境では/uketsukeをベースパスに設定
const BASE_PATH = import.meta.env.VITE_BASE_PATH ?? "/";
// 末尾の/を除去（wouterは末尾なしを期待）
const WOUTER_BASE = BASE_PATH.endsWith("/") ? BASE_PATH.slice(0, -1) : BASE_PATH;

function AppRouter() {
  return (
    <Switch>
      {/* 公開ページ（ログイン不要・依頼者向け） */}
      <Route path="/intake/:token/survey" component={IntakeSurvey} />
      <Route path="/intake/:token" component={IntakeForm} />
      {/* タブレット受付モード（ログイン不要） */}
      <Route path="/tablet" component={TabletIntake} />
      {/* ローカル認証ログインページ（VPS環境用） */}
      <Route path="/login" component={LocalLogin} />

      {/* 管理画面（スタッフ用・DashboardLayout） */}
      <Route>
        <DashboardLayout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/intake-sessions" component={IntakeSessions} />
            <Route path="/settings" component={Settings} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </DashboardLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router base={WOUTER_BASE}>
            <AppRouter />
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
