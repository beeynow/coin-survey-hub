import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Coins, LogOut, TrendingUp, CheckCircle2 } from "lucide-react";
import heroImage from "@/assets/hero-bg.jpg";

interface Profile {
  coin_balance: number;
  full_name: string;
}

interface Survey {
  id: string;
  title: string;
  description: string;
  coin_reward: number;
  questions: any[];
}

interface CompletedSurvey {
  survey_id: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [completedSurveys, setCompletedSurveys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const [profileRes, surveysRes, responsesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("surveys").select("*").eq("is_active", true),
        supabase.from("survey_responses").select("survey_id").eq("user_id", user.id),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (surveysRes.data) {
        setSurveys(surveysRes.data as Survey[]);
      }
      if (responsesRes.data) {
        setCompletedSurveys(responsesRes.data.map((r: CompletedSurvey) => r.survey_id));
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const isSurveyCompleted = (surveyId: string) => completedSurveys.includes(surveyId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Get Paid
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gradient-to-r from-primary/20 to-secondary/20 px-4 py-2 rounded-full border border-primary/30">
              <Coins className="w-5 h-5 text-primary" />
              <span className="font-bold text-lg">{profile?.coin_balance || 0}</span>
            </div>
            <Button variant="outline" size="icon" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative container mx-auto px-4 py-16 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Welcome back, {profile?.full_name}!
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Complete surveys and earn coins for your time
          </p>
          <div className="flex flex-wrap justify-center gap-8">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Available Surveys</p>
              <p className="text-2xl font-bold">{surveys.length}</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-8 h-8 text-secondary" />
              </div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{completedSurveys.length}</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                <Coins className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Total Coins</p>
              <p className="text-2xl font-bold">{profile?.coin_balance || 0}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Surveys Grid */}
      <section className="container mx-auto px-4 py-12">
        <h3 className="text-2xl font-bold mb-6">Available Surveys</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {surveys.map((survey) => {
            const completed = isSurveyCompleted(survey.id);
            return (
              <Card
                key={survey.id}
                className="relative overflow-hidden transition-all hover:shadow-lg hover:scale-105"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl">{survey.title}</CardTitle>
                    {completed && (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Done
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{survey.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="w-5 h-5 text-primary" />
                      <span className="text-2xl font-bold text-primary">
                        {survey.coin_reward}
                      </span>
                      <span className="text-sm text-muted-foreground">coins</span>
                    </div>
                    <Button
                      onClick={() => navigate(`/survey/${survey.id}`)}
                      disabled={completed}
                      variant={completed ? "outline" : "default"}
                    >
                      {completed ? "Completed" : "Start Survey"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
