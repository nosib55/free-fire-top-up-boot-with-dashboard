const mongoose = require('mongoose');

async function activateAdmin() {
  const uri = 'mongodb+srv://Freefire_Db:IID7J9X5JkhUHU56@cluster0.sugbz4l.mongodb.net/Freefire_db?retryWrites=true&w=majority';
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(uri);
    const result = await mongoose.connection.collection('users').updateMany(
      { email: 'admin@apex-topup.com' },
      { $set: { status: 'active', role: 'admin' } }
    );
    console.log('Successfully activated admin account:', result);
  } catch (err) {
    console.error('Error activating admin:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

activateAdmin();
