// Chrome Storage API wrapper
// 認証状態、設定、キャッシュデータの永続化を管理

import browser from "webextension-polyfill";
import type { pos } from "../types";

// ストレージキー定数
export const STORAGE_KEYS = {
  // 認証関連
  AUTH_TOKEN: "authToken",
  USER_ID: "userId",
  USER_EMAIL: "userEmail",

  // アプリケーション状態
  CURRENT_WORD: "currentWord",
  WORD_CACHE: "wordCache",

  // 設定
  SETTINGS: "settings",
} as const;

// 設定の型定義
export interface ExtensionSettings {
  autoDetect: boolean;
  language: "en" | "ja";
  apiBaseUrl: string;
}

// デフォルト設定
export const DEFAULT_SETTINGS: ExtensionSettings = {
  autoDetect: true,
  language: "ja",
  apiBaseUrl: "http://localhost:8000",
};

// 認証データの型定義
export interface AuthData {
  token: string;
  userId: string;
  email: string;
}

// 単語データのキャッシュエントリ
export interface CachedWordData {
  flashcardId: string;
  word: {
    wordId: string;
    word: string;
    coreMeaning: string;
    explanation: string;
  };
  meanings: Array<{
    meaningId: string;
    pos: pos;
    translation: string;
    pronunciation: string;
    exampleEng: string;
    exampleJpn: string;
  }>;
  media: {
    mediaId: string;
    meaningId: string;
    mediaUrls: string[];
  };
  cachedAt: number;
}

// 現在の単語データ
export interface CurrentWordData {
  word: string;
  data: CachedWordData;
  timestamp: number;
}

// ストレージユーティリティクラス
export class StorageManager {
  // 単一の値を取得
  static async get<T>(key: string): Promise<T | null> {
    try {
      const result = await browser.storage.local.get(key);
      return result[key] || null;
    } catch (error) {
      console.error(`Failed to get storage key ${key}:`, error);
      return null;
    }
  }

  // 複数の値を取得
  static async getMultiple<T extends Record<string, unknown>>(
    keys: string[]
  ): Promise<Partial<T>> {
    try {
      const result = await browser.storage.local.get(keys);
      return result as Partial<T>;
    } catch (error) {
      console.error("Failed to get multiple storage keys:", error);
      return {};
    }
  }

  // 値を設定
  static async set(key: string, value: unknown): Promise<void> {
    try {
      await browser.storage.local.set({ [key]: value });
    } catch (error) {
      console.error(`Failed to set storage key ${key}:`, error);
    }
  }

  // 複数の値を設定
  static async setMultiple(data: Record<string, unknown>): Promise<void> {
    try {
      await browser.storage.local.set(data);
    } catch (error) {
      console.error("Failed to set multiple storage keys:", error);
    }
  }

  // 値を削除
  static async remove(key: string): Promise<void> {
    try {
      await browser.storage.local.remove(key);
    } catch (error) {
      console.error(`Failed to remove storage key ${key}:`, error);
    }
  }

  // 複数の値を削除
  static async removeMultiple(keys: string[]): Promise<void> {
    try {
      await browser.storage.local.remove(keys);
    } catch (error) {
      console.error("Failed to remove multiple storage keys:", error);
    }
  }

  // ストレージをクリア
  static async clear(): Promise<void> {
    try {
      await browser.storage.local.clear();
    } catch (error) {
      console.error("Failed to clear storage:", error);
    }
  }
}

// 認証関連のストレージ操作
export const authStorage = {
  // 認証データを保存
  async setAuthData(authData: AuthData): Promise<void> {
    await StorageManager.setMultiple({
      [STORAGE_KEYS.AUTH_TOKEN]: authData.token,
      [STORAGE_KEYS.USER_ID]: authData.userId,
      [STORAGE_KEYS.USER_EMAIL]: authData.email,
    });
  },

  // 認証データを取得
  async getAuthData(): Promise<AuthData | null> {
    const data = await StorageManager.getMultiple<{
      authToken: string;
      userId: string;
      userEmail: string;
    }>([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_ID,
      STORAGE_KEYS.USER_EMAIL,
    ]);

    if (data.authToken && data.userId && data.userEmail) {
      return {
        token: data.authToken,
        userId: data.userId,
        email: data.userEmail,
      };
    }

    return null;
  },

  // 認証データを削除
  async clearAuthData(): Promise<void> {
    await StorageManager.removeMultiple([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_ID,
      STORAGE_KEYS.USER_EMAIL,
    ]);
  },
};

// 設定関連のストレージ操作
export const settingsStorage = {
  // 設定を取得
  async getSettings(): Promise<ExtensionSettings> {
    const settings = await StorageManager.get<ExtensionSettings>(
      STORAGE_KEYS.SETTINGS
    );
    return { ...DEFAULT_SETTINGS, ...settings };
  },

  // 設定を保存
  async setSettings(settings: Partial<ExtensionSettings>): Promise<void> {
    const currentSettings = await this.getSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    await StorageManager.set(STORAGE_KEYS.SETTINGS, updatedSettings);
  },

  // 設定をリセット
  async resetSettings(): Promise<void> {
    await StorageManager.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  },
};

// 単語キャッシュ関連のストレージ操作
export const wordCacheStorage = {
  // キャッシュ有効期限（1時間）
  CACHE_EXPIRY: 60 * 60 * 1000,

  // 単語データをキャッシュから取得
  async getCachedWord(word: string): Promise<CachedWordData | null> {
    const cache =
      (await StorageManager.get<Record<string, CachedWordData>>(
        STORAGE_KEYS.WORD_CACHE
      )) || {};
    const cachedData = cache[word];

    if (cachedData && Date.now() - cachedData.cachedAt < this.CACHE_EXPIRY) {
      return cachedData;
    }

    return null;
  },

  // 単語データをキャッシュに保存
  async setCachedWord(
    word: string,
    data: Omit<CachedWordData, "cachedAt">
  ): Promise<void> {
    const cache =
      (await StorageManager.get<Record<string, CachedWordData>>(
        STORAGE_KEYS.WORD_CACHE
      )) || {};

    cache[word] = {
      ...data,
      cachedAt: Date.now(),
    };

    await StorageManager.set(STORAGE_KEYS.WORD_CACHE, cache);
  },

  // 期限切れのキャッシュを削除
  async cleanExpiredCache(): Promise<void> {
    const cache =
      (await StorageManager.get<Record<string, CachedWordData>>(
        STORAGE_KEYS.WORD_CACHE
      )) || {};
    const now = Date.now();
    const cleanedCache: Record<string, CachedWordData> = {};

    for (const [word, data] of Object.entries(cache)) {
      if (now - data.cachedAt < this.CACHE_EXPIRY) {
        cleanedCache[word] = data;
      }
    }

    await StorageManager.set(STORAGE_KEYS.WORD_CACHE, cleanedCache);
  },
};

// 現在の単語関連のストレージ操作
export const currentWordStorage = {
  // 現在の単語データを設定
  async setCurrentWord(word: string, data: CachedWordData): Promise<void> {
    const currentWordData: CurrentWordData = {
      word,
      data,
      timestamp: Date.now(),
    };

    await StorageManager.set(STORAGE_KEYS.CURRENT_WORD, currentWordData);
  },

  // 現在の単語データを取得
  async getCurrentWord(): Promise<CurrentWordData | null> {
    return await StorageManager.get<CurrentWordData>(STORAGE_KEYS.CURRENT_WORD);
  },

  // 現在の単語データを削除
  async clearCurrentWord(): Promise<void> {
    await StorageManager.remove(STORAGE_KEYS.CURRENT_WORD);
  },
};

export default StorageManager;
