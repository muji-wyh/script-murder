import { NextRequest, NextResponse } from 'next/server';
import { getUsers, getUserById, getGameRecords } from '@/lib/storage';

// Return: List of "friend styles" that current user can use and their brief descriptions
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // current user
  const users = getUsers();
  const me = users.find(u => u.id === id);
  if (!me) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

  // Whose style can be used: the other party's styleGrantsTo includes me
  const granters = users.filter(u => (u.styleGrantsTo || []).includes(id));

  // Calculate speaking style summary for each friend's recent three games (simple version: concatenate recent three games text, truncate)
  const gameRecords = getGameRecords();
  const friendStyles = granters.map(friend => {
    // 找出该好友参与的最近三局
    const participated = gameRecords
      .filter(gr => gr.players.includes(friend.id))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 3);
    const texts: string[] = [];
    participated.forEach(gr => {
      gr.roundRecords.forEach(rr => {
        rr.messages
          .filter(m => m.senderId === friend.id && !m.isNPC)
          .forEach(m => texts.push(m.content));
      });
    });
    const sample = texts.join(' ');
    // 简要风格：截断展示
    const brief = sample.length > 200 ? sample.slice(0, 200) + '…' : sample;
    return {
      userId: friend.id,
      username: friend.username,
      recentStyleSample: brief,
      recentMessageCount: texts.length
    };
  });

  return NextResponse.json({ success: true, friendStyles });
}
