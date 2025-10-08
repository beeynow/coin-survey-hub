import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Loader2,
  ExternalLink,
  Coins,
  CheckCircle2,
} from "lucide-react";

// Extend Window interface for TheoremReach
declare global {
  interface Window {
    TheoremReach?: {
      initWithApiKeyAndUserID: (
        apiKey: string,
        userId: string,
        callback: () => void
      ) => void;
      setRewardListener: (callback: (quantity: number) => void) => void;
      showRewardCenter?: () => void;
      surveyWall?: {
        show: () => void;
        hide: () => void;
      };
    };
  }
}

const TheoremReachSurvey = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [sdkReady, setSdkReady] = useState(false);
  const [surveyUrl, setSurveyUrl] = useState<string>("");
  const [rewardReceived, setRewardReceived] = useState(false);

  // NEW API CREDENTIALS
  const THEOREMREACH_API_KEY = "89b1f3d90f5a04e9cfc526a51e54";
  const APP_ID = "24214";

  useEffect(() => {
    let isMounted = true;
    let initTimeout: NodeJS.Timeout;

    const initTheoremReach = async () => {
      try {
        console.log("[TheoremReach] Starting initialization...");
        console.log(
          "[TheoremReach] API Key:",
          THEOREMREACH_API_KEY.slice(0, 8) + "..."
        );
        console.log("[TheoremReach] App ID:", APP_ID);

        // Get session to ensure authenticated user
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          console.error("[TheoremReach] No authenticated user");
          toast({
            title: "Authentication Required",
            description: "Please log in to access surveys",
            variant: "destructive",
          });
          navigate("/auth");
          return;
        }

        const userId = session.user.id;

        // Verify profile exists in database
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, coin_balance")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) {
          console.error("[TheoremReach] Profile fetch error:", profileError);
          throw new Error("Failed to fetch user profile");
        }

        if (!profile) {
          console.error("[TheoremReach] Profile not found for user:", userId);
          throw new Error("User profile not found. Please contact support.");
        }

        console.log("[TheoremReach] User ID:", userId);
        console.log("[TheoremReach] Current balance:", profile.coin_balance);
        
        if (isMounted) {
          setUserId(userId);
        }

        // Build the survey wall URL with NEW API key
        const surveyWallUrl = `https://theoremreach.com/respondent_entry/direct?api_key=${THEOREMREACH_API_KEY}&user_id=${encodeURIComponent(
          userId
        )}&redirect_url=${encodeURIComponent(
          "https://getpaid.website/survey-complete"
        )}`;

        console.log("[TheoremReach] Survey URL generated successfully");
        if (isMounted) {
          setSurveyUrl(surveyWallUrl);
        }

        // Wait for SDK to be available
        const checkSDK = () => {
          if (window.TheoremReach) {
            console.log(
              "[TheoremReach] SDK detected, initializing with NEW credentials..."
            );

            try {
              window.TheoremReach.initWithApiKeyAndUserID(
                THEOREMREACH_API_KEY,
                userId,
                () => {
                  console.log(
                    "[TheoremReach] ✅ SDK initialized successfully with NEW API key"
                  );
                  if (isMounted) {
                    setSdkReady(true);
                    setLoading(false);

                    toast({
                      title: "Ready to Earn! 🎯",
                      description:
                        "Click 'Open Survey Wall' to start earning coins",
                    });
                  }
                }
              );

              // Set up reward listener
              window.TheoremReach.setRewardListener((quantity: number) => {
                console.log(
                  `[TheoremReach] 🎉 Reward received: ${quantity} coins`
                );

                if (isMounted) {
                  setRewardReceived(true);

                  toast({
                    title: "Survey Completed! 🎉",
                    description: `You earned ${quantity} coins!`,
                    duration: 5000,
                  });

                  // Refresh balance and redirect
                  setTimeout(async () => {
                    console.log("[TheoremReach] Refreshing user balance...");

                    try {
                      const { data: profile } = await supabase
                        .from("profiles")
                        .select("coin_balance")
                        .eq("id", userId)
                        .maybeSingle();

                      if (profile) {
                        console.log(
                          "[TheoremReach] New balance:",
                          profile.coin_balance
                        );
                        toast({
                          title: "Balance Updated! 💰",
                          description: `New balance: ${profile.coin_balance} coins`,
                        });
                      }
                    } catch (err) {
                      console.error(
                        "[TheoremReach] Error refreshing balance:",
                        err
                      );
                    }

                    console.log("[TheoremReach] Redirecting to dashboard...");
                    navigate("/dashboard");
                  }, 2000);
                }
              });
            } catch (err) {
              console.error("[TheoremReach] SDK init error:", err);
              if (isMounted) {
                setLoading(false);
              }
            }
          } else {
            console.log(
              "[TheoremReach] SDK not loaded, using direct link mode"
            );
            if (isMounted) {
              setLoading(false);
            }
          }
        };

        // Check after a delay to allow script to load
        initTimeout = setTimeout(checkSDK, 2000);
      } catch (error: any) {
        console.error("[TheoremReach] Init error:", error);
        if (isMounted) {
          setLoading(false);
          toast({
            title: "Error",
            description: "Failed to initialize surveys",
            variant: "destructive",
          });
        }
      }
    };

    initTheoremReach();

    // Cleanup
    return () => {
      isMounted = false;
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
    };
  }, [navigate, toast]);

  // Open survey in new window
  const openSurveyWall = () => {
    if (surveyUrl) {
      console.log("[TheoremReach] Opening survey wall in new window");

      // Open in popup window with optimized dimensions
      const width = 900;
      const height = 900;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      const popup = window.open(
        surveyUrl,
        "TheoremReach_Surveys",
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=yes`
      );

      if (popup) {
        popup.focus();
        toast({
          title: "Survey Window Opened! 🚀",
          description:
            "Complete surveys in the new window. Keep this page open to receive rewards!",
          duration: 7000,
        });
      } else {
        // Popup blocked, open in new tab
        window.open(surveyUrl, "_blank");
        toast({
          title: "Survey Tab Opened! 🚀",
          description:
            "Complete surveys in the new tab. Keep this page open to receive rewards!",
          duration: 7000,
        });
      }
    } else {
      toast({
        title: "Error",
        description: "Survey URL not ready. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">
            Initializing TheoremReach...
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Setting up your survey wall
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>

          {sdkReady && !rewardReceived && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-muted-foreground">System Ready</span>
            </div>
          )}

          {rewardReceived && (
            <div className="flex items-center gap-2 text-sm text-green-500">
              <CheckCircle2 className="w-4 h-4" />
              <span>Reward Received!</span>
            </div>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Main Hero Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-card via-card to-primary/5 rounded-2xl border border-border p-12 text-center shadow-2xl mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-50"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-32 translate-x-32"></div>

            <div className="relative">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 mb-6">
                <Coins className="w-10 h-10 text-primary" />
              </div>

              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                TheoremReach Surveys
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Complete surveys and earn coins instantly. Your rewards are
                automatically tracked and credited to your account.
              </p>

              {/* Status Badges */}
              <div className="flex items-center justify-center gap-4 mb-8">
                {sdkReady && (
                  <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-500 px-4 py-2 rounded-full text-sm font-medium">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Connected & Ready</span>
                  </div>
                )}

                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                  <span>App ID: {APP_ID}</span>
                </div>
              </div>

              {/* Main CTA Button */}
              <Button
                size="lg"
                onClick={openSurveyWall}
                className="gap-3 text-lg px-10 py-7 rounded-xl shadow-2xl hover:shadow-primary/20 hover:scale-105 transition-all duration-300 bg-gradient-to-r from-primary to-primary/80"
                disabled={!surveyUrl}
              >
                <ExternalLink className="w-6 h-6" />
                Open Survey Wall
              </Button>

              <p className="text-sm text-muted-foreground mt-4">
                {surveyUrl ? "✅ Ready to launch" : "⏳ Preparing..."}
              </p>
            </div>
          </div>

          {/* How It Works */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6 bg-card rounded-xl border border-border hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 text-primary font-bold text-xl">
                  1
                </div>
                <h3 className="font-semibold text-lg mb-2">Click to Start</h3>
                <p className="text-sm text-muted-foreground">
                  Click "Open Survey Wall" to access available surveys in a new
                  window
                </p>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6 bg-card rounded-xl border border-border hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 text-primary font-bold text-xl">
                  2
                </div>
                <h3 className="font-semibold text-lg mb-2">Complete Surveys</h3>
                <p className="text-sm text-muted-foreground">
                  Answer questions honestly and complete surveys to earn rewards
                </p>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6 bg-card rounded-xl border border-border hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 text-primary font-bold text-xl">
                  3
                </div>
                <h3 className="font-semibold text-lg mb-2">Get Rewarded</h3>
                <p className="text-sm text-muted-foreground">
                  Coins are automatically credited to your account after
                  completion
                </p>
              </div>
            </div>
          </div>

          {/* Important Information */}
          <div className="bg-muted/50 rounded-xl p-6 mb-8">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              Important Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Keep this page open while completing surveys</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Rewards are tracked automatically</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Complete surveys honestly for best results</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Some surveys may screen you out (normal)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Do not use VPN or proxy services</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Allow pop-ups for this site</span>
              </div>
            </div>
          </div>

          {/* Alternative Access */}
          <div className="bg-card rounded-xl border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Having trouble with pop-ups? Use this direct link:
            </p>
            {surveyUrl && (
              <a
                href={surveyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                Open TheoremReach in New Tab
              </a>
            )}
          </div>

          {/* Debug Info - Development Only */}
          {import.meta.env.DEV && (
            <div className="mt-8 p-4 bg-muted rounded-lg font-mono text-xs">
              <p className="font-bold mb-2 text-sm">🔧 Debug Information:</p>
              <div className="space-y-1 text-muted-foreground">
                <p>✓ User ID: {userId || "Loading..."}</p>
                <p>
                  ✓ API Key:{" "}
                  {THEOREMREACH_API_KEY
                    ? "***" + THEOREMREACH_API_KEY.slice(-4)
                    : "Not set"}
                </p>
                <p>✓ App ID: {APP_ID}</p>
                <p>✓ SDK Loaded: {window.TheoremReach ? "✅ Yes" : "❌ No"}</p>
                <p>✓ SDK Ready: {sdkReady ? "✅ Yes" : "⏳ Initializing..."}</p>
                <p>
                  ✓ Survey URL: {surveyUrl ? "✅ Generated" : "❌ Not ready"}
                </p>
                <p>✓ Reward Received: {rewardReceived ? "✅ Yes" : "❌ No"}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TheoremReachSurvey;
