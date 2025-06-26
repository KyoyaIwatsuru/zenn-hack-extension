// Content Script for Zenn Hack Extension
// 単語検出とバックグラウンドスクリプトとの通信を担当

import browser from "webextension-polyfill";

// 英単語検出の正規表現
const WORD_REGEX = /\b[a-zA-Z]+\b/g;

// URLから英単語を抽出する関数
function extractWordFromURL(): string | null {
  const url = window.location.href;

  // Google検索のクエリパラメータから単語を抽出
  if (url.includes("google.com/search")) {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get("q");
    if (query) {
      const words = query.match(WORD_REGEX);
      return words && words.length === 1 ? words[0] : null;
    }
  }

  // 辞書サイトのURLから単語を抽出
  const dictionaryPatterns = [
    /cambridge\.org\/dictionary\/english\/([a-zA-Z-]+)/,
    /merriam-webster\.com\/dictionary\/([a-zA-Z-]+)/,
    /dictionary\.com\/browse\/([a-zA-Z-]+)/,
  ];

  for (const pattern of dictionaryPatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1].replace(/-/g, "");
    }
  }

  return null;
}

// 選択されたテキストから英単語を抽出する関数
function extractWordFromSelection(): string | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const selectedText = selection.toString().trim();
  const words = selectedText.match(WORD_REGEX);

  // 単一の英単語のみを対象とする
  return words && words.length === 1 ? words[0] : null;
}

// 現在のページから英単語を検出する関数
function detectWord(): string | null {
  // 1. 選択されたテキストから検出
  const selectedWord = extractWordFromSelection();
  if (selectedWord) return selectedWord;

  // 2. URLから検出
  const urlWord = extractWordFromURL();
  if (urlWord) return urlWord;

  return null;
}

// ページロード時とテキスト選択時に単語を検出
function initializeWordDetection() {
  // 初回実行
  const initialWord = detectWord();
  if (initialWord) {
    sendWordToBackground(initialWord);
  }

  // テキスト選択時の検出
  document.addEventListener("mouseup", () => {
    setTimeout(() => {
      const selectedWord = extractWordFromSelection();
      if (selectedWord) {
        sendWordToBackground(selectedWord);
      }
    }, 100); // 選択完了を待つ
  });

  // URLハッシュ変更時の検出（SPA対応）
  window.addEventListener("hashchange", () => {
    const urlWord = extractWordFromURL();
    if (urlWord) {
      sendWordToBackground(urlWord);
    }
  });
}

// バックグラウンドスクリプトに単語を送信
async function sendWordToBackground(word: string) {
  try {
    await browser.runtime.sendMessage({
      type: "WORD_DETECTED",
      word: word.toLowerCase(),
      url: window.location.href,
      timestamp: Date.now(),
    });
    console.log("Word sent to background:", word);
  } catch (error) {
    console.error("Failed to send word to background:", error);
  }
}

// メッセージタイプの定義
interface GetCurrentWordMessage {
  type: "GET_CURRENT_WORD";
}

// バックグラウンドスクリプトからのメッセージを受信
browser.runtime.onMessage.addListener(
  (
    message: GetCurrentWordMessage,
    _sender,
    sendResponse: (response?: unknown) => void
  ) => {
    if (message.type === "GET_CURRENT_WORD") {
      const currentWord = detectWord();
      sendResponse({ word: currentWord });
    }
  }
);

// 初期化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeWordDetection);
} else {
  initializeWordDetection();
}

console.log("Zenn Hack Extension content script loaded");
