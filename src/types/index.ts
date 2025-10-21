// User data type
export interface User {
  id: string;
  username: string;
  password: string;
  isOnline: boolean;
  friends: string[]; // List of friend IDs
  savedScripts: string[]; // List of saved script IDs
  collectedScripts?: CollectedScript[]; // Collected game scripts
  chatHistory: { [friendId: string]: ChatMessage[] };
  gameHistory: GameRecord[];
  // Friends to whom I grant my speaking style authorization (for use as "my style" AI NPCs in their games)
  styleGrantsTo?: string[];
  purchasedScripts?: string[]; // List of purchased script IDs (can coexist with savedScripts)
  balance?: number; // Account balance (script store simulation)
}

// Collected script type
export interface CollectedScript {
  id: string;
  originalScriptId: string;
  originalGameId: string;
  title: string;
  rounds: number;
  background: string;
  characters: Character[];
  roundContents: RoundContent[];
  plotRequirement: string;
  personalScripts?: { [characterId: string]: PersonalScript }; // Personal script data
  collectedAt: number;
  collectedBy: string;
  // Derivative creation chain (for determining originality)
  rootOriginalScriptId?: string; // Initial original script ID (equals originalScriptId if self-original)
  originalAuthorId?: string; // Initial original author ID
  derivativeOfScriptId?: string; // Direct source script ID (previous generation)
  // Derivative creation history (stores only incremental metadata, no full text duplication)
  remixHistory?: RemixHistoryEntry[];
}

export interface RemixHistoryEntry {
  at: number; // Timestamp
  instructions: string; // User instructions
  changedRounds?: number[]; // Round numbers that were modified
  changedCharacters?: string[]; // Set of character IDs that were modified
  titleChanged?: boolean;
  backgroundChanged?: boolean;
}

// AI NPC character types
export type AICharacterType = 
  | 'logical'      // Logical analytical type
  | 'exploratory'  // Exploratory adventurous type
  | 'mysterious'   // Mysterious enigmatic type
  | 'social'       // Socially active type
  | 'suspicious'   // Suspicious cautious type
  | 'emotional'    // Emotionally rich type
  | 'calm';        // Calm composed type

// Chat message
export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: number;
  type: 'text' | 'script_share';
  scriptId?: string; // If sharing a script
}

// Room data type
export interface Room {
  id: string;
  name: string;
  hostId: string;
  isOnline: boolean;
  players: string[]; // List of player IDs
  maxPlayers: number;
  scriptId?: string; // Current script ID in use
  gameId?: string; // Current game ID
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
}

// Script data type
export interface Script {
  id: string;
  title: string;
  rounds: number;
  background: string;
  characters: Character[]; // Character list
  roundContents: RoundContent[];
  rawImportedText?: string; // Original imported merged text (for further processing or regeneration)
  plotRequirement?: string; // If present during import phase
  // Optional extension fields (external aggregated import generation)
  finalResolution?: string;
  mechanics?: string;
  recommendedPlayerCount?: number; // Recommended number of human players
  allowNPCFill?: boolean; // Whether AI substitution is allowed
  npcSuggestion?: {
    needNPC: boolean;
    minHumanPlayers: number;
    maxNPC: number;
    reason?: string;
  } | null;
  createdAt: number;
  createdBy: string; // Creator ID
  // Derivative creation related
  rootOriginalScriptId?: string; // Initial original script ID (self or initial source)
  originalAuthorId?: string; // Initial original author ID
  derivativeOfScriptId?: string; // Direct source script ID (if derivative work)
  // Rating aggregation (can be calculated in real-time, but stored as cache to reduce traversal)
  averageRating?: number;
  ratingCount?: number;
  // Store related
  isListedForSale?: boolean;
  price?: number; // Price (only original author can set)
}

// Character information
export interface Character {
  id: string;
  name: string;
  identity: string; // Identity/profession
  personality: string; // Personality traits
  isMainCharacter: boolean; // Whether it's a main character
}

export interface RoundContent {
  round: number;
  plot: string; // Plot for this round
  privateClues: { [characterId: string]: string }; // Private clues for each character
}
// AI NPC configuration
export interface AINPCConfig {
  id: string;
  name: string;
  style: string; // NPC style description
  personality: string; // Personality traits
  isActive: boolean;
  type?: string; // AI type
  characterId?: string; // Assigned character ID
  characterName?: string; // Assigned character name
  friendStyleOfUserId?: string; // If friend-style AI, mark source friend
}

// Script rating record
export interface ScriptRatingRecord {
  id: string; // rating_${scriptId}_${userId}
  scriptId: string;
  userId: string;
  rating: number; // 0-5
  ratedAt: number;
}

// Personal script content
export interface PersonalScript {
  characterId: string;
  personalBackground: string;
  personalRoundContents: PersonalRoundContent[];
}

export interface PersonalRoundContent {
  round: number;
  personalPlot: string;
  hiddenInfo: string;
}

// Game record
export interface GameRecord {
  id: string;
  roomId: string;
  scriptId: string;
  hostId: string;
  players: string[]; // Human player IDs
  aiNPCs: AINPCConfig[]; // AI NPC configuration
  playerCharacters: { [playerId: string]: string }; // Player character assignment playerId -> characterId
  aiCharacters: { [aiId: string]: string }; // AI character assignment aiId -> characterId
  personalScripts: { [characterId: string]: PersonalScript }; // Personal script for each character
  readyPlayers?: string[]; // List of ready player IDs
  plotRequirement: string; // Plot requirement
  rounds: number; // Number of rounds
  scriptBackground: string;
  roundRecords: RoundRecord[];
  status: 'preparing' | 'story_reading' | 'round_playing' | 'finished';
  createdAt: number;
  finishedAt?: number;
  finalSummary?: { [playerId: string]: GameSummary };
  endConfirmedPlayers?: string[]; // List of player IDs who confirmed game end
}

export interface RoundRecord {
  round: number;
  plot: string;
  privateClues: { [playerId: string]: string };
  messages: GameMessage[];
  isFinished: boolean;
  summary?: string;
}

export interface GameMessage {
  id: string;
  senderId: string; // Player ID or NPC ID
  senderName: string;
  content: string;
  timestamp: number;
  isNPC: boolean;
}

// Game summary
export interface GameSummary {
  playerId: string;
  storyReview: string; // Story review
  plotAnalysis: string; // Exciting plot analysis
  storyElevation: string; // Story elevation
  playerAnalysis: { [playerId: string]: PlayerAnalysis };
}

export interface PlayerAnalysis {
  playerId: string;
  playerName: string;
  viewpointSummary: string; // Viewpoint summary
  plotRelatedComment: string; // Plot-related commentary
  styleComment: string; // Speaking style commentary and praise
}

// LLM API related types
export interface LLMRequest {
  contents: {
    parts: {
      text: string;
    }[];
  }[];
}

export interface LLMResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
}

// LLM invocation context
export interface LLMContext {
  type: 'generate_script' | 'npc_decision' | 'round_decision' | 'final_summary';
  gameRecord?: GameRecord;
  plotRequirement?: string;
  rounds?: number;
  currentRound?: number;
  playerId?: string;
}
