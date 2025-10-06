import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  colorClass: string;
}

const StatsCard = ({ icon: Icon, label, value, colorClass }: StatsCardProps) => {
  return (
    <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-primary/10 hover:scale-105">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative p-6">
        <div className={`w-14 h-14 rounded-xl ${colorClass} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
          <Icon className="w-7 h-7" />
        </div>
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">{value}</p>
      </div>
    </Card>
  );
};

export default StatsCard;
