import { NextRequest, NextResponse } from 'next/server';
import { getUsers, updateUser, getUserById, getGameRecords } from '@/lib/storage';

// GET: List friend IDs authorized by current user
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = getUserById(id);
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  return NextResponse.json({ success: true, grants: user.styleGrantsTo || [] });
}

// POST: Authorize friend { friendId }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // self
  const { friendId } = await req.json();
  const user = getUserById(id);
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  if (!user.friends.includes(friendId)) {
    return NextResponse.json({ success: false, error: 'Not a friend' }, { status: 400 });
  }
  const grants = new Set(user.styleGrantsTo || []);
  grants.add(friendId);
  (user as any).styleGrantsTo = Array.from(grants);
  updateUser(user);
  return NextResponse.json({ success: true, grants: user.styleGrantsTo });
}

// DELETE: Revoke authorization ?friendId=
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const friendId = searchParams.get('friendId');
  const user = getUserById(id);
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  if (!friendId) return NextResponse.json({ success: false, error: 'friendId required' }, { status: 400 });
  const grants = new Set(user.styleGrantsTo || []);
  grants.delete(friendId);
  (user as any).styleGrantsTo = Array.from(grants);
  updateUser(user);
  return NextResponse.json({ success: true, grants: user.styleGrantsTo });
}
