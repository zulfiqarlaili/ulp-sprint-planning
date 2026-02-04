"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { generateSessionId } from "@/lib/poker-utils";
import { Play } from "lucide-react";

export default function PlanningPokerLanding() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateSession = async () => {
    if (!name.trim()) {
      alert("Please enter your name");
      return;
    }

    setIsCreating(true);
    const sessionId = generateSessionId();
    
    // Redirect to the new session
    router.push(`/planning-poker/${sessionId}?owner=true&name=${encodeURIComponent(name.trim())}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) {
      handleCreateSession();
    }
  };

  return (
    <div className="space-y-8 sm:space-y-12 pb-12">
      {/* Hero headline */}
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Planning Poker
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Estimate story points collaboratively with your team in real-time
        </p>
      </header>

      {/* Create Session Card */}
      <section className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Start a New Session</CardTitle>
            <CardDescription>
              Create a planning poker room and invite your team members to join
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isCreating}
                className="min-h-[44px]"
              />
            </div>

            <Button 
              onClick={handleCreateSession}
              disabled={!name.trim() || isCreating}
              className="w-full min-h-[44px]"
              size="lg"
            >
              <Play className="mr-2 h-5 w-5" />
              {isCreating ? "Creating Session..." : "Create Session"}
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Info Section */}
      <section className="max-w-2xl mx-auto">
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <span className="font-bold text-primary">1.</span>
              <p>Create a session and share the URL with your team</p>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-primary">2.</span>
              <p>Team members vote using story points: 0.5, 1, 2, 3, or 5</p>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-primary">3.</span>
              <p>The session owner reveals votes when everyone is ready</p>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-primary">4.</span>
              <p>Reset and start a new round for the next story</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
