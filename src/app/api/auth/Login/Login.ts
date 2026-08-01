import { NextResponse } from 'next/server';
import dbConnect from '../../../../../utils/db'; 
import Admin from '../../../../../models/Admin';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { email, password } = await req.json();

    // 
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 400 },
      );
    }

    // match password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, message: 'Login successful' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const { email, password } = await req.json();

    let updateData = { email };

    // if password is provided, hash it before updating
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    // update database 
    await Admin.findOneAndUpdate({}, updateData, { upsert: true, new: true });

    return NextResponse.json({
      success: true,
      message: 'Updated successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to update' },
      { status: 500 },
    );
  }
}
