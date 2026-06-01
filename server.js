
const express = require('express');
const app = express();
app.use(express.json());
app.use(express.static('public'));

const VERIFY_TOKEN = 'mysecrettoken123';

// ===== CLIENT KI INFO YAHAN BADLO =====
const BUSINESS_INFO = {
  name: "My Business",
  products: "Hamare products yahan likhein",
  prices: "Prices yahan likhein",
  timing: "9 AM - 9 PM",
  address: "Address yahan likhein",
  delivery: "Delivery details yahan",
  phone: "03001234567",
  extra: ""
};
// =====================================

function buildSystemPrompt(info) {
  return `Tum ${info.name} ke friendly WhatsApp assistant ho.
Customer ke har sawal ka Urdu mein jawab do.
Hamesha polite, helpful aur professional raho.

Business Details:
- Naam: ${info.name}
- Products: ${info.products}
- Prices: ${info.prices}
- Timing: ${info.timing}
- Address: ${info.address}
- Delivery: ${info.delivery}
- Contact: ${info.phone}
${info.extra ? '- Extra Info: ' + info.extra : ''}

Important Rules:
1. Hamesha Urdu mein jawab do
2. Customer ko products ke baare mein detail mein batao
3. Order lene ke liye contact number do
4. Hamesha khush-akhlaq raho
5. Agar koi cheez nahi pata to politely batao`;
}

// WhatsApp webhook verify
app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

// Message receive karo
app.post('/webhook', async (req, res) => {
  try {
    const message = req.body?.entry?.[0]
      ?.changes?.[0]?.value?.messages?.[0];
    
    if (!message || message.type !== 'text') {
      return res.sendStatus(200);
    }

    const userText = message.text.body;
    const phoneNumber = message.from;

    const claudeResponse = await fetch(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          system: buildSystemPrompt(BUSINESS_INFO),
          messages: [{ role: 'user', content: userText }]
        })
      }
    );

    const claudeData = await claudeResponse.json();
    const replyText = claudeData.content[0].text;

    await fetch(
      `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phoneNumber,
          text: { body: replyText }
        })
      }
    );

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// Business info update API
app.post('/update-business', (req, res) => {
  const { name, products, prices, timing, address, delivery, phone, extra } = req.body;
  if (name) BUSINESS_INFO.name = name;
  if (products) BUSINESS_INFO.products = products;
  if (prices) BUSINESS_INFO.prices = prices;
  if (timing) BUSINESS_INFO.timing = timing;
  if (address) BUSINESS_INFO.address = address;
  if (delivery) BUSINESS_INFO.delivery = delivery;
  if (phone) BUSINESS_INFO.phone = phone;
  if (extra !== undefined) BUSINESS_INFO.extra = extra;
  res.json({ success: true, message: 'Business info update ho gai!', data: BUSINESS_INFO });
});

// Current info check
app.get('/business-info', (req, res) => {
  res.json(BUSINESS_INFO);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server chal raha hai! Port:', PORT));
