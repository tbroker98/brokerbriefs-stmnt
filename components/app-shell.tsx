import Link from "next/link";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
};

type AppShellProps = {
  activeHref?: string;
  brandMain: string;
  brandSub: string;
  footerMain?: string;
  footerSub?: string;
  navItems: NavItem[];
  children: ReactNode;
};

export function AppShell({
  activeHref,
  brandMain,
  brandSub,
  footerMain,
  footerSub,
  navItems,
  children
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-shell-header">
        <div className="app-shell-header-inner">
          <Link href="/" className="app-brand">
            <span className="app-brand-mark" aria-hidden="true">
              BB
            </span>
            <span className="app-brand-copy">
              <span className="app-brand-main">{brandMain}</span>
              <span className="app-brand-sub">{brandSub}</span>
            </span>
          </Link>

          <nav className="app-nav">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={item.href === activeHref ? "active" : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="app-main">{children}</main>

      <footer className="app-footer">
        <span>{footerMain || brandMain}</span>
        <span>{footerSub || brandSub}</span>
      </footer>
    </div>
  );
}
