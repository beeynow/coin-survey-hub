import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Wallet } from "lucide-react";

interface Profile {
  coin_balance: number;
}

const countryData: Record<string, { code: string; currency: string; banks: string[] }> = {
  "United States": { code: "USA", currency: "USD", banks: ["Bank of America", "Chase", "Wells Fargo", "Citibank"] },
  "United Kingdom": { code: "GBR", currency: "GBP", banks: ["Barclays", "HSBC", "Lloyds", "NatWest"] },
  "Canada": { code: "CAN", currency: "CAD", banks: ["RBC", "TD Bank", "Scotiabank", "BMO"] },
  "Australia": { code: "AUS", currency: "AUD", banks: ["Commonwealth Bank", "Westpac", "ANZ", "NAB"] },
  "Kenya": { code: "KEN", currency: "KES", banks: ["KCB", "Equity Bank", "Co-operative Bank", "Barclays Kenya"] },
};

const Withdraw = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [country, setCountry] = useState("");
  const [bank, setBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("coin_balance")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile || profile.coin_balance < 500) {
      toast({
        title: "Insufficient Balance",
        description: "You need at least 500 coins to withdraw.",
        variant: "destructive",
      });
      return;
    }

    const withdrawAmount = parseInt(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount.",
        variant: "destructive",
      });
      return;
    }

    if (withdrawAmount > profile.coin_balance) {
      toast({
        title: "Insufficient Balance",
        description: "Withdrawal amount exceeds your current balance.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const selectedCountryData = countryData[country];

      const { error } = await supabase.from("withdraw_requests").insert({
        user_id: user.id,
        country,
        bank_name: bank,
        account_number: accountNumber,
        country_code: selectedCountryData.code,
        phone_number: phoneNumber,
        currency: selectedCountryData.currency,
        amount: withdrawAmount,
      });

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: "Your withdrawal request has been submitted for review. Please allow up to 2 working days.",
      });

      // Reset form
      setCountry("");
      setBank("");
      setAccountNumber("");
      setPhoneNumber("");
      setAmount("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
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
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3 bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 px-5 py-2.5 rounded-full border border-primary/20">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="font-bold text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {profile?.coin_balance || 0} coins
            </span>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-2xl border border-border/50 p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20">
                <Wallet className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">Withdraw Coins</h1>
            </div>

            {profile && profile.coin_balance < 500 ? (
              <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-6 text-center">
                <p className="text-destructive font-medium">
                  You need at least 500 coins to withdraw.
                </p>
                <p className="text-muted-foreground mt-2">
                  Current balance: {profile.coin_balance} coins
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select value={country} onValueChange={(value) => {
                    setCountry(value);
                    setBank("");
                  }}>
                    <SelectTrigger id="country">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(countryData).map((countryName) => (
                        <SelectItem key={countryName} value={countryName}>
                          {countryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {country && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="bank">Bank</Label>
                      <Select value={bank} onValueChange={setBank}>
                        <SelectTrigger id="bank">
                          <SelectValue placeholder="Select bank" />
                        </SelectTrigger>
                        <SelectContent>
                          {countryData[country].banks.map((bankName) => (
                            <SelectItem key={bankName} value={bankName}>
                              {bankName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="Enter your account number"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="countryCode">Country Code</Label>
                      <Input
                        id="countryCode"
                        value={countryData[country].code}
                        disabled
                        className="bg-muted"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="Enter your phone number"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Input
                        id="currency"
                        value={countryData[country].currency}
                        disabled
                        className="bg-muted"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (coins)</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount to withdraw"
                        min="1"
                        max={profile?.coin_balance || 0}
                        required
                      />
                      <p className="text-sm text-muted-foreground">
                        Available balance: {profile?.coin_balance || 0} coins
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={submitting}
                    >
                      {submitting ? "Submitting..." : "Submit Withdrawal Request"}
                    </Button>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Withdraw;
