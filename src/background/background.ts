// Background Script for Zenn Hack Extension
// API呼び出し、認証管理、ストレージ管理を担当

import browser from "webextension-polyfill";
import type { pos } from "../types";

// API設定
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// ストレージキー
const STORAGE_KEYS = {
  AUTH_TOKEN: "authToken",
  USER_ID: "userId",
  CURRENT_WORD: "currentWord",
  WORD_CACHE: "wordCache",
} as const;

// 型定義
interface WordDetectedMessage {
  type: "WORD_DETECTED";
  word: string;
  url: string;
  timestamp: number;
}

interface WordData {
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
}

interface StoredWordData extends WordData {
  cachedAt: number;
}

// キャッシュの有効期限（1時間）
const CACHE_EXPIRY = 60 * 60 * 1000;

// 認証トークンを取得
async function getAuthToken(): Promise<string | null> {
  try {
    const result = await browser.storage.local.get(STORAGE_KEYS.AUTH_TOKEN);
    return result[STORAGE_KEYS.AUTH_TOKEN] || null;
  } catch (error) {
    console.error("Failed to get auth token:", error);
    return null;
  }
}

// 認証トークンを保存
async function setAuthToken(token: string): Promise<void> {
  try {
    await browser.storage.local.set({ [STORAGE_KEYS.AUTH_TOKEN]: token });
  } catch (error) {
    console.error("Failed to set auth token:", error);
  }
}

// ユーザーIDを取得
async function getUserId(): Promise<string | null> {
  try {
    const result = await browser.storage.local.get(STORAGE_KEYS.USER_ID);
    return result[STORAGE_KEYS.USER_ID] || null;
  } catch (error) {
    console.error("Failed to get user ID:", error);
    return null;
  }
}

// 単語データをキャッシュから取得
async function getCachedWordData(word: string): Promise<WordData | null> {
  try {
    const result = await browser.storage.local.get(STORAGE_KEYS.WORD_CACHE);
    const cache = result[STORAGE_KEYS.WORD_CACHE] || {};
    const cachedData: StoredWordData = cache[word];

    if (cachedData && Date.now() - cachedData.cachedAt < CACHE_EXPIRY) {
      console.log("Retrieved word from cache:", word);
      return cachedData;
    }

    return null;
  } catch (error) {
    console.error("Failed to get cached word data:", error);
    return null;
  }
}

// 単語データをキャッシュに保存
async function setCachedWordData(word: string, data: WordData): Promise<void> {
  try {
    const result = await browser.storage.local.get(STORAGE_KEYS.WORD_CACHE);
    const cache = result[STORAGE_KEYS.WORD_CACHE] || {};

    cache[word] = {
      ...data,
      cachedAt: Date.now(),
    };

    await browser.storage.local.set({ [STORAGE_KEYS.WORD_CACHE]: cache });
    console.log("Cached word data:", word);
  } catch (error) {
    console.error("Failed to cache word data:", error);
  }
}

// APIから単語データを取得
async function fetchWordData(word: string): Promise<WordData | null> {
  try {
    // キャッシュから取得を試行
    const cachedData = await getCachedWordData(word);
    if (cachedData) {
      return cachedData;
    }

    const response = await fetch(
      `${API_BASE_URL}/word/${encodeURIComponent(word)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(
        "API request failed:",
        response.status,
        response.statusText
      );
      return null;
    }

    const data: WordData = await response.json();

    // キャッシュに保存
    await setCachedWordData(word, data);

    console.log("Fetched word data from API:", word);
    return data;
  } catch (error) {
    console.error("Failed to fetch word data:", error);
    return null;
  }
}

// フラッシュカードをユーザーのコレクションに追加
async function addFlashcardToUser(flashcardId: string): Promise<boolean> {
  try {
    const authToken = await getAuthToken();
    const userId = await getUserId();

    if (!authToken || !userId) {
      console.error("Authentication required to add flashcard");
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/user/add/usingFlashcard`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        userId,
        flashcardId,
      }),
    });

    if (!response.ok) {
      console.error(
        "Failed to add flashcard:",
        response.status,
        response.statusText
      );
      return false;
    }

    console.log("Successfully added flashcard to user collection");
    return true;
  } catch (error) {
    console.error("Failed to add flashcard to user:", error);
    return false;
  }
}

// 現在の単語を設定
async function setCurrentWord(word: string, data: WordData): Promise<void> {
  try {
    await browser.storage.local.set({
      [STORAGE_KEYS.CURRENT_WORD]: {
        word,
        data,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error("Failed to set current word:", error);
  }
}

// メッセージタイプの定義
interface MessageHandler {
  type: string;
  [key: string]: unknown;
}

interface AddFlashcardMessage extends MessageHandler {
  type: "ADD_FLASHCARD";
  flashcardId: string;
}

interface SetAuthDataMessage extends MessageHandler {
  type: "SET_AUTH_DATA";
  token: string;
  userId: string;
}

// コンテンツスクリプトからのメッセージを処理
browser.runtime.onMessage.addListener(
  (
    message: MessageHandler,
    _sender,
    sendResponse: (response?: unknown) => void
  ) => {
    console.log("Background received message:", message);

    if (message.type === "WORD_DETECTED") {
      (async () => {
        const wordMessage = message as unknown as WordDetectedMessage;
        const wordData = await fetchWordData(wordMessage.word);

        if (wordData) {
          await setCurrentWord(wordMessage.word, wordData);
          console.log("Word data processed and stored:", wordMessage.word);
        }
      })();
      return; // レスポンス不要
    }

    if (message.type === "GET_CURRENT_WORD_DATA") {
      (async () => {
        try {
          const result = await browser.storage.local.get(
            STORAGE_KEYS.CURRENT_WORD
          );
          const currentWordData = result[STORAGE_KEYS.CURRENT_WORD];
          sendResponse(currentWordData || null);
        } catch (error) {
          console.error("Failed to get current word data:", error);
          sendResponse(null);
        }
      })();
      return true; // 非同期レスポンスを使用
    }

    if (message.type === "ADD_FLASHCARD") {
      (async () => {
        const addMessage = message as unknown as AddFlashcardMessage;
        const success = await addFlashcardToUser(addMessage.flashcardId);
        sendResponse({ success });
      })();
      return true; // 非同期レスポンスを使用
    }

    if (message.type === "SET_AUTH_DATA") {
      (async () => {
        const authMessage = message as unknown as SetAuthDataMessage;
        await setAuthToken(authMessage.token);
        await browser.storage.local.set({
          [STORAGE_KEYS.USER_ID]: authMessage.userId,
        });
        sendResponse({ success: true });
      })();
      return true; // 非同期レスポンスを使用
    }

    if (message.type === "GET_AUTH_DATA") {
      (async () => {
        const authToken = await getAuthToken();
        const userId = await getUserId();
        sendResponse({ authToken, userId });
      })();
      return true; // 非同期レスポンスを使用
    }
  }
);

// 拡張機能アクションクリック時の処理
browser.action.onClicked.addListener(async (tab) => {
  // ポップアップが定義されている場合は、この処理は実行されない
  console.log("Extension action clicked for tab:", tab.id);
});

// 拡張機能インストール/アップデート時の処理
browser.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed/updated:", details.reason);

  if (details.reason === "install") {
    // 初回インストール時の処理
    console.log("Welcome to Zenn Hack Extension!");
  }
});

console.log("Zenn Hack Extension background script loaded");
