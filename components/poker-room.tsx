"use client";

import { useState, useEffect, useCallback } from "react";
import { pb } from "@/lib/pocketbase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PokerCard } from "@/components/poker-card";
import { VALID_VOTES, getUniqueParticipantName, calculateVoteStats } from "@/lib/poker-utils";
import { Eye, EyeOff, RotateCcw, Copy, Check, Users, Loader2, XCircle, History, Clock, Play, Square } from "lucide-react";
import type { RecordSubscription } from "pocketbase";

// Module-level flag to prevent duplicate session creation across component remounts
const creatingSessionsSet = new Set<string>();

interface Participant {
  id: string;
  name: string;
  vote: string | null;
}

interface PokerSession {
  id: string;
  session_id: string;
  owner_name: string;
  revealed: boolean;
  current_story?: string;
  status: string;
}

interface RoundHistory {
  story: string;
  votes: { name: string; vote: string }[];
  average: number;
  timestamp: Date;
}

interface PokerRoomProps {
  sessionId: string;
  initialIsOwner: boolean;
  initialUserName: string;
}

export function PokerRoom({ sessionId, initialIsOwner, initialUserName }: PokerRoomProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [session, setSession] = useState<PokerSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [myName, setMyName] = useState(initialUserName);
  const [myRecordId, setMyRecordId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(initialIsOwner);
  const [hasJoined, setHasJoined] = useState(false);
  
  const [copied, setCopied] = useState(false);
  const [storyInput, setStoryInput] = useState("");
  const [roundHistory, setRoundHistory] = useState<RoundHistory[]>([]);
  
  // Timer state
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);

  // Initialize or join session
  const initializeSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if session exists
      let sessionRecord: PokerSession | null = null;
      try {
        const records = await pb.collection('poker_sessions').getFullList<PokerSession>({
          filter: `session_id="${sessionId}"`
        });
        sessionRecord = records[0] || null;
      } catch (err) {
        console.error("Error fetching session:", err);
      }

      // If session doesn't exist and we're the owner, create it
      if (!sessionRecord && isOwner && myName) {
        // Check if we're already creating this session (prevents duplicate in Strict Mode)
        if (!creatingSessionsSet.has(sessionId)) {
          creatingSessionsSet.add(sessionId);
          
          try {
            sessionRecord = await pb.collection('poker_sessions').create<PokerSession>({
              session_id: sessionId,
              owner_name: myName,
              revealed: false,
              current_story: '',
              status: 'active'
            });
            console.log('Session created successfully:', sessionId);
          } catch (err: any) {
            console.log('Session creation failed, trying to fetch:', err.message);
            // If creation failed, it might already exist
            const records = await pb.collection('poker_sessions').getFullList<PokerSession>({
              filter: `session_id="${sessionId}"`
            });
            sessionRecord = records[0] || null;
          } finally {
            // Remove from set after a delay to allow second mount to see it
            setTimeout(() => creatingSessionsSet.delete(sessionId), 1000);
          }
        } else {
          // Another mount is creating it, wait and fetch
          console.log('Session creation already in progress, fetching...');
          await new Promise(resolve => setTimeout(resolve, 500));
          const records = await pb.collection('poker_sessions').getFullList<PokerSession>({
            filter: `session_id="${sessionId}"`
          });
          sessionRecord = records[0] || null;
        }
      }

      if (!sessionRecord) {
        setError("Session not found. Please check the URL or create a new session.");
        setIsLoading(false);
        return;
      }

      setSession(sessionRecord);
      setStoryInput(sessionRecord.current_story || '');

      // Load existing participants
      const votes = await pb.collection('poker_votes').getFullList({
        filter: `session="${sessionRecord.id}"`
      });

      const loadedParticipants: Participant[] = votes.map(v => ({
        id: v.id,
        name: v.participant_name,
        vote: v.vote || null
      }));

      setParticipants(loadedParticipants);

      // Check if we already have a participant record (reconnect after refresh)
      const storedParticipantId = localStorage.getItem(`poker_participant_${sessionId}`);
      if (storedParticipantId) {
        const existingParticipant = votes.find(v => v.id === storedParticipantId);
        if (existingParticipant) {
          setMyRecordId(existingParticipant.id);
          setMyName(existingParticipant.participant_name);
          setMyVote(existingParticipant.vote || null);
          setHasJoined(true);
          console.log('Reconnected to existing participant:', existingParticipant.participant_name);
        } else {
          // Clear invalid stored ID
          localStorage.removeItem(`poker_participant_${sessionId}`);
        }
      }

      setIsLoading(false);

    } catch (err: any) {
      console.error("Error initializing session:", err);
      setError(err.message || "Failed to load session");
      setIsLoading(false);
    }
  }, [sessionId, isOwner, myName]);

  // Join session as participant
  const joinSession = async (nameToUse?: string) => {
    const finalName = nameToUse || myName;
    if (!finalName.trim() || finalName.trim().length < 2 || !session) return;

    try {
      // Check if we already have a participant record for this session
      const storedParticipantId = localStorage.getItem(`poker_participant_${sessionId}`);
      if (storedParticipantId) {
        // Try to find existing participant
        const existingVotes = await pb.collection('poker_votes').getFullList({
          filter: `session="${session.id}"`
        });
        const existingParticipant = existingVotes.find(v => v.id === storedParticipantId);
        
        if (existingParticipant) {
          // Reconnect to existing participant
          setMyRecordId(existingParticipant.id);
          setMyName(existingParticipant.participant_name);
          setMyVote(existingParticipant.vote || null);
          setHasJoined(true);
          console.log('Reconnected to existing participant');
          return;
        }
      }

      const existingNames = participants.map(p => p.name);
      const uniqueName = getUniqueParticipantName(finalName.trim(), existingNames);
      
      // Update state with the name being used
      setMyName(uniqueName);

      // Create vote record for this participant
      const voteRecord = await pb.collection('poker_votes').create({
        session: session.id,
        participant_name: uniqueName,
        vote: null
      });

      setMyRecordId(voteRecord.id);
      setHasJoined(true);
      
      // Store participant ID in localStorage for reconnection
      localStorage.setItem(`poker_participant_${sessionId}`, voteRecord.id);
      
    } catch (err: any) {
      console.error("Error joining session:", err);
      alert("Failed to join session: " + err.message);
    }
  };

  // Submit vote
  const handleVote = async (value: string) => {
    if (!myRecordId || !session || session.revealed) return;

    try {
      const newVote = myVote === value ? null : value;
      await pb.collection('poker_votes').update(myRecordId, {
        vote: newVote
      });
      setMyVote(newVote);
    } catch (err: any) {
      console.error("Error voting:", err);
      alert("Failed to submit vote: " + err.message);
    }
  };

  // Reveal votes (owner only)
  const handleReveal = async () => {
    if (!session || !isOwner) return;

    try {
      await pb.collection('poker_sessions').update(session.id, {
        revealed: true
      });
    } catch (err: any) {
      console.error("Error revealing votes:", err);
      alert("Failed to reveal votes: " + err.message);
    }
  };

  // Reset round (owner only)
  const handleReset = async () => {
    if (!session || !isOwner) return;

    try {
      // Save current round to history if there are votes
      const votedParticipants = participants.filter(p => p.vote);
      if (votedParticipants.length > 0 && session.revealed) {
        const stats = calculateVoteStats(votedParticipants.map(p => p.vote));
        const newRound: RoundHistory = {
          story: session.current_story || 'Untitled Story',
          votes: votedParticipants.map(p => ({ name: p.name, vote: p.vote! })),
          average: stats.average || 0,
          timestamp: new Date()
        };
        setRoundHistory(prev => [...prev, newRound]);
      }

      // Reset all votes
      const resetPromises = participants.map(p => 
        pb.collection('poker_votes').update(p.id, { vote: null })
      );
      
      await Promise.all(resetPromises);
      
      // Set revealed to false
      await pb.collection('poker_sessions').update(session.id, {
        revealed: false
      });

      setMyVote(null);
      
      // Reset timer
      setTimerRunning(false);
      setTimeRemaining(60);
      
      // Auto-start timer if enabled
      if (timerEnabled) {
        setTimerRunning(true);
      }
    } catch (err: any) {
      console.error("Error resetting round:", err);
      alert("Failed to reset: " + err.message);
    }
  };

  // End session (owner only)
  const handleEndSession = async () => {
    if (!session || !isOwner) return;

    const confirmed = window.confirm(
      "Are you sure you want to end this session? The session will be archived and no further voting will be allowed."
    );

    if (!confirmed) return;

    try {
      await pb.collection('poker_sessions').update(session.id, {
        status: 'ended'
      });
    } catch (err: any) {
      console.error("Error ending session:", err);
      alert("Failed to end session: " + err.message);
    }
  };

  // Update story description
  const handleStoryUpdate = async () => {
    if (!session || !isOwner) return;

    try {
      await pb.collection('poker_sessions').update(session.id, {
        current_story: storyInput
      });
    } catch (err: any) {
      console.error("Error updating story:", err);
    }
  };

  // Copy share link
  const handleCopyLink = () => {
    const url = `${window.location.origin}/planning-poker/${sessionId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Subscribe to realtime updates
  useEffect(() => {
    if (!session) return;

    let voteUnsubscribe: (() => void) | null = null;
    let sessionUnsubscribe: (() => void) | null = null;

    const setupSubscriptions = async () => {
      try {
        // Subscribe to session updates (revealed state)
        const sessionUnsub = await pb.collection('poker_sessions').subscribe(
          session.id,
          (e: RecordSubscription<PokerSession>) => {
            if (e.action === 'update') {
              setSession(e.record);
              setStoryInput(e.record.current_story || '');
            }
          }
        );
        sessionUnsubscribe = sessionUnsub;

        // Subscribe to vote updates
        const voteUnsub = await pb.collection('poker_votes').subscribe(
          '*',
          (e: RecordSubscription<any>) => {
            if (e.record.session === session.id) {
              setParticipants(prev => {
                const filtered = prev.filter(p => p.id !== e.record.id);
                
                if (e.action === 'delete') {
                  return filtered;
                }

                return [...filtered, {
                  id: e.record.id,
                  name: e.record.participant_name,
                  vote: e.record.vote || null
                }];
              });

              // Update my vote if it's my record
              if (e.record.id === myRecordId) {
                setMyVote(e.record.vote || null);
              }
            }
          },
          { filter: `session="${session.id}"` }
        );
        voteUnsubscribe = voteUnsub;

      } catch (err) {
        console.error("Error setting up subscriptions:", err);
      }
    };

    setupSubscriptions();

    return () => {
      if (voteUnsubscribe) voteUnsubscribe();
      if (sessionUnsubscribe) sessionUnsubscribe();
    };
  }, [session, myRecordId]);

  // Initial load
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // Auto-join if we have a name from URL (only once for owner)
  useEffect(() => {
    if (session && initialUserName && initialIsOwner && !hasJoined && !myRecordId) {
      // Check if already joined before
      const storedId = localStorage.getItem(`poker_participant_${sessionId}`);
      if (!storedId) {
        // Only auto-join if not already joined
        joinSession();
      }
    }
  }, [session]);

  // Timer countdown
  useEffect(() => {
    if (!timerRunning || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setTimerRunning(false);
          // Show notification
          if (isOwner) {
            alert('⏰ Time is up! You can now reveal the votes.');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning, timeRemaining, isOwner]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-md mx-auto border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.href = '/planning-poker'}>
            Create New Session
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return null;
  }

  // If not joined yet, show join prompt
  if (!hasJoined && !myRecordId) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Join Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Name (min 2 characters)</label>
            <Input
              id="participant-name-input"
              type="text"
              placeholder="Enter your name"
              defaultValue={initialUserName}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const input = e.currentTarget;
                  const name = input.value.trim();
                  if (name.length >= 2) {
                    joinSession(name);
                  }
                }
              }}
              className="min-h-[44px]"
              minLength={2}
            />
          </div>
          <Button 
            onClick={() => {
              const input = document.getElementById('participant-name-input') as HTMLInputElement;
              const name = input?.value.trim() || '';
              if (name.length >= 2) {
                joinSession(name);
              }
            }}
            className="w-full min-h-[44px]"
          >
            Join Session
          </Button>
        </CardContent>
      </Card>
    );
  }

  const votedCount = participants.filter(p => p.vote !== null).length;
  const totalCount = participants.length;
  const allVoted = votedCount === totalCount && totalCount > 0;

  const stats = session.revealed ? calculateVoteStats(participants.map(p => p.vote)) : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Session Ended Banner */}
      {session.status === 'ended' && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive">
              <XCircle className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-semibold text-lg">This session has ended</p>
                <p className="text-sm text-muted-foreground">This session has been archived. The data is still viewable, but no further voting is allowed.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Share Link */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">Share this link with your team:</p>
              <code className="block bg-muted px-4 py-2 rounded text-sm break-all">
                {typeof window !== 'undefined' ? `${window.location.origin}/planning-poker/${sessionId}` : ''}
              </code>
            </div>
            <Button onClick={handleCopyLink} variant="outline" className="min-h-[44px] sm:self-end">
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Story Description (Owner Only) */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Story Description</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="What are we estimating?"
                value={storyInput}
                onChange={(e) => setStoryInput(e.target.value)}
                onBlur={handleStoryUpdate}
                onKeyPress={(e) => e.key === 'Enter' && handleStoryUpdate()}
                className="min-h-[44px]"
                disabled={session.status === 'ended'}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timer Controls (Owner Only) */}
      {isOwner && session.status === 'active' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Voting Timer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={timerEnabled}
                      onChange={(e) => {
                        setTimerEnabled(e.target.checked);
                        if (!e.target.checked) {
                          setTimerRunning(false);
                          setTimeRemaining(60);
                        } else if (!session.revealed) {
                          setTimerRunning(true);
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Enable 60-second timer</span>
                  </label>
                </div>
                
                {timerEnabled && (
                  <div className="flex items-center gap-2">
                    <Badge variant={timeRemaining <= 10 ? "destructive" : "secondary"} className="text-lg px-3 py-1">
                      <Clock className="w-4 h-4 mr-1" />
                      {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                    </Badge>
                    {!session.revealed && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (timerRunning) {
                            setTimerRunning(false);
                          } else {
                            setTimeRemaining(60);
                            setTimerRunning(true);
                          }
                        }}
                        className="min-h-[36px]"
                      >
                        {timerRunning ? (
                          <>
                            <Square className="w-3 h-3 mr-1" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 mr-1" />
                            Start
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
              
              {timerEnabled && (
                <p className="text-xs text-muted-foreground">
                  Timer will automatically start when you reset the round. You&apos;ll receive a notification when time is up.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Story (Non-owners) */}
      {!isOwner && session.current_story && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Estimating:</p>
            <p className="text-lg font-medium">{session.current_story}</p>
          </CardContent>
        </Card>
      )}

      {/* Voting Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your Vote</span>
            <div className="flex gap-2">
              {timerRunning && !session.revealed && session.status === 'active' && (
                <Badge variant={timeRemaining <= 10 ? "destructive" : "secondary"}>
                  <Clock className="w-3 h-3 mr-1" />
                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </Badge>
              )}
              {session.status === 'ended' && (
                <Badge variant="destructive">
                  <XCircle className="w-3 h-3 mr-1" />
                  Session Ended
                </Badge>
              )}
              {session.status === 'active' && session.revealed && (
                <Badge variant="secondary">
                  <Eye className="w-3 h-3 mr-1" />
                  Revealed
                </Badge>
              )}
              {session.status === 'active' && !session.revealed && !timerRunning && (
                <Badge variant="outline">
                  <EyeOff className="w-3 h-3 mr-1" />
                  Hidden
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {session.status === 'ended' ? (
            <div className="text-center py-8 text-muted-foreground">
              <XCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">This session has ended</p>
              <p className="text-sm mt-1">No further voting is allowed</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 justify-center">
              {VALID_VOTES.map((value) => (
                <PokerCard
                  key={value}
                  value={value}
                  selected={myVote === value}
                  disabled={session.revealed}
                  revealed={session.revealed}
                  onClick={() => handleVote(value)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Participants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Participants ({votedCount}/{totalCount})
            </span>
            {isOwner && (
              <div className="flex gap-2">
                {session.revealed && session.status === 'active' && (
                  <Button onClick={handleReset} variant="outline" size="sm" className="min-h-[44px]">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Round
                  </Button>
                )}
                {session.revealed && session.status === 'active' && (
                  <Button onClick={handleEndSession} variant="destructive" size="sm" className="min-h-[44px]">
                    <XCircle className="w-4 h-4 mr-2" />
                    End Session
                  </Button>
                )}
                {!session.revealed && session.status === 'active' && (
                  <Button 
                    onClick={handleReveal} 
                    disabled={!allVoted}
                    size="sm"
                    className="min-h-[44px]"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Reveal Votes
                  </Button>
                )}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile: Cards */}
          <div className="md:hidden space-y-3">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded border">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{p.name}</span>
                  {p.name === session.owner_name && (
                    <Badge variant="secondary" className="text-xs">Owner</Badge>
                  )}
                </div>
                <div>
                  {session.revealed ? (
                    <Badge variant={p.vote ? "default" : "outline"} className="text-lg">
                      {p.vote || '?'}
                    </Badge>
                  ) : (
                    <Badge variant={p.vote ? "default" : "outline"}>
                      {p.vote ? '✓ Voted' : 'Waiting'}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block">
            <div className="space-y-2">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded border">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    {p.name === session.owner_name && (
                      <Badge variant="secondary" className="text-xs">Owner</Badge>
                    )}
                  </div>
                  <div>
                    {session.revealed ? (
                      <Badge variant={p.vote ? "default" : "outline"} className="text-lg px-4 py-1">
                        {p.vote || '?'}
                      </Badge>
                    ) : (
                      <Badge variant={p.vote ? "default" : "outline"}>
                        {p.vote ? '✓ Voted' : 'Waiting'}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {participants.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Waiting for participants to join...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Statistics (when revealed) */}
      {session.revealed && stats && stats.average !== null && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Average</p>
                <p className="text-2xl font-bold">{stats.average.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Minimum</p>
                <p className="text-2xl font-bold">{stats.min}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Maximum</p>
                <p className="text-2xl font-bold">{stats.max}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Consensus</p>
                <p className="text-2xl font-bold">{stats.consensus ? '✓' : '✗'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Round History */}
      {roundHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Round History ({roundHistory.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {roundHistory.map((round, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">{round.story}</h4>
                      <p className="text-sm text-muted-foreground">
                        {round.timestamp.toLocaleTimeString()} - Average: {round.average.toFixed(1)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {round.average.toFixed(1)}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {round.votes.map((vote, voteIndex) => (
                      <div key={voteIndex} className="flex items-center gap-2 bg-muted px-3 py-1 rounded text-sm">
                        <span className="font-medium">{vote.name}:</span>
                        <Badge variant="outline" className="text-xs">{vote.vote}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
