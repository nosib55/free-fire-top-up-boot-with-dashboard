import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { status, action, name, phone, role, password, hitBalance, balance } = body;

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    if (action === 'TOGGLE_STATUS' || !status && !name && !role && !password && hitBalance === undefined && balance === undefined) {
      user.status = user.status === 'active' ? 'suspended' : 'active';
    } else {
      if (status) user.status = status;
      if (name) user.name = name;
      if (phone !== undefined) user.phone = phone;
      if (balance !== undefined) {
        const b = parseFloat(balance);
        if (!isNaN(b)) {
          user.balance = Math.max(0, b);
        }
      }
      if (hitBalance !== undefined) {
        const hits = parseInt(hitBalance, 10);
        if (!isNaN(hits)) {
          user.hitBalance = hits;
          const Reseller = (await import('@/models/Reseller')).default;
          await Reseller.findOneAndUpdate({ userId: user._id }, { masterQuotaBalance: hits });
          const ApiKey = (await import('@/models/ApiKey')).default;
          await ApiKey.updateMany({ ownerId: user._id, status: 'active' }, { remainingHits: hits, totalHits: hits });
        }
      }
      if (role && (role === 'admin' || role === 'reseller' || role === 'user')) {
        user.role = role;
        if (role === 'reseller') {
          const existingReseller = await (await import('@/models/Reseller')).default.findOne({ userId: user._id });
          if (!existingReseller) {
            const cleanTag = (user.name || 'RSLR').replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase() || 'RSLR';
            await (await import('@/models/Reseller')).default.create({
              userId: user._id,
              brandingTag: `${cleanTag}_${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
              masterQuotaBalance: user.hitBalance && user.hitBalance > 0 ? user.hitBalance : 1000,
              allocatedQuota: 0,
              discountRate: 15,
            });
          }
        }
      }
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
