import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Extend Window interface for TheoremReach
declare global {
  interface Window {
    TheoremReach?: {
      initWithApiKeyAndUserID: (
        appId: string,
        userId: string,
        callback: () => void
      ) => void;
      setRewardListener: (callback: (quantity: number) => void) => void;
    };
  }
}

const TheoremReachSurvey = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const initTheoremReach = async () => {
      try {
        console.log("[TheoremReach] Starting initialization...");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("[TheoremReach] Auth error:", userError);
          throw userError;
        }

        if (!user) {
          console.error("[TheoremReach] No user found, redirecting to auth");
          navigate("/auth");
          return;
        }

        console.log("[TheoremReach] User authenticated:", user.id);
        setUserId(user.id);

        // Get API key from environment or use fallback
        // IMPORTANT: Replace this with your NEW API key after rotating
        const theoremReachApiKey =
          import.meta.env.VITE_THEOREMREACH_API_KEY || "YOUR_NEW_API_KEY_HERE";

        if (theoremReachApiKey === "YOUR_NEW_API_KEY_HERE") {
          console.error("[TheoremReach] API key not configured");
          setError(
            "TheoremReach API key not configured. Please contact support."
          );
          setLoading(false);
          return;
        }

        setApiKey(theoremReachApiKey);
        console.log("[TheoremReach] API key loaded");

        setLoading(false);

        // Initialize TheoremReach SDK
        if (window.TheoremReach) {
          console.log("[TheoremReach] SDK found, initializing...");

          window.TheoremReach.initWithApiKeyAndUserID(
            theoremReachApiKey,
            user.id,
            () => {
              console.log("[TheoremReach] SDK initialized successfully");
              toast({
                title: "Ready to Earn!",
                description: "Survey wall loaded successfully.",
              });
            }
          );

          // Set up reward callback listener
          window.TheoremReach.setRewardListener((quantity: number) => {
            console.log(
              `[TheoremReach] Reward callback fired: ${quantity} coins`
            );

            toast({
              title: "Survey Completed! 🎉",
              description: `You earned ${quantity} coins!`,
            });

            // Refresh user data and redirect after delay
            setTimeout(async () => {
              console.log("[TheoremReach] Refreshing user data...");

              try {
                // Trigger a refresh of the user's profile
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("coin_balance")
                  .eq("id", user.id)
                  .single();

                console.log(
                  "[TheoremReach] Updated balance:",
                  profile?.coin_balance
                );
              } catch (err) {
                console.error("[TheoremReach] Error refreshing balance:", err);
              }

              console.log("[TheoremReach] Redirecting to dashboard");
              navigate("/dashboard");
            }, 2000);
          });
        } else {
          console.warn("[TheoremReach] SDK not loaded on window object");
          setError("TheoremReach SDK failed to load. Please refresh the page.");
        }
      } catch (error: any) {
        console.error("[TheoremReach] Initialization error:", error);
        setError(error.message || "Failed to initialize survey wall");
        setLoading(false);

        toast({
          title: "Error",
          description: error.message || "Failed to load surveys",
          variant: "destructive",
        });
      }
    };

    // Small delay to ensure SDK script is loaded
    const timer = setTimeout(() => {
      initTheoremReach();
    }, 500);

    return () => clearTimeout(timer);
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading surveys...</p>
          <p className="text-xs text-muted-foreground mt-2">
            This may take a few seconds
          </p>
        </div>
      </div>
    );
  }

  if (error) {
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
          <div className="max-w-2xl mx-auto">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Surveys</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>

            <div className="mt-4 flex gap-4">
              <Button onClick={() => window.location.reload()}>Retry</Button>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          </div>
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
              Complete surveys and earn coins instantly. Your progress is
              automatically tracked.
            </p>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span>Live Survey Wall</span>
            </div>
          </div>

          {/* TheoremReach Survey Wall - Using iframe for better compatibility */}
          <div
            id="theoremreach-survey-wall"
            className="bg-card rounded-lg border border-border overflow-hidden min-h-[600px]"
          >
            {apiKey && userId ? (
              <iframe
                src={`https://theoremreach.com/respondent_entry/direct?api_key=${apiKey}&user_id=${userId}`}
                width="100%"
                height="800"
                style={{ border: "none", display: "block" }}
                title="TheoremReach Surveys"
                onLoad={() =>
                  console.log("[TheoremReach] Iframe loaded successfully")
                }
                onError={(e) =>
                  console.error("[TheoremReach] Iframe error:", e)
                }
              />
            ) : (
              <div className="flex items-center justify-center h-[600px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* Debug info - Remove in production */}
          {import.meta.env.DEV && (
            <div className="mt-4 p-4 bg-muted rounded-lg text-xs font-mono">
              <p className="font-bold mb-2">Debug Info:</p>
              <p>User ID: {userId}</p>
              <p>API Key: {apiKey ? "***" + apiKey.slice(-4) : "Not loaded"}</p>
              <p>SDK Loaded: {window.TheoremReach ? "Yes" : "No"}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TheoremReachSurvey;
