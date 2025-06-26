// API client for FastAPI backend
// Next.jsアプリのHTTPクライアントを基にChrome拡張機能用に調整

import browser from "webextension-polyfill";

const API_BASE_URL = process.env.VITE_API_BASE_URL || "http://localhost:8000";

// HTTPクライアントクラス
export class ApiClient {
  private baseUrl: string;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(
    baseUrl: string = API_BASE_URL,
    retryAttempts: number = 3,
    retryDelay: number = 1000
  ) {
    this.baseUrl = baseUrl;
    this.retryAttempts = retryAttempts;
    this.retryDelay = retryDelay;
  }

  // 認証トークンを取得
  private async getAuthToken(): Promise<string | null> {
    try {
      const result = await browser.storage.local.get("authToken");
      return result.authToken || null;
    } catch (error) {
      console.error("Failed to get auth token:", error);
      return null;
    }
  }

  // HTTPリクエストを実行
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const authToken = await this.getAuthToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    let lastError: Error;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, config);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Request attempt ${attempt} failed:`, error);

        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    throw lastError!;
  }

  // 遅延ユーティリティ
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // GETリクエスト
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", ...options });
  }

  // POSTリクエスト
  async post<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  // PUTリクエスト
  async put<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  // DELETEリクエスト
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE", ...options });
  }
}

// デフォルトAPIクライアントインスタンス
export const apiClient = new ApiClient();

// API型定義
export interface WordData {
  flashcardId: string;
  word: {
    wordId: string;
    word: string;
    coreMeaning: string;
    explanation: string;
  };
  meanings: Array<{
    meaningId: string;
    pos: string;
    translation: string;
    pronunciation: string;
    exampleEng: string;
    exampleJpn: string;
  }>;
  media: {
    mediaId: string;
    imageUrl?: string;
    videoUrl?: string;
  };
}

export interface AddFlashcardRequest {
  userId: string;
  flashcardId: string;
}

export interface AddFlashcardResponse {
  success: boolean;
  message?: string;
}

// API関数
export const wordApi = {
  // 単語情報を取得
  async getWord(word: string): Promise<WordData> {
    return apiClient.get<WordData>(`/word/${encodeURIComponent(word)}`);
  },

  // フラッシュカードをユーザーのコレクションに追加
  async addFlashcard(
    userId: string,
    flashcardId: string
  ): Promise<AddFlashcardResponse> {
    return apiClient.post<AddFlashcardResponse>("/user/add/usingFlashcard", {
      userId,
      flashcardId,
    });
  },
};

export default apiClient;
