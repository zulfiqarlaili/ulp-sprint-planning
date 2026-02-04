"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PokerCardProps {
  value: string;
  selected: boolean;
  disabled?: boolean;
  revealed?: boolean;
  onClick: () => void;
}

export function PokerCard({ value, selected, disabled, revealed, onClick }: PokerCardProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant={selected ? "default" : "outline"}
      className={cn(
        "h-32 w-24 text-3xl font-bold transition-all hover:scale-105",
        "min-h-[128px] min-w-[96px]",
        selected && "ring-2 ring-primary ring-offset-2",
        revealed && "opacity-60"
      )}
    >
      {value}
    </Button>
  );
}
