import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Coins, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";

interface Question {
  id: string;
  type: "rating" | "text" | "multiple";
  question: string;
  scale?: number;
  options?: string[];
}

interface Survey {
  id: string;
  title: string;
  description: string;
  coin_reward: number;
  questions: Question[];
}

const Survey = () => {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSurvey();
  }, [surveyId]);

  const fetchSurvey = async () => {
    try {
      const { data, error } = await supabase
        .from("surveys")
        .select("*")
        .eq("id", surveyId)
        .single();

      if (error) throw error;
      setSurvey(data as unknown as Survey);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const handleNext = () => {
    if (survey && currentQuestion < survey.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    if (!survey) return;

    const allAnswered = survey.questions.every((q) => answers[q.id] !== undefined);
    if (!allAnswered) {
      toast({
        title: "Incomplete Survey",
        description: "Please answer all questions before submitting.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Get session first to ensure we have a valid authenticated user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        throw new Error("Please log in to submit surveys");
      }

      const userId = session.user.id;

      // Verify profile exists
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (!profile) {
        throw new Error("User profile not found. Please contact support.");
      }

      const { error } = await supabase.from("survey_responses").insert({
        survey_id: survey.id,
        user_id: userId,
        answers,
      });

      if (error) throw error;

      toast({
        title: "Survey Completed!",
        description: `You've earned ${survey.coin_reward} coins!`,
      });

      navigate("/dashboard");
    } catch (error: any) {
      console.error("Survey submission error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit survey",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (!survey) return null;

  const question = survey.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / survey.questions.length) * 100;
  const isLastQuestion = currentQuestion === survey.questions.length - 1;
  const currentAnswer = answers[question.id];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2 bg-gradient-to-r from-primary/20 to-secondary/20 px-4 py-2 rounded-full border border-primary/30">
              <Coins className="w-5 h-5 text-primary" />
              <span className="font-bold">{survey.coin_reward} coins</span>
            </div>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {survey.questions.length}
            </span>
            <span className="text-sm font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Survey Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{survey.title}</CardTitle>
              <CardDescription>{survey.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">{question.question}</h3>

                {question.type === "rating" && (
                  <RadioGroup
                    value={currentAnswer?.toString()}
                    onValueChange={(value) => handleAnswer(question.id, parseInt(value))}
                  >
                    <div className="flex gap-4 justify-center">
                      {Array.from({ length: question.scale || 5 }, (_, i) => i + 1).map((rating) => (
                        <div key={rating} className="flex flex-col items-center gap-2">
                          <RadioGroupItem value={rating.toString()} id={`rating-${rating}`} />
                          <Label htmlFor={`rating-${rating}`}>{rating}</Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                )}

                {question.type === "multiple" && (
                  <RadioGroup
                    value={currentAnswer}
                    onValueChange={(value) => handleAnswer(question.id, value)}
                  >
                    <div className="space-y-3">
                      {question.options?.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`option-${option}`} />
                          <Label htmlFor={`option-${option}`} className="cursor-pointer">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                )}

                {question.type === "text" && (
                  <Textarea
                    placeholder="Type your answer here..."
                    value={currentAnswer || ""}
                    onChange={(e) => handleAnswer(question.id, e.target.value)}
                    className="min-h-32"
                  />
                )}
              </div>

              <div className="flex items-center justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                {isLastQuestion ? (
                  <Button onClick={handleSubmit} disabled={submitting || !currentAnswer}>
                    {submitting ? (
                      "Submitting..."
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Submit Survey
                      </>
                    )}
                  </Button>
                ) : (
                  <Button onClick={handleNext} disabled={!currentAnswer}>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Survey;
