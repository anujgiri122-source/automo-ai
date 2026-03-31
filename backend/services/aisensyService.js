const https = require('https');

function postJSON(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'api.green-api.com',
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        console.log(`[GREEN-API] HTTP ${res.statusCode}`);
        try { resolve({ statusCode: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ statusCode: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function sendMessage(phone, message) {
  console.log(`[GREEN-API] sendMessage → ${phone}`);
  try {
    const id = process.env.GREEN_API_ID;
    const token = process.env.GREEN_API_TOKEN;
    if (!id || !token) throw new Error('GREEN_API_ID or GREEN_API_TOKEN not set');
    const chatId = phone.includes('@') ? phone : `${phone}@c.us`;
    const { statusCode, body } = await postJSON(
      `/waInstance${id}/sendMessage/${token}`,
      { chatId, message }
    );
    if (statusCode === 200) {
      console.log('[GREEN-API] ✅ Sent!');
      return { success: true, error: null };
    }
    return { success: false, error: body?.message || `HTTP ${statusCode}` };
  } catch (err) {
    console.error('[GREEN-API] Error:', err.message);
    return { success: false, error: err.message };
  }
}

async function sendMediaMessage(phone, message, mediaUrl) {
  console.log(`[GREEN-API] sendMedia → ${phone}`);
  try {
    const id = process.env.GREEN_API_ID;
    const token = process.env.GREEN_API_TOKEN;
    const chatId = phone.includes('@') ? phone : `${phone}@c.us`;
    const { statusCode, body } = await postJSON(
      `/waInstance${id}/sendFileByUrl/${token}`,
      { chatId, urlFile: mediaUrl, fileName: 'automo.jpg', caption: message }
    );
    if (statusCode === 200) return { success: true, error: null };
    return { success: false, error: body?.message || `HTTP ${statusCode}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { sendMessage, sendMediaMessage };
