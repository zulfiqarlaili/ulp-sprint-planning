import { notFound } from "next/navigation";
import { PokerRoom } from "@/components/poker-room";
import type { Role } from "@/lib/poker-utils";

interface PageProps {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ owner?: string; name?: string; role?: string }>;
}

export default async function PokerRoomPage({ params, searchParams }: PageProps) {
  const { sessionId } = await params;
  const search = await searchParams;

  if (!sessionId || sessionId.length !== 8) {
    notFound();
  }

  const isOwner = search.owner === 'true';
  const userName = search.name || '';
  const role: Role = (['voter', 'presenter', 'observer'] as const).includes(search.role as Role)
    ? (search.role as Role)
    : 'voter';

  return (
    <div className="space-y-6 pb-12">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Planning Poker Session
        </h1>
        <p className="text-sm text-muted-foreground">
          Session ID: <code className="font-mono bg-muted px-2 py-1 rounded">{sessionId}</code>
        </p>
      </header>

      <PokerRoom 
        sessionId={sessionId}
        initialIsOwner={isOwner}
        initialUserName={userName}
        initialRole={role}
      />
    </div>
  );
}
