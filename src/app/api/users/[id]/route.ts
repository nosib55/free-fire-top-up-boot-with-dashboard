import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { status, action, name, phone, role, password } = body;

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    if (action === 'TOGGLE_STATUS' || !status && !name && !role && !password) {
      user.status = user.status === 'active' ? 'suspended' : 'active';
    } else {
      if (status) user.status = status;
      if (name) user.name = name;
      if (phone !== undefined) user.phone = phone;
      if (role && (role === 'admin' || role === 'user')) user.role = role;
      if (password && password.trim() !== '') {
        const hashed = await bcrypt.hash(password, 10);
        user.password = hashed;
        user.passwordHash = hashed;
      }
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: `User status updated to ${user.status}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        hitBalance: user.hitBalance,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  try {
    const { id } = await context.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Delete failed' }, { status: 500 });
  }
}
