import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import User from '@/models/User';
import ApiKey from '@/models/ApiKey';
import bcrypt from 'bcryptjs';

export async function GET() {
  await dbConnect();
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    
    // Attach primary API Key to each user for unified display
    const usersWithKeys = await Promise.all(
      users.map(async (u: any) => {
        const primaryKey = await ApiKey.findOne({ ownerId: u._id }).lean();
        return {
          ...u,
          apiKey: primaryKey ? primaryKey.key : null,
          remainingHits: primaryKey ? primaryKey.remainingHits : 0,
          totalHits: primaryKey ? primaryKey.totalHits : 0,
        };
      })
    );

    return NextResponse.json({ success: true, users: usersWithKeys });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const { name, email, phone, role, password, status, initialHits = 1000, expiryDays = 30 } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, message: 'Name, email, and password are required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return NextResponse.json({ success: false, message: 'User with this email already exists.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email: cleanEmail,
      phone: phone || '',
      role: role || 'reseller',
      password: hashedPassword,
      status: status || 'active',
      hitBalance: initialHits,
    });

    // Automatically generate and attach an active API Key to the new user
    const generatedKey = `AMS-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (Number(expiryDays) || 30));

    const newKey = await ApiKey.create({
      key: generatedKey,
      name: `${name}'s API Token`,
      ownerId: newUser._id,
      userRef: newUser._id,
      role: newUser.role,
      totalHits: Number(initialHits) || 1000,
      remainingHits: Number(initialHits) || 1000,
      usedHits: 0,
      rateLimitRPS: 10,
      expiresAt,
      status: 'active',
    });

    return NextResponse.json({
      success: true,
      message: 'User and assigned API Key created successfully!',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        status: newUser.status,
        apiKey: newKey.key,
        totalHits: newKey.totalHits,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const { userId, action, name, phone, role, status, password } = body;

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    if (action === 'TOGGLE_STATUS') {
      user.status = user.status === 'active' ? 'suspended' : 'active';
      // Synchronize associated API Key status
      await ApiKey.updateMany({ ownerId: user._id }, { status: user.status });
    } else {
      if (name) user.name = name;
      if (phone !== undefined) user.phone = phone;
      if (role) user.role = role;
      if (status) {
        user.status = status;
        await ApiKey.updateMany({ ownerId: user._id }, { status });
      }
      if (password && password.trim() !== '') {
        user.password = await bcrypt.hash(password, 10);
      }
    }

    await user.save();
    return NextResponse.json({ success: true, message: 'User updated successfully', user });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
