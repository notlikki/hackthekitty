import type { Cat } from './firebase';

export interface CatchAPIResponse {
  success: boolean;
  message?: string;
  isRealCat?: boolean;
  isLiveCapture?: boolean;
  action?: 'resight' | 'catch' | 'blocked';
  xpAwarded?: number;
  matchedCatId?: string;
  nickname?: string;
  breedGuess?: string;
  distinguishingFeatures?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  suggestedNickname?: string;
  flaggedLocationReuse?: boolean;
  error?: string;
}

export interface FeedAPIResponse {
  success: boolean;
  message?: string;
  isRealCat?: boolean;
  isLiveCapture?: boolean;
  hasFood?: boolean;
  action?: 'feed' | 'catch_and_feed' | 'blocked';
  xpAwarded?: number;
  matchedCatId?: string;
  nickname?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  breedGuess?: string;
  distinguishingFeatures?: string;
  suggestedNickname?: string;
  error?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005';

export async function catchCat(
  photoBase64: string,
  lat: number,
  lng: number,
  existingCats: Cat[],
  uid: string
): Promise<CatchAPIResponse> {
  const response = await fetch(`${API_BASE_URL}/api/catch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      photo: photoBase64,
      lat,
      lng,
      existingCats,
      uid,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    return {
      success: false,
      message: `Server returned error status ${response.status}`,
      error: errText,
    };
  }

  return response.json();
}

export async function feedCat(
  photoBase64: string,
  lat: number,
  lng: number,
  existingCats: Cat[],
  uid: string
): Promise<FeedAPIResponse> {
  const response = await fetch(`${API_BASE_URL}/api/feed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      photo: photoBase64,
      lat,
      lng,
      existingCats,
      uid,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    return {
      success: false,
      message: `Server returned error status ${response.status}`,
      error: errText,
    };
  }

  return response.json();
}
