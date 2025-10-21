import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    
    // Read user data
    const usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const user = usersData.find((u: any) => u.id === userId);
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Return user profile (excluding password)
    const { password, ...userProfile } = user;
    
    return NextResponse.json({
      success: true,
      user: userProfile
    });
  } catch (error) {
    console.error('Failed to get user profile:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Server error' 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const updates = await request.json();
    
    // Read user data
    const usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const userIndex = usersData.findIndex((u: any) => u.id === userId);
    
    if (userIndex === -1) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Update user data (only allow updating specific fields)
    const allowedFields = ['username', 'friends', 'savedScripts', 'collectedScripts', 'gameHistory', 'chatHistory'];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        usersData[userIndex][field] = updates[field];
      }
    }

    // Save updated data
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2));
    
    // Return updated user profile (excluding password)
    const { password, ...userProfile } = usersData[userIndex];
    
    return NextResponse.json({
      success: true,
      user: userProfile,
      message: 'User profile updated successfully'
    });
  } catch (error) {
    console.error('更新用户资料失败:', error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}
