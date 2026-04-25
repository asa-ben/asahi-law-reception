import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Settings,
  Tablet,
  UserCheck,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const LOGO_MARK = "https://d2xsxph8kpxj0f.cloudfront.net/310519663339519816/bWMCToBMaWZYU8v22C5xF4/asahi-logo-mark_b1e753e6.png";
const LOGO_TEXT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663339519816/bWMCToBMaWZYU8v22C5xF4/asahi-logo-text_c0ce50d8.png";

const menuItems = [
  { icon: LayoutDashboard, label: "ダッシュボード", path: "/" },
  { icon: UserCheck, label: "受付管理", path: "/intake-sessions" },
  { icon: Settings, label: "設定", path: "/settings" },
];

const BASE_PATH = (import.meta.env.VITE_BASE_PATH ?? "").replace(/\/$/, "");
const externalLinks = [
  { icon: Tablet, label: "タブレット受付モード", path: `${BASE_PATH}/tablet` },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 200;
const MAX_WIDTH = 360;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location, navigate] = useLocation();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      const useLocalAuth = import.meta.env.VITE_USE_LOCAL_AUTH === "true";
      window.location.href = useLocalAuth ? `${BASE_PATH}/login` : getLoginUrl();
    }
  }, [loading, isAuthenticated]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    const delta = e.clientX - startX.current;
    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
    setSidebarWidth(newWidth);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  if (loading) return <DashboardLayoutSkeleton />;
  if (!isAuthenticated) return null;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar
          style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
          className="border-r border-border bg-card"
        >
          <SidebarHeader className="px-4 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <img src={LOGO_MARK} alt="朝日ロゴ" className="h-8 w-auto" />
              <img src={LOGO_TEXT} alt="朝日弁護士法人" className="h-5 w-auto" />
            </div>
            <p className="text-xs text-muted-foreground mt-1 pl-0.5">依頼者登録システム</p>
          </SidebarHeader>

          <SidebarContent className="px-2 py-3 flex flex-col gap-4">
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => navigate(item.path)}
                      className={`gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            {/* タブレット受付モードリンク */}
            <div className="border-t border-border pt-3">
              <p className="text-[10px] text-muted-foreground px-3 mb-2 uppercase tracking-wider">タブレット</p>
              <SidebarMenu>
                {externalLinks.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => window.open(item.path, "_blank", "noopener,noreferrer")}
                      className="gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
          </SidebarContent>

          <SidebarFooter className="border-t border-border p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full rounded-lg px-3 py-2 hover:bg-muted transition-colors text-left">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {user?.name?.charAt(0) ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{user?.name ?? "スタッフ"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={logout} className="gap-2 text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" />
                  ログアウト
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>

          {/* リサイズハンドル */}
          {!isMobile && (
            <div
              onMouseDown={handleMouseDown}
              className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/30 transition-colors"
            />
          )}
        </Sidebar>

        <SidebarInset className="flex-1 flex flex-col overflow-hidden">
          {isMobile && (
            <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
              <SidebarTrigger>
                <PanelLeft className="h-5 w-5" />
              </SidebarTrigger>
              <div className="flex items-center gap-2">
                <img src={LOGO_MARK} alt="" className="h-6 w-auto" />
                <span className="text-sm font-semibold text-foreground">朝日弁護士法人</span>
              </div>
            </header>
          )}
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
