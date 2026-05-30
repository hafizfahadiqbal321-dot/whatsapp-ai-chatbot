const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = 'mysecrettoken123';

const SYSTEM_PROMPT = `Tum ek friendly business assistant ho.
Customer ke sawal ka Urdu aur English mein jawab do.
Hamesha polite aur helpful raho.`;

app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

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
          system: SYSTEM_PROMPT,
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server chal raha hai!'));
