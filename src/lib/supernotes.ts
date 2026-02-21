/**
 * Supernotes API Client
 * 
 * API Documentation: https://help.supernotes.app/en/articles/5257176-api-access
 */

export interface SupernotesCollection {
  id: string;
  spec: {
    pre_id?: string;
    [key: string]: any;
  };
  view: any;
  created_when: string;
  modified_when: string;
  order?: string;
}

export interface SupernotesCard {
  id: string;
  name: string;
  markup: string;
  html: string;
  created_when: string;
  modified_when: string;
  tags?: string[];
  color?: string;
  status?: string;
}

export interface SupernotesResponse {
  cards: SupernotesCard[];
  total: number;
}

const SUPERNOTES_API_BASE = 'https://api.supernotes.app';

/**
 * Fetch cards from Supernotes API
 */
/**
 * Fetch collections from Supernotes API
 */
export async function fetchSupernotesCollections(apiKey: string): Promise<SupernotesCollection[]> {
  try {
    const response = await fetch(`${SUPERNOTES_API_BASE}/v1/collections`, {
      method: 'GET',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch collections: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching collections:', error);
    throw error;
  }
}

/**
 * Fetch cards from Supernotes API
 */
export async function fetchSupernotesCards(apiKey: string): Promise<SupernotesCard[]> {
  try {
    // Supernotes API uses POST for querying cards
    console.log('[Supernotes] Calling API:', `${SUPERNOTES_API_BASE}/v1/cards/get/select`);
    
    const requestBody: any = {
      limit: 100,
    };
    
    const response = await fetch(`${SUPERNOTES_API_BASE}/v1/cards/get/select`, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[Supernotes] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Supernotes] Error response:', errorText);
      throw new Error(`Supernotes API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[Supernotes] Received data structure:', Object.keys(data).length, 'cards');
    
    // API returns object with card IDs as keys, convert to array
    let cardsArray = Object.values(data).map((item: any) => ({
      id: item.data.id,
      name: item.data.name,
      markup: item.data.markup,
      html: item.data.html,
      created_when: item.data.created_when,
      modified_when: item.data.modified_when,
      tags: item.data.tags || [],
      color: item.data.color,
    }));
    
    // Log all cards with their tags for debugging
    console.log('[Supernotes] All cards:', cardsArray.map(c => ({ name: c.name, tags: c.tags })));
    
    // Only exclude junk/tasks/thoughts - show everything else
    cardsArray = cardsArray.filter(card => {
      const isJunk = card.tags.some(tag => 
        tag.toLowerCase() === 'junk' || 
        tag.toLowerCase() === 'tasks' ||
        tag.toLowerCase() === 'thoughts'
      );
      return !isJunk;
    });
    
    console.log('[Supernotes] After filtering:', cardsArray.length, 'cards');
    
    return cardsArray;
  } catch (error) {
    console.error('[Supernotes] Error fetching cards:', error);
    throw error;
  }
}

/**
 * Create a new card in Supernotes
 */
export async function createSupernotesCard(
  apiKey: string, 
  name: string, 
  markup: string,
  tags?: string[]
): Promise<SupernotesCard> {
  try {
    const response = await fetch(`${SUPERNOTES_API_BASE}/v1/cards`, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        markup,
        tags,
      }),
    });

    if (!response.ok) {
      throw new Error(`Supernotes API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating Supernotes card:', error);
    throw error;
  }
}

/**
 * Filter cards by tag or prefix
 */
export function filterCardsByPrefix(cards: SupernotesCard[], prefix: string): SupernotesCard[] {
  return cards.filter(card => 
    card.name.startsWith(prefix) || 
    (card.tags && card.tags.some(tag => tag.toLowerCase().includes(prefix.toLowerCase())))
  );
}

/**
 * Group cards by category (REF, FEAT, FIX, etc.)
 */
export function groupCardsByCategory(cards: SupernotesCard[]): Record<string, SupernotesCard[]> {
  const categories: Record<string, SupernotesCard[]> = {
    REF: [],
    FEAT: [],
    FIX: [],
    OTHER: [],
  };

  cards.forEach(card => {
    if (card.name.startsWith('REF:')) {
      categories.REF.push(card);
    } else if (card.name.startsWith('FEAT:')) {
      categories.FEAT.push(card);
    } else if (card.name.startsWith('FIX:')) {
      categories.FIX.push(card);
    } else {
      categories.OTHER.push(card);
    }
  });

  return categories;
}
