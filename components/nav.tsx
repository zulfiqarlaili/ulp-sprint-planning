"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/history", label: "History" },
  { href: "/capacity-planner", label: "Capacity Planner" },
  { href: "/planning-poker", label: "Planning Poker" },
] as const;

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
      className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-4 text-sm font-medium hover:underline ${className}`}
    >
      {isActive ? (
        <span className="text-primary">{label}</span>
      ) : (
        <span className="text-muted-foreground hover:text-foreground">{label}</span>
      )}
    </Link>
  );
}

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile: hamburger + sheet */}
      <div className="flex items-center gap-4 md:hidden">
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
              <SheetTitle className="sr-only">Navigation</SheetTitle>
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

      {/* Desktop: horizontal nav */}
      <nav className="hidden md:flex items-center gap-4 lg:gap-6">
        {navLinks.map(({ href, label }) => (
          <NavLink
            key={href}
            href={href}
            label={label}
            isActive={pathname === href || (href !== "/" && pathname.startsWith(href))}
          />
        ))}
      </nav>
    </>
  );
}
