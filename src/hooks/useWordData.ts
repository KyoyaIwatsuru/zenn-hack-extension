// Word data management hook for Chrome Extension
// 単語データの取得・管理・キャッシュを行うカスタムフック

import { useState, useEffect, useCallback } from "react";
import { type CurrentWordData } from "@/types";
import { currentWordStorage, wordCacheStorage } from "@/lib/storage";
import browser from "webextension-polyfill";

export interface UseWordDataReturn {
  currentWordData: CurrentWordData | null;
  isLoading: boolean;
  error: string | null;
  fetchWordData: (word: string) => Promise<void>;
  addWordToCollection: (flashcardId: string) => Promise<boolean>;
  clearCurrentWord: () => Promise<void>;
  clearError: () => void;
  refreshCurrentWord: () => Promise<void>;
}

export function useWordData(): UseWordDataReturn {
  const [currentWord, setCurrentWord] = useState<CurrentWordData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // エラーをクリア
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 現在の単語データを読み込み
  const loadCurrentWord = useCallback(async () => {
    try {
      const wordData = await currentWordStorage.getCurrentWord();
      setCurrentWord(wordData);
    } catch (error) {
      console.error("Failed to load current word:", error);
    }
  }, []);

  // 初期化時に現在の単語データを読み込み
  useEffect(() => {
    loadCurrentWord();
  }, [loadCurrentWord]);

  // バックグラウンドスクリプトから現在の単語データを取得
  const refreshCurrentWord = useCallback(async () => {
    try {
      const response = await browser.runtime.sendMessage({
        type: "GET_CURRENT_WORD_DATA",
      });

      if (response) {
        setCurrentWord(response);
      } else {
        setCurrentWord(null);
      }
    } catch (error) {
      console.error("Failed to refresh current word:", error);
      setError("単語データの更新に失敗しました");
    }
  }, []);

  // 単語データを取得
  const fetchWordData = useCallback(
    async (word: string) => {
      if (!word || !word.trim()) {
        setError("有効な単語を入力してください");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // まずキャッシュから確認
        const cachedData = await wordCacheStorage.getCachedWord(
          word.toLowerCase()
        );
        if (cachedData) {
          const wordData: CurrentWordData = {
            word: word.toLowerCase(),
            data: cachedData,
            timestamp: Date.now(),
          };

          await currentWordStorage.setCurrentWord(
            word.toLowerCase(),
            cachedData
          );
          setCurrentWord(wordData);
          return;
        }

        // バックグラウンドスクリプトに単語検出を通知
        await browser.runtime.sendMessage({
          type: "WORD_DETECTED",
          word: word.toLowerCase(),
          url: window.location?.href || "",
          timestamp: Date.now(),
        });

        // 少し待ってからデータを確認
        setTimeout(async () => {
          await refreshCurrentWord();
        }, 1000);
      } catch (error: unknown) {
        console.error("Fetch word data error:", error);
        setError(
          (error as { message?: string })?.message ||
            "単語データの取得に失敗しました"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [refreshCurrentWord]
  );

  // 単語をコレクションに追加
  const addWordToCollection = useCallback(
    async (flashcardId: string): Promise<boolean> => {
      if (!flashcardId) {
        setError("フラッシュカードIDが必要です");
        return false;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await browser.runtime.sendMessage({
          type: "ADD_FLASHCARD",
          flashcardId,
        });

        if (response?.success) {
          return true;
        } else {
          setError("単語の追加に失敗しました");
          return false;
        }
      } catch (error: unknown) {
        console.error("Add word to collection error:", error);

        const errorMessage = (error as { message?: string })?.message || "";
        if (errorMessage.includes("Authentication")) {
          setError("ログインが必要です");
        } else {
          setError(errorMessage || "単語の追加に失敗しました");
        }

        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // 現在の単語をクリア
  const clearCurrentWord = useCallback(async () => {
    try {
      await currentWordStorage.clearCurrentWord();
      setCurrentWord(null);
      setError(null);
    } catch (error) {
      console.error("Failed to clear current word:", error);
    }
  }, []);

  // バックグラウンドスクリプトからのメッセージを監視
  useEffect(() => {
    const handleMessage = (message: { type: string }) => {
      if (message.type === "WORD_DATA_UPDATED") {
        loadCurrentWord();
      }
    };

    // メッセージリスナーを追加
    browser.runtime.onMessage.addListener(handleMessage);

    return () => {
      // クリーンアップ
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, [loadCurrentWord]);

  return {
    currentWordData: currentWord,
    isLoading,
    error,
    fetchWordData,
    addWordToCollection,
    clearCurrentWord,
    clearError,
    refreshCurrentWord,
  };
}
