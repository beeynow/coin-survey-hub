import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Coins, LogOut, TrendingUp, CheckCircle2, Award } from "lucide-react";
import heroImage from "@/assets/hero-bg.jpg";
import StatsCard from "@/components/dashboard/StatsCard";
import SurveyCard from "@/components/dashboard/SurveyCard";

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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
              <Coins className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
              Get Paid
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 px-5 py-2.5 rounded-full border border-primary/20 shadow-sm">
              <div className="p-1.5 rounded-full bg-primary/20">
                <Coins className="w-4 h-4 text-primary" />
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {profile?.coin_balance || 0}
              </span>
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleSignOut}
              className="rounded-full hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
        <div className="relative container mx-auto px-4 py-20 text-center">
          <div className="inline-block p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 mb-6">
            <Award className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            Welcome back, {profile?.full_name}!
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Complete surveys and earn real coins for your valuable time and opinions
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <StatsCard
              icon={TrendingUp}
              label="Available Surveys"
              value={surveys.length}
              colorClass="bg-gradient-to-br from-blue-500/20 to-blue-600/20 text-blue-500"
            />
            <StatsCard
              icon={CheckCircle2}
              label="Completed"
              value={completedSurveys.length}
              colorClass="bg-gradient-to-br from-green-500/20 to-green-600/20 text-green-500"
            />
            <StatsCard
              icon={Coins}
              label="Total Coins"
              value={profile?.coin_balance || 0}
              colorClass="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary"
            />
          </div>
        </div>
      </section>

      {/* Surveys Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-3xl font-bold mb-2">Available Surveys</h3>
            <p className="text-muted-foreground">Choose a survey and start earning coins today</p>
          </div>
        </div>
        
        {surveys.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-block p-4 rounded-2xl bg-muted/50 mb-4">
              <TrendingUp className="w-12 h-12 text-muted-foreground" />
            </div>
            <p className="text-xl text-muted-foreground">No surveys available right now</p>
            <p className="text-sm text-muted-foreground mt-2">Check back soon for new opportunities!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {surveys.map((survey) => {
              const completed = isSurveyCompleted(survey.id);
              return (
                <SurveyCard
                  key={survey.id}
                  id={survey.id}
                  title={survey.title}
                  description={survey.description}
                  coinReward={survey.coin_reward}
                  completed={completed}
                  onStart={(id) => navigate(`/survey/${id}`)}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
