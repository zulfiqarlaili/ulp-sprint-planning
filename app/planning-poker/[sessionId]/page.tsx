import { notFound } from "next/navigation";
import { PokerRoom } from "@/components/poker-room";

interface PageProps {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ owner?: string; name?: string }>;
}

export default async function PokerRoomPage({ params, searchParams }: PageProps) {
  const { sessionId } = await params;
  const search = await searchParams;

  // Validate session ID format (8 character hex)
  if (!sessionId || sessionId.length !== 8) {
    notFound();
  }

  const isOwner = search.owner === 'true';
  const userName = search.name || '';

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Planning Poker Session
        </h1>
        <p className="text-sm text-muted-foreground">
          Session ID: <code className="font-mono bg-muted px-2 py-1 rounded">{sessionId}</code>
        </p>
      </header>

      {/* Poker Room Component */}
      <PokerRoom 
        sessionId={sessionId}
        initialIsOwner={isOwner}
        initialUserName={userName}
      />
    </div>
  );
}
