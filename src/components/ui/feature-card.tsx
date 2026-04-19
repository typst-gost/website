import { Card } from "@/components/ui/card";

export function FeatureCard({
  title,
  description,
  children,
}: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="group relative p-8 border-border bg-slate-800/50 backdrop-blur-sm">
      <div className="flex items-start gap-4 mb-6">
        <div className="flex-1">
          <h3 className="text-2xl font-bold mb-3 transition-colors">{title}</h3>
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
      {children}
    </Card>
  )
}