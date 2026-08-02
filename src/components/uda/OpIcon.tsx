import {
  Braces,
  CaseSensitive,
  Copy,
  Filter,
  Ruler,
  Sigma,
  Sparkle,
  Tag,
  Target,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { OperationId } from "@/lib/dataset";

const MAP: Record<OperationId, LucideIcon> = {
  missing: Sparkle,
  encoding: Braces,
  scaling: Ruler,
  outliers: Target,
  duplicates: Copy,
  "feature-selection": Filter,
  datatype: Wrench,
  text: CaseSensitive,
  rounding: Sigma,
  rename: Tag,
};


export function OpIcon({ op, className = "h-4 w-4" }: { op: OperationId; className?: string }) {
  const Icon = MAP[op];
  return <Icon className={className} />;
}
