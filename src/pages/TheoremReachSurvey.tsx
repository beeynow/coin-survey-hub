import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

// Extend Window interface for TheoremReach
declare global {
  interface Window {
    TheoremReach?: {
      initWithApiKeyAndUserID: (appId: string, userId: string, callback: () => void) => void;
      setRewardListener: (callback: (quantity: number) => void) => void;
    };
  }
}

const TheoremReachSurvey = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [appId, setAppId] = useState<string>("");

  useEffect(() => {
    const initTheoremReach = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/auth");
          return;
        }

        setUserId(user.id);
        
        // Get TheoremReach App ID
        const theoremReachAppId = "24211";
        setAppId(theoremReachAppId);
        
        setLoading(false);

        // Initialize TheoremReach SDK
        if (window.TheoremReach) {
          window.TheoremReach.initWithApiKeyAndUserID(theoremReachAppId, user.id, () => {
            console.log("TheoremReach initialized successfully");
          });

          // Set up reward callback
          window.TheoremReach.setRewardListener((quantity: number) => {
            toast({
              title: "Survey Completed! 🎉",
              description: `You earned ${quantity} coins!`,
            });
            
            // Refresh user data after a short delay
            setTimeout(() => {
              navigate("/dashboard");
            }, 2000);
          });
        }
      } catch (error: any) {
        console.error("Error initializing TheoremReach:", error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    };

    initTheoremReach();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading surveys...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-lg border border-border p-8 text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">TheoremReach Surveys</h1>
            <p className="text-muted-foreground mb-6">
              Complete surveys and earn coins instantly. Your progress is automatically tracked.
            </p>
          </div>

          {/* TheoremReach Survey Wall */}
          <div 
            id="theoremreach-survey-wall"
            className="bg-card rounded-lg border border-border overflow-hidden min-h-[600px]"
          >
            <iframe
              src={`https://theoremreach.com/respondent_entry/direct?api_key=${appId}&user_id=${userId}`}
              width="100%"
              height="800"
              frameBorder="0"
              className="w-full"
              title="TheoremReach Surveys"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TheoremReachSurvey;
