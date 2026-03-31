require('dotenv').config({ path: __dirname + '/.env' });
const { sendMessage } = require('./services/aisensyService');

async function test() {
  console.log('=== GREEN-API Test ===');
  console.log('ID:', process.env.GREEN_API_ID ? '✅' : '❌');
  console.log('Token:', process.env.GREEN_API_TOKEN ? '✅' : '❌');

  const result = await sendMessage(
    '919450439166',
    'Hello from Automo AI! 🤖 GREEN-API working! ✅'
  );
  console.log('Result:', result);
  if (result.success) console.log('✅ Check your WhatsApp!');
  else console.log('❌ Failed:', result.error);
}
test();
