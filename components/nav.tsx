"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Zap } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  getConfig,
  getCurrentSprintIndex,
  getSprintNumber,
  formatSprintRelease,
} from "@/lib/sprint";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/history", label: "History" },
  { href: "/capacity-planner", label: "Capacity Planner" },
  { href: "/planning-poker", label: "Planning Poker" },
] as const;

function getSprintBadgeText(): string {
  try {
    const config = getConfig();
    const idx = getCurrentSprintIndex(config);
    const num = getSprintNumber(config, idx);
    return `Sprint ${formatSprintRelease(num)}`;
  } catch {
    return "";
  }
}

function NavLink({
  href,
  label,
  isActive,
  onClick,
  className = "",
}: {
  href: string;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-3 text-sm font-medium rounded-md transition-colors ${
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      } ${className}`}
    >
      {label}
    </Link>
  );
}

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const sprintBadge = getSprintBadgeText();

  return (
    <div className="flex items-center justify-between w-full">
      {/* Left: App name + mobile hamburger */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="min-h-[44px] min-w-[44px]"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Sprint Planner
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 pt-6">
                {navLinks.map(({ href, label }) => (
                  <NavLink
                    key={href}
                    href={href}
                    label={label}
                    isActive={pathname === href || (href !== "/" && pathname.startsWith(href))}
                    onClick={() => setOpen(false)}
                    className="w-full justify-start py-3 text-base"
                  />
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {/* App name */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight hover:opacity-80 transition-opacity">
          <Zap className="h-5 w-5 text-primary" />
          <span className="hidden sm:inline">Sprint Planner</span>
        </Link>
      </div>

      {/* Center: Desktop nav links */}
      <nav className="hidden md:flex items-center gap-1">
        {navLinks.map(({ href, label }) => (
          <NavLink
            key={href}
            href={href}
            label={label}
            isActive={pathname === href || (href !== "/" && pathname.startsWith(href))}
          />
        ))}
      </nav>

      {/* Right: Sprint badge + dark mode */}
      <div className="flex items-center gap-2">
        {sprintBadge && (
          <Badge variant="secondary" className="hidden sm:inline-flex font-mono text-xs">
            {sprintBadge}
          </Badge>
        )}
        <ThemeToggle />
      </div>
    </div>
  );
}
