import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, CheckCircle2, Clock } from "lucide-react";

interface SurveyCardProps {
  id: string;
  title: string;
  description: string;
  coinReward: number;
  completed: boolean;
  onStart: (id: string) => void;
}

const SurveyCard = ({ id, title, description, coinReward, completed, onStart }: SurveyCardProps) => {
  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:scale-150 transition-transform" />
      
      <CardHeader className="relative">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-xl group-hover:text-primary transition-colors">{title}</CardTitle>
          {completed && (
            <Badge variant="secondary" className="gap-1 shrink-0">
              <CheckCircle2 className="w-3 h-3" />
              Completed
            </Badge>
          )}
        </div>
        <CardDescription className="line-clamp-2">{description}</CardDescription>
      </CardHeader>
      
      <CardContent className="relative">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Coins className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{coinReward}</p>
              <p className="text-xs text-muted-foreground">coins</p>
            </div>
          </div>
          <Button
            onClick={() => onStart(id)}
            disabled={completed}
            variant={completed ? "outline" : "default"}
            className="gap-2"
          >
            {completed ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Done
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                Start
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SurveyCard;
