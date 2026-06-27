import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

// Try loading dotenv (don't fail if not present)
try {
  const dotenv = await import('dotenv');
  dotenv.config();
} catch (e) {
  // Ignore
}

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Haversine Distance Formula (metres)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Tuning Constants
const LOCATION_REUSE_RADIUS_M = 30;
const LOCATION_REUSE_THRESHOLD_COUNT = 3;
const CATCH_COOLDOWN_MS = 60000;
const FEED_COOLDOWN_MS = 43200000; // 12 hours

// In-Memory Rate Limiting Maps
const lastCatchActions = new Map(); // uid -> timestamp
const lastFeedActions = new Map();  // `${uid}:${catId}` -> timestamp

// Helper to check location abuse
function checkLocationAbuse(uid, lat, lng, existingCats) {
  if (!uid || !existingCats) return false;
  const userOwnCatches = existingCats.filter(cat => cat.ownerUid === uid);
  let closeCount = 0;
  for (const cat of userOwnCatches) {
    if (cat.lat && cat.lng) {
      const dist = getDistance(lat, lng, cat.lat, cat.lng);
      if (dist <= LOCATION_REUSE_RADIUS_M) {
        closeCount++;
      }
    }
  }
  return closeCount >= LOCATION_REUSE_THRESHOLD_COUNT;
}


// Call Gemini Vision API
async function callGeminiVision(apiKey, base64Photo, systemInstruction) {
  const base64Data = base64Photo.replace(/^data:image\/[a-z]+;base64,/, "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: systemInstruction },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errText}`);
  }

  const resJson = await response.json();
  const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No text returned in Gemini response");
  }

  return JSON.parse(text);
}

// Text-only matching engine using Gemini
async function matchDescription(apiKey, newFeatures, candidates) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const prompt = `
    You are a matching engine for a cat game.
    Compare this physical description of a newly spotted cat:
    "${newFeatures}"
    
    Against this list of previously spotted cats in the same area:
    ${candidates.map(c => `ID: "${c.id}", Description: "${c.descriptorSummary || c.distinguishingFeatures}"`).join('\n')}
    
    Decide if the newly spotted cat is very likely the exact same cat as one of the candidates based on physical details (color, stripes, patches, build, collars, unique marks).
    If it matches one of the candidates with high confidence, respond with ONLY the matched ID (e.g. "cat_123").
    If it does not match any of the candidates, respond with ONLY "none".
    Do not add any other text, markdown, or explanation. Respond with a single word.
  `;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    if (!response.ok) return "none";
    const resJson = await response.json();
    const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "none";
    return text.toLowerCase().includes("none") ? "none" : text;
  } catch (e) {
    console.error("Gemini description match error:", e);
    return "none";
  }
}

// Roll Rarity
function rollRarity() {
  const roll = Math.floor(Math.random() * 100);
  if (roll < 50) return { rarity: 'common', xp: 10 };       // 50%
  if (roll < 80) return { rarity: 'uncommon', xp: 25 };     // 30%
  if (roll < 94) return { rarity: 'rare', xp: 60 };         // 14%
  if (roll < 99) return { rarity: 'epic', xp: 150 };        // 5%
  return { rarity: 'legendary', xp: 400 };                  // 1%
}

// ------------------------------------------
// ENDPOINTS
// ------------------------------------------

// 1. CATCH ENDPOINT
app.post('/api/catch', async (req, res) => {
  const { photo, lat, lng, existingCats, uid } = req.body;
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!photo) {
    return res.status(400).json({ error: "Photo is required." });
  }

  // Rate Limiting check
  if (uid) {
    const lastCatchTime = lastCatchActions.get(uid);
    if (lastCatchTime && (Date.now() - lastCatchTime) < CATCH_COOLDOWN_MS) {
      const secondsLeft = Math.ceil((CATCH_COOLDOWN_MS - (Date.now() - lastCatchTime)) / 1000);
      return res.json({
        success: false,
        message: `Slow down! You can catch again in ${secondsLeft} seconds.`
      });
    }
  }

  // Gemini Prompts
  const systemInstruction = `You are a strict image verifier for a real-world cat discovery game. You will be shown a photo taken live from a phone camera. Respond with ONLY valid JSON, no markdown, no preamble, in this exact shape: {"isRealCat": boolean, "isLiveCapture": boolean, "breedGuess": string, "confidence": number between 0 and 1, "distinguishingFeatures": string, "suggestedNickname": string, "reasoning": string}. isRealCat must be false for toys, drawings, cartoons, stuffed animals, or any non-cat animal. isLiveCapture must be false if the image shows signs of being a photo of a screen or printed photo (glare, moire pattern, visible screen bezel, paper texture/edges) rather than a direct live photo of a real cat. distinguishingFeatures should be a short comma-separated description of coat color, pattern, markings, and any unique identifiers (collar, notched ear, etc) useful for re-identifying this specific cat later. suggestedNickname should be a short, fun, fitting name. Be decisive — do not hedge in the reasoning field, keep it to one sentence.`;

  try {
    let result;
    if (!apiKey) {
      console.warn("No GEMINI_API_KEY defined. Running CATCH in Mock Mode.");
      // Simulate Gemini analysis
      result = {
        isRealCat: true,
        isLiveCapture: true,
        breedGuess: "Domestic Shorthair",
        confidence: 0.95,
        distinguishingFeatures: "Grey tabby, white stripes, white socks",
        suggestedNickname: "Grey Socks",
        reasoning: "Verified as a real cat captured in its environment."
      };
    } else {
      result = await callGeminiVision(apiKey, photo, systemInstruction);
    }

    // Validation checks
    if (!result.isRealCat || !result.isLiveCapture) {
      return res.json({
        success: false,
        isRealCat: result.isRealCat,
        isLiveCapture: result.isLiveCapture,
        message: !result.isRealCat 
          ? "Hmm, that doesn't look like a real cat — try again!" 
          : "Screens or printed photos aren't allowed — snap a live cat directly with your camera!"
      });
    }

    // Duplicate Check logic:
    // 1. Proximity check (cats within 200m)
    const vicinityCats = (existingCats || []).filter(cat => {
      if (!cat.lat || !cat.lng) return false;
      const dist = getDistance(lat, lng, cat.lat, cat.lng);
      return dist <= 200;
    });

    let matchedCatId = null;
    if (vicinityCats.length > 0) {
      if (!apiKey) {
        // Mock duplicate check: 35% chance to match the first vicinity cat
        if (Math.random() < 0.35) {
          matchedCatId = vicinityCats[0].id;
        }
      } else {
        const matchRes = await matchDescription(apiKey, result.distinguishingFeatures, vicinityCats);
        if (matchRes !== "none" && matchRes !== "") {
          matchedCatId = matchRes;
        }
      }
    }

    if (matchedCatId) {
      // It's a duplicate sighting (Re-Sight)
      const matchedCat = vicinityCats.find(c => c.id === matchedCatId);
      
      // Adoption Gating Check:
      if (matchedCat && matchedCat.adoptionStatus && matchedCat.adoptionStatus.isAdopted) {
        return res.json({
          success: false,
          action: "blocked",
          message: `This cat has been adopted by ${matchedCat.adoptionStatus.orgName || 'a shelter'}! It is safe and cannot be caught/fed.`
        });
      }

      // Update catch action timestamp
      if (uid) {
        lastCatchActions.set(uid, Date.now());
      }

      return res.json({
        success: true,
        action: "resight",
        xpAwarded: 5,
        matchedCatId,
        nickname: matchedCat ? matchedCat.nickname : result.suggestedNickname,
        breedGuess: result.breedGuess,
        distinguishingFeatures: result.distinguishingFeatures,
        message: `Welcome back, ${matchedCat ? matchedCat.nickname : 'friend'}! Re-sight logged. (+5 XP)`
      });
    } else {
      // It is a new cat! Roll rarity.
      const roll = rollRarity();
      const abuseFlag = checkLocationAbuse(uid, lat, lng, existingCats);
      const xpAwarded = abuseFlag ? 5 : roll.xp;

      // Update catch action timestamp
      if (uid) {
        lastCatchActions.set(uid, Date.now());
      }

      return res.json({
        success: true,
        action: "catch",
        xpAwarded,
        rarity: roll.rarity,
        breedGuess: result.breedGuess,
        distinguishingFeatures: result.distinguishingFeatures,
        suggestedNickname: result.suggestedNickname,
        flaggedLocationReuse: abuseFlag,
        message: abuseFlag
          ? `Caught a new ${roll.rarity.toUpperCase()} cat! Capped at +5 XP due to location reuse.`
          : `Caught a new ${roll.rarity.toUpperCase()} cat! (+${roll.xp} XP)`
      });
    }
  } catch (error) {
    console.error("CATCH error:", error);
    res.status(500).json({ error: "Processing failed: " + error.message });
  }
});

// 2. FEED ENDPOINT
app.post('/api/feed', async (req, res) => {
  const { photo, lat, lng, existingCats, uid } = req.body;
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!photo) {
    return res.status(400).json({ error: "Photo is required." });
  }

  const systemInstruction = `You are a strict image verifier for a real-world cat feeding confirmation feature. You will be shown a photo taken live from a phone camera, claimed to show someone feeding a real cat. Respond with ONLY valid JSON, no markdown, no preamble, in this exact shape: {"isRealCat": boolean, "isLiveCapture": boolean, "hasFoodOrFeedingContext": boolean, "matchedDistinguishingFeatures": string, "reasoning": string}. hasFoodOrFeedingContext must be true ONLY if there is clearly visible food, a food bowl, a hand offering food, or the cat actively eating/drinking in the frame — a photo of just a cat with no food-related context must be false. isLiveCapture follows the same screen/print-detection logic as catch verification. matchedDistinguishingFeatures should describe the cat's coat/markings the same way a catch verification would, to support matching against existing records.`;

  try {
    let result;
    if (!apiKey) {
      console.warn("No GEMINI_API_KEY defined. Running FEED in Mock Mode.");
      result = {
        isRealCat: true,
        isLiveCapture: true,
        hasFoodOrFeedingContext: true,
        matchedDistinguishingFeatures: "Grey tabby, white stripes, white socks",
        reasoning: "Verified cat eating from a bowl."
      };
    } else {
      result = await callGeminiVision(apiKey, photo, systemInstruction);
    }

    // Validation checks
    if (!result.isRealCat || !result.isLiveCapture) {
      return res.json({
        success: false,
        isRealCat: result.isRealCat,
        isLiveCapture: result.isLiveCapture,
        message: !result.isRealCat 
          ? "Hmm, that doesn't look like a real cat — try again!" 
          : "Screens or printed photos aren't allowed — snap a live cat directly with your camera!"
      });
    }

    if (!result.hasFoodOrFeedingContext) {
      return res.json({
        success: false,
        hasFood: false,
        message: "We need to see food or a bowl in the photo to confirm a feeding!"
      });
    }

    // Proximity matching
    const vicinityCats = (existingCats || []).filter(cat => {
      if (!cat.lat || !cat.lng) return false;
      const dist = getDistance(lat, lng, cat.lat, cat.lng);
      return dist <= 200;
    });

    let matchedCatId = null;
    if (vicinityCats.length > 0) {
      if (!apiKey) {
        matchedCatId = vicinityCats[0].id;
      } else {
        const matchRes = await matchDescription(apiKey, result.matchedDistinguishingFeatures, vicinityCats);
        if (matchRes !== "none" && matchRes !== "") {
          matchedCatId = matchRes;
        }
      }
    }

    if (matchedCatId) {
      // Matched existing cat!
      const matchedCat = vicinityCats.find(c => c.id === matchedCatId);

      // Adoption check - Adopted cats cannot be fed!
      if (matchedCat && matchedCat.adoptionStatus && matchedCat.adoptionStatus.isAdopted) {
        return res.json({
          success: false,
          action: "blocked",
          message: `This cat has been adopted by ${matchedCat.adoptionStatus.orgName || 'a shelter'}! It is safe and cannot be caught/fed.`
        });
      }

      // Check feed cooldown map
      if (uid) {
        const feedKey = `${uid}:${matchedCatId}`;
        const lastFeedTime = lastFeedActions.get(feedKey);
        if (lastFeedTime && (Date.now() - lastFeedTime) < FEED_COOLDOWN_MS) {
          return res.json({
            success: false,
            message: "You already fed this cat recently — give it some time before feeding again."
          });
        }
        lastFeedActions.set(feedKey, Date.now());
      }

      return res.json({
        success: true,
        action: "feed",
        xpAwarded: 20,
        matchedCatId,
        nickname: matchedCat ? matchedCat.nickname : "Cat",
        message: `Meal served to ${matchedCat ? matchedCat.nickname : 'Cat'}! (+20 XP)`
      });
    } else {
      // Feeding a new cat! We automatically discovery-catch it first, then feed it.
      // Check catch rate limit
      if (uid) {
        const lastCatchTime = lastCatchActions.get(uid);
        if (lastCatchTime && (Date.now() - lastCatchTime) < CATCH_COOLDOWN_MS) {
          const secondsLeft = Math.ceil((CATCH_COOLDOWN_MS - (Date.now() - lastCatchTime)) / 1000);
          return res.json({
            success: false,
            message: `Slow down! You can catch again in ${secondsLeft} seconds.`
          });
        }
        lastCatchActions.set(uid, Date.now());
      }

      const roll = rollRarity();
      const abuseFlag = checkLocationAbuse(uid, lat, lng, existingCats);
      const discoveryXP = abuseFlag ? 5 : roll.xp;
      const combinedXP = discoveryXP + 20; // discovery XP + feed XP

      return res.json({
        success: true,
        action: "catch_and_feed",
        xpAwarded: combinedXP,
        rarity: roll.rarity,
        breedGuess: "Unknown Breed", // Gemini doesn't return breed Guess in Feed prompt, default it
        distinguishingFeatures: result.matchedDistinguishingFeatures,
        suggestedNickname: "Stray Eater",
        message: abuseFlag
          ? `Discovered and fed a new ${roll.rarity.toUpperCase()} cat! Discovery XP capped at +5 due to location reuse. (+${combinedXP} XP total)`
          : `Discovered and fed a new ${roll.rarity.toUpperCase()} cat! (+${combinedXP} XP)`
      });
    }
  } catch (error) {
    console.error("FEED error:", error);
    res.status(500).json({ error: "Processing failed: " + error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`CatchDex secure backend server running on port ${PORT}`);
});
