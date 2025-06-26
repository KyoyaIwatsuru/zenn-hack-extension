// Utility functions for Chrome Extension
// Next.jsアプリのユーティリティをChrome拡張機能用に調整

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { type pos, POS_TRANSLATIONS } from "../types";

// CSS クラス名をマージするユーティリティ（shadcn/ui互換）
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 英単語の検証
export function isValidEnglishWord(word: string): boolean {
  if (!word || typeof word !== "string") return false;

  // 英字のみで構成され、適切な長さの単語
  const wordRegex = /^[a-zA-Z]{1,50}$/;
  return wordRegex.test(word.trim());
}

// テキストから英単語を抽出
export function extractEnglishWords(text: string): string[] {
  if (!text || typeof text !== "string") return [];

  const wordRegex = /\b[a-zA-Z]+\b/g;
  const matches = text.match(wordRegex);

  return matches ? [...new Set(matches.map((word) => word.toLowerCase()))] : [];
}

// URLから英単語を抽出
export function extractWordFromUrl(url: string): string | null {
  if (!url) return null;

  try {
    const urlObj = new URL(url);

    // Google検索のクエリパラメータから単語を抽出
    if (
      urlObj.hostname.includes("google.com") &&
      urlObj.pathname.includes("/search")
    ) {
      const query = urlObj.searchParams.get("q");
      if (query) {
        const words = extractEnglishWords(query);
        return words.length === 1 ? words[0] : null;
      }
    }

    // 辞書サイトのURLパターンから単語を抽出
    const dictionaryPatterns = [
      { host: "cambridge.org", pattern: /\/dictionary\/english\/([a-zA-Z-]+)/ },
      { host: "merriam-webster.com", pattern: /\/dictionary\/([a-zA-Z-]+)/ },
      { host: "dictionary.com", pattern: /\/browse\/([a-zA-Z-]+)/ },
      {
        host: "oxfordlearnersdictionaries.com",
        pattern: /\/definition\/english\/([a-zA-Z-_]+)/,
      },
    ];

    for (const { host, pattern } of dictionaryPatterns) {
      if (urlObj.hostname.includes(host)) {
        const match = urlObj.pathname.match(pattern);
        if (match && match[1]) {
          const word = match[1].replace(/[-_]/g, "");
          return isValidEnglishWord(word) ? word.toLowerCase() : null;
        }
      }
    }
  } catch (error) {
    console.error("Error parsing URL:", error);
  }

  return null;
}

// 品詞を日本語に翻訳
export function translatePartOfSpeech(partOfSpeech: pos): string {
  return POS_TRANSLATIONS[partOfSpeech] || partOfSpeech;
}

// 品詞のスタイルクラスを取得
export function getPartOfSpeechBadgeClass(partOfSpeech: pos): string {
  const baseClasses =
    "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";

  const posStyles: Record<pos, string> = {
    noun: "bg-blue-100 text-blue-800",
    pronoun: "bg-indigo-100 text-indigo-800",
    intransitiveVerb: "bg-green-100 text-green-800",
    transitiveVerb: "bg-emerald-100 text-emerald-800",
    adjective: "bg-yellow-100 text-yellow-800",
    adverb: "bg-purple-100 text-purple-800",
    auxiliaryVerb: "bg-cyan-100 text-cyan-800",
    preposition: "bg-pink-100 text-pink-800",
    article: "bg-teal-100 text-teal-800",
    interjection: "bg-orange-100 text-orange-800",
    conjunction: "bg-red-100 text-red-800",
    idiom: "bg-amber-100 text-amber-800",
  };

  return cn(
    baseClasses,
    posStyles[partOfSpeech] || "bg-gray-100 text-gray-800"
  );
}

// 文字列の切り詰め
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

// 時間の相対表示
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}日前`;
  if (hours > 0) return `${hours}時間前`;
  if (minutes > 0) return `${minutes}分前`;
  return "今";
}

// デバウンス関数
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// スロットル関数
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

// ローカルストレージのセーフアクセス
export function safeLocalStorage() {
  const isAvailable = (() => {
    try {
      const test = "__localStorage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  })();

  return {
    getItem: (key: string): string | null => {
      if (!isAvailable) return null;
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },

    setItem: (key: string, value: string): boolean => {
      if (!isAvailable) return false;
      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },

    removeItem: (key: string): boolean => {
      if (!isAvailable) return false;
      try {
        localStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
  };
}

// 環境変数の取得
export function getEnvVar(key: string): string | undefined {
  return import.meta.env[key];
}

// 開発環境の判定
export function isDevelopment(): boolean {
  return import.meta.env.DEV;
}

// エラーメッセージの整形
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if ((error as { message?: string })?.message) {
    return (error as { message: string }).message;
  }

  return "Unknown error occurred";
}

// オブジェクトの深いマージ
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[Extract<keyof T, string>];
    } else {
      result[key] = sourceValue as T[Extract<keyof T, string>];
    }
  }

  return result;
}

// 配列をチャンクに分割
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// ランダムなIDを生成
export function generateId(prefix: string = ""): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substr(2, 9);
  return `${prefix}${timestamp}${randomStr}`;
}

export default {
  cn,
  isValidEnglishWord,
  extractEnglishWords,
  extractWordFromUrl,
  translatePartOfSpeech,
  getPartOfSpeechBadgeClass,
  truncateText,
  formatRelativeTime,
  debounce,
  throttle,
  safeLocalStorage,
  getEnvVar,
  isDevelopment,
  formatErrorMessage,
  deepMerge,
  chunk,
  generateId,
};
