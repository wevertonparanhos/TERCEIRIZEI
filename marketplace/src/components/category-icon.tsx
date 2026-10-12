import {
  Armchair,
  BrickWall,
  Drill,
  Droplets,
  Flower2,
  Hammer,
  HardHat,
  House,
  PaintRoller,
  Sparkles,
  SprayCan,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  "spray-can": SprayCan,
  "hard-hat": HardHat,
  "paint-roller": PaintRoller,
  "brick-wall": BrickWall,
  droplets: Droplets,
  zap: Zap,
  hammer: Hammer,
  armchair: Armchair,
  "flower-2": Flower2,
  wrench: Wrench,
  drill: Drill,
};

export function CategoryIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || House;
  return <Icon className={className} aria-hidden />;
}
