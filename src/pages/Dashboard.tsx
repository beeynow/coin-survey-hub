import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Coins, LogOut, TrendingUp, CheckCircle2, Award, Wallet } from "lucide-react";
import heroImage from "@/assets/hero-bg.jpg";
import StatsCard from "@/components/dashboard/StatsCard";

interface Profile {
  coin_balance: number;
  full_name: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [completedCount, setCompletedCount] = useState<number>(0);
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

      const [profileRes, responsesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("coin_transactions").select("*").eq("user_id", user.id).eq("transaction_type", "theoremreach_survey"),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (responsesRes.data) {
        setCompletedCount(responsesRes.data.length);
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
              icon={CheckCircle2}
              label="Completed Surveys"
              value={completedCount}
              colorClass="bg-gradient-to-br from-green-500/20 to-green-600/20 text-green-500"
            />
            <StatsCard
              icon={Coins}
              label="Total Coins"
              value={profile?.coin_balance || 0}
              colorClass="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary"
            />
            <StatsCard
              icon={Award}
              label="Earnings This Month"
              value={profile?.coin_balance || 0}
              colorClass="bg-gradient-to-br from-purple-500/20 to-purple-600/20 text-purple-500"
            />
          </div>
        </div>
      </section>

      {/* Actions Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* TheoremReach Surveys */}
          <div className="bg-gradient-to-br from-card via-card to-primary/5 rounded-2xl border border-border/50 p-8 text-center shadow-xl backdrop-blur-sm">
            <div className="inline-block p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 mb-4">
              <TrendingUp className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              Earn Coins
            </h3>
            <p className="text-muted-foreground mb-6">
              Complete surveys and earn coins instantly
            </p>
            <Button 
              size="lg" 
              onClick={() => navigate("/theoremreach")}
              className="gap-2 w-full"
            >
              <TrendingUp className="w-5 h-5" />
              Browse Surveys
            </Button>
          </div>

          {/* Withdraw */}
          <div className="bg-gradient-to-br from-card via-card to-secondary/5 rounded-2xl border border-border/50 p-8 text-center shadow-xl backdrop-blur-sm">
            <div className="inline-block p-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/20 mb-4">
              <Wallet className="w-12 h-12 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold mb-3 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              Withdraw Coins
            </h3>
            <p className="text-muted-foreground mb-6">
              Cash out your earnings (min. 500 coins)
            </p>
            <Button 
              size="lg" 
              onClick={() => navigate("/withdraw")}
              className="gap-2 w-full"
              variant="secondary"
            >
              <Wallet className="w-5 h-5" />
              Withdraw
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
