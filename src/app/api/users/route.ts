import { NextRequest, NextResponse } from 'next/server';
import { getUsers, createUser, updateUser } from '@/lib/storage';
import { initializeTestUsers } from '@/lib/utils';

// Initialize user data
export async function GET() {
  try {
    const users = getUsers();
    
    // If no users exist, create test users
    if (users.length === 0) {
      const testUsers = initializeTestUsers();
      testUsers.forEach(user => createUser(user));
      return NextResponse.json({ 
        success: true, 
        message: 'Test users created successfully',
        users: testUsers.map(u => ({ id: u.id, username: u.username }))
      });
    }
    
    return NextResponse.json({ 
      success: true,
      users: users.map(u => ({ id: u.id, username: u.username, isOnline: u.isOnline }))
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to get users' }, { status: 500 });
  }
}

// User login
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    console.log('Login attempt:', { username, password });
    
    const users = getUsers();
    console.log('Available users:', users.map(u => ({ username: u.username, password: u.password })));
    
    const user = users.find(u => u.username === username && u.password === password);
    console.log('Found user:', user);
    
    if (!user) {
      console.log('Login failed: user not found');
      return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });
    }
    
    // Update user online status
    user.isOnline = true;
    updateUser(user);
    
    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        username: user.username,
        friends: user.friends,
        savedScripts: user.savedScripts
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Login failed' }, { status: 500 });
  }
}
