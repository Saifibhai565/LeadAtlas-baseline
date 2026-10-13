"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  BookOpen,
  Building2,
  Code2,
  Coins,
  CreditCard,
  Globe2,
  Crosshair,
  LayoutTemplate,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Sun,
  MessageCircle,
  MessageSquareText,
  Radar,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import type { CurrentUser } from "@/lib/auth";
import { BrandMark, useBrand } from "./brand";
import { CommandPalette } from "./command-palette";
import { SupportWidget } from "./support-widget";
import { toggleTheme } from "@/lib/theme";
import { APP_NAME, cn, formatNumber } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/searches", label: "Searches", icon: Search },
  { href: "/watches", label: "Watches", icon: Radar },
  { href: "/leads", label: "Leads", icon: Building2 },
  { href: "/enrich", label: "Website checks", icon: Globe2 },
  { href: "/rank", label: "Rank tracker", icon: Crosshair },
  { href: "/extract", label: "Web extractor", icon: Sparkles },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/inbox", label: "WhatsApp inbox", icon: Inbox },
  { href: "/campaigns", label: "WhatsApp & SMS", icon: MessageCircle },
  { href: "/outreach", label: "Email outreach", icon: Send },
  { href: "/templates", label: "Templates", icon: MessageSquareText },
  { href: "/sites", label: "Websites", icon: LayoutTemplate },
];

const ACCOUNT = [
  { href: "/team", label: "Team", icon: Users },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/developers", label: "API and extension", icon: Code2 },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help center", icon: BookOpen },
  { href: "/", label: "View website", icon: Globe2 },
];

type Note = { id: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string };

function NotificationBell() {
  const [items, setItems] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/notifications", { cache: "no-store" })
        .then((r) => r.json())
        .then((b) => {
          if (!alive) return;
          setItems(b.items ?? []);
          setUnread(b.unread ?? 0);
        })
        .catch(() => undefined);
    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      await fetch("/api/notifications", { method: "POST" }).catch(() => undefined);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative rounded-control p-1.5 text-muted hover:bg-raised hover:text-ink"
        aria-label={unread ? `${unread} new notifications` : "Notifications"}
        aria-expanded={open}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="tabular absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-pin px-1 text-[10px] font-bold text-pin-ink">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" aria-label="Close notifications" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-[320px] overflow-hidden rounded-panel border border-line bg-surface shadow-2xl">
            <p className="border-b border-line px-4 py-2.5 text-sm font-semibold">Notifications</p>
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-muted">Nothing yet. Watches tell you here when they find new businesses.</p>
            ) : (
              <ul className="max-h-[360px] divide-y divide-line overflow-y-auto">
                {items.map((n) => (
                  <li key={n.id}>
                    <Link href={n.link ?? "#"} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-raised/50">
                      <p className={cn("text-[13px]", !n.readAt && "font-semibold")}>{n.title}</p>
                      {n.body && <p className="mt-0.5 text-[12px] text-muted">{n.body}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ThemeButton() {
  const router = useRouter();
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.dataset.theme === "dark"), []);
  return (
    <button
      onClick={() => {
        setDark(toggleTheme() === "dark");
        router.refresh();
      }}
      className="rounded-control p-1.5 text-muted hover:bg-raised hover:text-ink"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

function EngineDot() {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    const check = () =>
      fetch("/api/engine/status")
        .then((r) => r.json())
        .then((b) => alive && setOnline(Boolean(b.online)))
        .catch(() => alive && setOnline(false));
    check();
    const t = setInterval(check, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const label = online == null ? "Checking engine" : online ? "Engine online" : "Engine offline";
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-muted" title={label}>
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          online == null ? "bg-muted" : online ? "bg-ok shadow-[0_0_0_3px_rgb(var(--ok)/0.18)]" : "bg-danger",
        )}
      />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

function NavList({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <ul className="space-y-0.5">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-control px-3 py-2 text-sm transition-colors",
                active ? "bg-raised font-medium text-ink" : "text-muted hover:bg-raised/60 hover:text-ink",
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-pin")} aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function AccountBanners({ user, smtpReady }: { user: CurrentUser; smtpReady: boolean }) {
  const router = useRouter();
  const [sent, setSent] = useState(false);

  async function backToAdmin() {
    const res = await fetch("/api/auth/stop-impersonating", { method: "POST" });
    router.replace(res.ok ? "/admin" : "/login");
    router.refresh();
  }
  async function resend() {
    const res = await fetch("/api/auth/resend-verify", { method: "POST" });
    const b = await res.json().catch(() => ({}));
    if (res.ok) setSent(true);
    else alert(b.error ?? "Couldn't send the email.");
  }

  if (user.impersonating) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3 bg-pin px-4 py-2 text-center text-[13px] font-medium text-pin-ink">
        You're viewing the app as {user.name} ({user.email}). Anything you do here happens on their account.
        <button onClick={backToAdmin} className="rounded-full bg-pin-ink/15 px-3 py-0.5 underline-offset-2 hover:underline">
          Back to admin
        </button>
      </div>
    );
  }
  if (!user.emailVerified && smtpReady) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3 border-b border-line bg-info/10 px-4 py-2 text-[13px] text-info">
        {sent ? "Sent. Check your inbox and spam folder." : `Confirm your email (${user.email}) so you can reset your password and get receipts.`}
        {!sent && (
          <button onClick={resend} className="font-medium underline-offset-2 hover:underline">
            Resend email
          </button>
        )}
      </div>
    );
  }
  return null;
}

const FEATURE_BY_PATH: Record<string, string> = {
  "/searches": "searches",
  "/watches": "watches",
  "/enrich": "enrich",
  "/extract": "extract",
  "/pipeline": "pipeline",
  "/inbox": "inbox",
  "/campaigns": "campaigns",
  "/outreach": "outreach",
  "/templates": "templates",
  "/team": "team",
  "/developers": "developers",
  "/rank": "rank",
  "/sites": "sites",
};

export function AppShell({
  user,
  children,
  smtpReady = false,
  features,
}: {
  user: CurrentUser;
  children: React.ReactNode;
  smtpReady?: boolean;
  features?: string[];
}) {
  const visible = (items: NavItem[]) => items.filter((i) => !FEATURE_BY_PATH[i.href] || !features || features.includes(FEATURE_BY_PATH[i.href]));
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const brand = useBrand();

  useEffect(() => setOpen(false), [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const sidebar = (
    <nav className="flex h-full flex-col gap-5 overflow-y-auto p-4" aria-label="Main">
      <Link href="/dashboard" className="flex items-center px-2 pt-1">
        <BrandMark />
      </Link>

      <NavList items={visible(NAV)} pathname={pathname} />

      <div>
        <p className="mb-1 px-3 text-[12px] text-muted/80">Account</p>
        <NavList
          items={[...visible(ACCOUNT), ...(user.isAdmin ? [{ href: "/admin", label: "Super Admin", icon: Shield }] : [])]}
          pathname={pathname}
        />
      </div>

      <div className="mt-auto rounded-panel border border-line bg-night/60 p-3">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-[13px] text-muted">{user.email}</p>
        {!user.isOwner && <p className="mt-1 text-[12px] text-muted">Team member</p>}
        <button
          onClick={logout}
          className="mt-3 inline-flex items-center gap-2 text-[13px] text-muted hover:text-ink"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden />
          Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-line bg-surface lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-night/70" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[260px] border-r border-line bg-surface">{sidebar}</aside>
        </div>
      )}

      <div className="min-w-0">
        <AccountBanners user={user} smtpReady={smtpReady} />
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-line bg-night/85 px-4 backdrop-blur sm:px-6">
          <button className="text-muted lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <button
            onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
            className="hidden items-center gap-2 rounded-control border border-line px-3 py-1.5 text-[13px] text-muted hover:text-ink md:inline-flex"
          >
            <Search className="h-3.5 w-3.5" aria-hidden />
            Search or jump to…
            <kbd className="rounded border border-line px-1 text-[11px]">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-5">
            <EngineDot />
            <ThemeButton />
            <NotificationBell />
            <Link
              href="/billing"
              className="hidden rounded-full border border-line px-2.5 py-1 text-[13px] text-muted hover:text-ink sm:inline"
              title="Your plan"
            >
              {user.isAdmin ? "Admin" : `${user.planName} plan`}
            </Link>
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[13px]"
              title="1 credit is used for every new lead saved"
            >
              <Coins className="h-3.5 w-3.5 text-pin" aria-hidden />
              <span className="tabular font-medium">{formatNumber(user.credits)}</span>
              <span className="text-muted">credits</span>
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-6">{children}</main>
        <CommandPalette isAdmin={user.isAdmin} />
        {!user.isAdmin && <SupportWidget />}
      </div>
    </div>
  );
}
