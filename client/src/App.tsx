import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Cases from "./pages/Cases";
import CaseDetail from "./pages/CaseDetail";
import CaseNew from "./pages/CaseNew";
import Clients from "./pages/Clients";
import Checklists from "./pages/Checklists";
import Survey from "./pages/Survey";
import Surveys from "./pages/Surveys";
import IntakeForm from "./pages/IntakeForm";
import IntakeSurvey from "./pages/IntakeSurvey";
import IntakeSessions from "./pages/IntakeSessions";

function Router() {
  return (
    <Switch>
      {/* 公開ページ（DashboardLayout不要） */}
      <Route path="/intake/:token/survey" component={IntakeSurvey} />
      <Route path="/intake/:token" component={IntakeForm} />

      {/* 管理画面（DashboardLayout） */}
      <Route>
        <DashboardLayout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/cases" component={Cases} />
            <Route path="/cases/new" component={CaseNew} />
            <Route path="/cases/:id" component={CaseDetail} />
            <Route path="/clients" component={Clients} />
            <Route path="/checklists" component={Checklists} />
            <Route path="/survey" component={Survey} />
            <Route path="/surveys" component={Surveys} />
            <Route path="/intake-sessions" component={IntakeSessions} />
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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
