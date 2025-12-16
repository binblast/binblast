// Script to assign a user email to a partner account
// Usage: node assign-partner-user.js <userEmail> [partnerId]

const userEmail = process.argv[2];
const partnerId = process.argv[3];

if (!userEmail) {
  console.error('Usage: node assign-partner-user.js <userEmail> [partnerId]');
  console.error('Example: node assign-partner-user.js sylvannious98@gmail.com');
  process.exit(1);
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function assignUserToPartner() {
  try {
    const body = partnerId 
      ? { userEmail, partnerId }
      : { userEmail };

    const response = await fetch(`${baseUrl}/api/admin/partners/assign-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Success:', data.message);
      console.log('Partner ID:', data.partnerId);
      console.log('User ID:', data.userId);
      console.log('Partner Data:', JSON.stringify(data.partnerData, null, 2));
    } else {
      console.error('❌ Error:', data.error);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Failed to assign user:', err.message);
    process.exit(1);
  }
}

assignUserToPartner();
