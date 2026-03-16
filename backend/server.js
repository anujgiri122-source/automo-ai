require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const CAPTION_STYLES = [
  {
    key: 'urgency',
    label: 'Urgency',
    icon: 'fire',
    description: 'Creates FOMO — limited time, limited seats, act now',
  },
  {
    key: 'story',
    label: 'Story',
    icon: 'book',
    description: 'Emotional storytelling — customer journey or brand story',
  },
  {
    key: 'education',
    label: 'Education',
    icon: 'bulb',
    description: 'Tips, facts, how-to — position as expert',
  },
  {
    key: 'social_proof',
    label: 'Social Proof',
    icon: 'star',
    description: 'Reviews, numbers, testimonials — build trust',
  },
  {
    key: 'festival',
    label: 'Festival / Trend',
    icon: 'sparkle',
    description: 'Tie to Indian festival, season, or trending moment',
  },
];

// Business emoji map
const BUSINESS_EMOJIS = {
  gym: '💪🏋️‍♂️🔥',
  salon: '💇‍♀️✨💅',
  cafe: '☕🍰😍',
  hotel: '🏨🌟🛎️',
  coaching: '📚🎯✏️',
  bike_shop: '🏍️⚙️🔧',
  saree_shop: '👗🌸✨',
  general: '🌟💯🎯',
};

// Smart template-based caption generator — works without any API
function generateCaptions(businessType, topic) {
  const emojis = BUSINESS_EMOJIS[businessType] || BUSINESS_EMOJIS.general;
  const e1 = emojis[0] || '🌟';
  const e2 = emojis[1] || '✨';
  const e3 = emojis[2] || '🔥';

  const businessLabels = {
    gym: { hi: 'gym', en: 'gym' },
    salon: { hi: 'salon', en: 'salon' },
    cafe: { hi: 'cafe', en: 'café' },
    hotel: { hi: 'hotel', en: 'hotel' },
    coaching: { hi: 'coaching centre', en: 'coaching centre' },
    bike_shop: { hi: 'bike shop', en: 'bike shop' },
    saree_shop: { hi: 'saree shop', en: 'store' },
    general: { hi: 'humara store', en: 'our store' },
  };
  const biz = businessLabels[businessType] || businessLabels.general;

  return [
    {
      style: 'urgency',
      hinglish: `${e3} Sirf aaj ke liye! ${topic} — iska faayda uthao abhi!\nSeats/spots bahut limited hain, yaar. ${e1}\nAaj hi call karo ya DM karo — kal mat sochna! 📲\n#${businessType} #LimitedOffer #AbhiYaKabhi`,
      english: `${e3} Today Only! ${topic} — Don't miss out!\nLimited spots available. Act now before it's gone! ${e1}\nCall or DM us today — this offer won't last! 📲\n#LimitedOffer #ActNow #${businessType}`,
    },
    {
      style: 'story',
      hinglish: `${e1} Ek chhoti si kahani sunao aapko...\nJab ek customer hamare ${biz.hi} aaya, toh unhe expect nahi tha ki ${topic} itna acha hoga. ${e2}\nAb woh humare regular hain — aur aap bhi bano!\nApni story shuru karo aaj se. 💬`,
      english: `${e1} Every great journey starts with a single step.\nOne of our customers never expected ${topic} to change their experience so much. ${e2}\nNow they're a regular — and you could be too!\nStart your story with us today. 💬`,
    },
    {
      style: 'education',
      hinglish: `${e2} Kya aap jaante hain? ${topic} ke baare mein 3 important baatein:\n1️⃣ Sahi guidance milne se results zyada aate hain\n2️⃣ Consistency hi key hai — roz thoda thoda\n3️⃣ Expert help se time aur paise dono bachte hain ${e1}\nHumse miliye aur sahi raasta pakdo! 🎯`,
      english: `${e2} Did you know? 3 things about ${topic} you should know:\n1️⃣ The right guidance dramatically improves results\n2️⃣ Consistency is key — small steps daily\n3️⃣ Expert help saves both time and money ${e1}\nVisit us and get started the right way! 🎯`,
    },
    {
      style: 'social_proof',
      hinglish: `${e1} 500+ satisfied customers hamare saath hain!\n"${topic} ke baad mujhe fark nazar aaya — bilkul acha experience tha!" — ek khush customer ${e2}\nHumara ${biz.hi} Indore/Delhi/Mumbai mein trusted naam hai. ${e3}\nAaj hi join karo aur khud dekho fark! ⭐⭐⭐⭐⭐`,
      english: `${e1} 500+ happy customers and counting!\n"${topic} made a real difference — absolutely loved the experience!" — a happy customer ${e2}\nTrusted by hundreds across India. ${e3}\nJoin us today and see the difference yourself! ⭐⭐⭐⭐⭐`,
    },
    {
      style: 'festival',
      hinglish: `${e1} Is tyohaar ke mausam mein, aao celebrate karein! 🎉\n${topic} ke saath apne celebrations ko aur khaas banao. ${e2}\nHoli/Navratri/Eid — har tyohaar pe humara special offer!\nApno ke saath aao, yaadgaar waqt banao. ${e3} #Festival #IndianVibes`,
      english: `${e1} This festive season, make it extra special! 🎉\nCelebrate with ${topic} and create memories that last. ${e2}\nSpecial festive offers just for you and your loved ones!\nVisit us and make this occasion unforgettable. ${e3} #FestiveSeason #IndianFestivals`,
    },
  ];
}

app.post('/api/generate-captions', async (req, res) => {
  const { businessType, topic } = req.body;

  if (!businessType || !topic) {
    return res.status(400).json({ error: 'businessType and topic are required.' });
  }

  try {
    const captions = generateCaptions(businessType, topic);

    const enriched = captions.map((cap) => {
      const meta = CAPTION_STYLES.find((s) => s.key === cap.style) || {};
      return { ...cap, label: meta.label, icon: meta.icon, description: meta.description };
    });

    return res.json({ captions: enriched });
  } catch (err) {
    console.error('Caption generation error:', err.message);
    return res.status(500).json({ error: 'Caption generation failed. Please try again.' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'Automo Backend' }));

app.listen(PORT, () => {
  console.log(`Automo backend running on http://localhost:${PORT}`);
});
