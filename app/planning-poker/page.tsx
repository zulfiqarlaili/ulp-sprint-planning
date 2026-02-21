"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { generateSessionId, HOST_ROLES, type Role } from "@/lib/poker-utils";
import { Play, Monitor, Eye } from "lucide-react";
import { toast } from "sonner";

const ROLE_ICONS: Record<string, typeof Monitor> = { presenter: Monitor, observer: Eye };

export default function PlanningPokerLanding() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("presenter");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateSession = async () => {
    if (!name.trim()) {
      toast.warning("Please enter your name");
      return;
    }

    setIsCreating(true);
    const sessionId = generateSessionId();
    
    router.push(`/planning-poker/${sessionId}?owner=true&name=${encodeURIComponent(name.trim())}&role=${role}`);
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
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Planning Poker
        </h1>
        <p className="text-base text-muted-foreground max-w-xl mx-auto">
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

            <div className="space-y-2">
              <Label>Your Role</Label>
              <div className="grid gap-2">
                {HOST_ROLES.map((r) => {
                  const Icon = ROLE_ICONS[r.value];
                  const selected = role === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      disabled={isCreating}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                        selected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                    >
                      <Icon className={`h-5 w-5 flex-shrink-0 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <p className={`text-sm font-medium ${selected ? 'text-primary' : ''}`}>{r.label}</p>
                        <p className="text-xs text-muted-foreground">{r.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
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
