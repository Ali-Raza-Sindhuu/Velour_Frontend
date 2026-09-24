import { cn } from "@/lib/utils";
function FieldGroup({ className, ...props }) { return <div className={cn("grid gap-5", className)} {...props} />; }
function Field({ className, ...props }) { return <div className={cn("grid gap-2", className)} {...props} />; }
function FieldLabel({ className, ...props }) { return <label className={cn("text-sm font-medium", className)} {...props} />; }
function FieldDescription({ className, ...props }) { return <p className={cn("text-xs text-muted-foreground", className)} {...props} />; }
export { Field, FieldDescription, FieldGroup, FieldLabel };
