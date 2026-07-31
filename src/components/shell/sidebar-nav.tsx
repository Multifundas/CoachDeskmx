"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Receipt,
  FileText,
  Trophy,
  Sparkles,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

const ICONOS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  CalendarDays,
  Receipt,
  FileText,
  Trophy,
  Sparkles,
  Settings,
};

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = ICONOS[item.icon] ?? LayoutDashboard;
        const activo =
          pathname === item.href ||
          (item.href !== "/maestra" &&
            item.href !== "/tutor" &&
            item.href !== "/alumna" &&
            pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              activo
                ? "bg-profundo text-white shadow-sm"
                : "text-filo hover:bg-profundo/10 hover:text-profundo",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
