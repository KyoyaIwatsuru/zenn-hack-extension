// Next.jsアプリと共通の型定義
export type pos =
  | "noun"
  | "pronoun"
  | "intransitiveVerb"
  | "transitiveVerb"
  | "adjective"
  | "adverb"
  | "auxiliaryVerb"
  | "preposition"
  | "article"
  | "interjection"
  | "conjunction"
  | "idiom";

export type GenerationType =
  | "text-to-image"
  | "image-to-image"
  | "text-to-video"
  | "image-to-video";

export type User = {
  userId: string;
  userName: string;
  email: string;
};

export type Word = {
  wordId: string;
  word: string;
  coreMeaning: string;
  explanation: string;
};

export type Meaning = {
  meaningId: string;
  pos: pos;
  translation: string;
  pronunciation: string;
  exampleEng: string;
  exampleJpn: string;
};

export type Media = {
  mediaId: string;
  meaningId: string;
  mediaUrls: string[];
};

export type Flashcard = {
  flashcardId: string;
  word: Word;
  meanings: Meaning[];
  media: Media;
  version: number;
  memo: string;
  checkFlag: boolean;
};

export type Comparison = {
  comparisonId: string;
  flashcardId: string;
  newMediaId: string;
  newMediaUrls: string[];
};

export type Template = {
  templateId: string;
  generationType: GenerationType;
  target: string;
  preText: string;
};

// API Request/Response types
export type CheckFlagUpdateRequest = {
  flashcardId: string;
  checkFlag: boolean;
};

export type MemoUpdateRequest = {
  flashcardId: string;
  memo: string;
};

export type UsingMeaningListUpdateRequest = {
  flashcardId: string;
  usingMeaningIdList: string[];
};

export type MediaCreateRequest = {
  flashcardId: string;
  oldMediaId: string;
  meaningId: string;
  pos: pos;
  word: string;
  translation: string;
  exampleJpn: string;
  explanation: string;
  coreMeaning: string | null;
  generationType: GenerationType;
  templateId: string;
  userPrompt: string;
  otherSettings: string[] | null;
  allowGeneratingPerson: boolean;
  inputMediaUrls: string[] | null;
};

export type ComparisonUpdateRequest = {
  flashcardId: string;
  comparisonId: string;
  oldMediaId: string;
  newMediaId: string;
  isSelectedNew: boolean;
};

// Base API Response types
export type BaseApiResponse = {
  message: string;
};

// Specific response data types
export type FlashcardData = {
  flashcards: Flashcard[];
};

export type MediaCreateData = {
  comparisonId: string;
  newMediaId: string;
  newMediaUrls: string[];
};

export type ComparisonData = {
  comparisons: Comparison[];
};

export type MeaningData = {
  meanings: Meaning[];
};

export type TemplateData = {
  templates: Template[];
};

// UI types (UI コンポーネント用)
export type MediaCreateResult = {
  status: "idle" | "loading" | "success" | "error";
  error?: string;
};

// Chrome Extension 固有の型定義
export interface ExtensionMessage {
  type: string;
  [key: string]: unknown;
}

export interface WordDetectedMessage extends ExtensionMessage {
  type: "WORD_DETECTED";
  word: string;
  url: string;
  timestamp: number;
}

export interface CurrentWordMessage extends ExtensionMessage {
  type: "GET_CURRENT_WORD_DATA";
}

export interface AddFlashcardMessage extends ExtensionMessage {
  type: "ADD_FLASHCARD";
  flashcardId: string;
}

export interface AuthDataMessage extends ExtensionMessage {
  type: "SET_AUTH_DATA" | "GET_AUTH_DATA";
  token?: string;
  userId?: string;
}

// ストレージの型定義
export interface ExtensionSettings {
  autoDetect: boolean;
  language: "en" | "ja";
  apiBaseUrl: string;
}

export interface AuthData {
  token: string;
  userId: string;
  email: string;
}

export interface CachedWordData {
  flashcardId: string;
  word: Word;
  meanings: Meaning[];
  media: Media;
  cachedAt: number;
}

export interface CurrentWordData {
  word: string;
  data: CachedWordData;
  timestamp: number;
}

// 認証フォームの型定義
export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

// エラーハンドリングの型定義
export interface ExtensionError {
  code: string;
  message: string;
  details?: unknown;
}

export type ErrorCode =
  | "AUTH_REQUIRED"
  | "NETWORK_ERROR"
  | "API_ERROR"
  | "STORAGE_ERROR"
  | "WORD_NOT_FOUND"
  | "INVALID_WORD"
  | "PERMISSION_DENIED";

// ユーティリティ型
export type Maybe<T> = T | null | undefined;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// 品詞の日本語翻訳
export const POS_TRANSLATIONS: Record<pos, string> = {
  noun: "名詞",
  pronoun: "代名詞",
  intransitiveVerb: "自動詞",
  transitiveVerb: "他動詞",
  adjective: "形容詞",
  adverb: "副詞",
  auxiliaryVerb: "助動詞",
  preposition: "前置詞",
  article: "冠詞",
  interjection: "感嘆詞",
  conjunction: "接続詞",
  idiom: "イディオム",
};
