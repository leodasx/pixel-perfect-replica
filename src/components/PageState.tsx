import { Loader2, AlertTriangle } from "lucide-react";

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-destructive">
      <AlertTriangle className="h-5 w-5" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return <div className="py-16 text-center text-muted-foreground">{label}</div>;
}
