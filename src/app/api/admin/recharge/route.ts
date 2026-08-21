import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Transaction from '@/models/Transaction';
import ApiKey from '@/models/ApiKey';
import User from '@/models/User';
import crypto from 'crypto';

export async function GET() {
  await dbConnect();
  try {
    const transactions = await Transaction.find().populate('userId', 'name email role').sort({ createdAt: -1 });
    return NextResponse.json({ success: true, transactions });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const { userId, amount, hits, paymentMethod, proof } = body;

    const txId = `RECHARGE_${Date.now()}_${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const tx = await Transaction.create({
      txId,
      userId: userId || '654321654321654321654321', // Default ID fallback for demo
      type: 'RECHARGE_REQUEST',
      paymentMethod: paymentMethod || 'bKash',
      amount: parseFloat(amount || '500'),
      hits: parseInt(hits || '1000', 10),
      status: 'PENDING',
      proof: proof || 'TrxID: 9X8Y7Z6A',
    });

    return NextResponse.json({ success: true, message: 'Recharge request submitted for approval.', transaction: tx });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const { transactionId, status } = body; // 'APPROVED' or 'REJECTED'

    const tx = await Transaction.findById(transactionId);
    if (!tx) {
      return NextResponse.json({ success: false, message: 'Transaction not found' }, { status: 404 });
    }

    tx.status = status;
    await tx.save();

    if (status === 'APPROVED') {
      // Credit quota to user's primary API key
      const userKey = await ApiKey.findOne({ ownerId: tx.userId });
      if (userKey) {
        userKey.remainingHits += tx.hits;
        userKey.totalHits += tx.hits;
        if (userKey.status === 'expired') userKey.status = 'active';
        await userKey.save();
      }

      // Update User balance
      await User.findByIdAndUpdate(tx.userId, { $inc: { balance: tx.amount } });
    }

    return NextResponse.json({ success: true, message: `Transaction ${status.toLowerCase()} successfully`, transaction: tx });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
