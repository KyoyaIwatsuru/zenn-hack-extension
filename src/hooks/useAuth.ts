// Authentication hook for Chrome Extension
// Firebase認証の状態管理と操作を提供するカスタムフック

import { useState, useEffect, useCallback } from "react";
import {
  signIn,
  signUp,
  signOutUser,
  getCurrentUser,
  getIdToken,
  onAuthStateChange,
  type AuthUser,
} from "@/lib/firebase";
import { authStorage } from "@/lib/storage";
import browser from "webextension-polyfill";

export interface UseAuthReturn {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // エラーをクリア
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 認証状態をバックグラウンドスクリプトに送信
  const syncAuthWithBackground = useCallback(
    async (authUser: AuthUser | null) => {
      try {
        if (authUser) {
          const token = await getIdToken();
          if (token) {
            await browser.runtime.sendMessage({
              type: "SET_AUTH_DATA",
              token,
              userId: authUser.uid,
            });
          }
        } else {
          await browser.runtime.sendMessage({
            type: "SET_AUTH_DATA",
            token: null,
            userId: null,
          });
        }
      } catch (error) {
        console.error("Failed to sync auth with background:", error);
      }
    },
    []
  );

  // 初期化時の認証状態確認
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initializeAuth = async () => {
      try {
        setIsLoading(true);

        // Firebase認証状態の監視を開始
        unsubscribe = onAuthStateChange(async (authUser) => {
          setUser(authUser);
          await syncAuthWithBackground(authUser);

          // Chrome Storageに認証データを保存
          if (authUser) {
            const token = await getIdToken();
            if (token) {
              await authStorage.setAuthData({
                token,
                userId: authUser.uid,
                email: authUser.email || "",
              });
            }
          } else {
            await authStorage.clearAuthData();
          }
        });

        // 既存の認証状態を確認
        const currentUser = getCurrentUser();
        if (currentUser) {
          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
          });
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setError("認証の初期化に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // クリーンアップ
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [syncAuthWithBackground]);

  // サインイン
  const handleSignIn = useCallback(
    async (email: string, password: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const authUser = await signIn(email, password);
        const token = await getIdToken();

        if (token) {
          // Chrome Storageに保存
          await authStorage.setAuthData({
            token,
            userId: authUser.uid,
            email: authUser.email || "",
          });

          // バックグラウンドスクリプトに通知
          await syncAuthWithBackground(authUser);
        }

        setUser(authUser);
      } catch (error: unknown) {
        console.error("Sign in error:", error);
        setError(getFirebaseErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    },
    [syncAuthWithBackground]
  );

  // サインアップ
  const handleSignUp = useCallback(
    async (email: string, password: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const authUser = await signUp(email, password);
        const token = await getIdToken();

        if (token) {
          // Chrome Storageに保存
          await authStorage.setAuthData({
            token,
            userId: authUser.uid,
            email: authUser.email || "",
          });

          // バックグラウンドスクリプトに通知
          await syncAuthWithBackground(authUser);
        }

        setUser(authUser);
      } catch (error: unknown) {
        console.error("Sign up error:", error);
        setError(getFirebaseErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    },
    [syncAuthWithBackground]
  );

  // サインアウト
  const handleSignOut = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await signOutUser();
      await authStorage.clearAuthData();
      await syncAuthWithBackground(null);

      setUser(null);
    } catch (error: unknown) {
      console.error("Sign out error:", error);
      setError("サインアウトに失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [syncAuthWithBackground]);

  // 認証状態を更新
  const refreshAuth = useCallback(async () => {
    try {
      setIsLoading(true);

      const currentUser = getCurrentUser();
      if (currentUser) {
        const authUser: AuthUser = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
        };

        const token = await getIdToken();
        if (token) {
          await authStorage.setAuthData({
            token,
            userId: authUser.uid,
            email: authUser.email || "",
          });
          await syncAuthWithBackground(authUser);
        }

        setUser(authUser);
      } else {
        await authStorage.clearAuthData();
        await syncAuthWithBackground(null);
        setUser(null);
      }
    } catch (error) {
      console.error("Refresh auth error:", error);
      setError("認証状態の更新に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [syncAuthWithBackground]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    refreshAuth,
    clearError,
  };
}

// Firebaseエラーメッセージを日本語に変換
function getFirebaseErrorMessage(error: unknown): string {
  const errorCode = (error as { code?: string })?.code || "";

  switch (errorCode) {
    case "auth/user-not-found":
      return "ユーザーが見つかりません";
    case "auth/wrong-password":
      return "パスワードが間違っています";
    case "auth/email-already-in-use":
      return "このメールアドレスは既に使用されています";
    case "auth/weak-password":
      return "パスワードが弱すぎます。6文字以上で設定してください";
    case "auth/invalid-email":
      return "無効なメールアドレスです";
    case "auth/network-request-failed":
      return "ネットワークエラーが発生しました";
    case "auth/too-many-requests":
      return "リクエストが多すぎます。しばらく待ってから再試行してください";
    case "auth/operation-not-allowed":
      return "この操作は許可されていません";
    case "auth/invalid-credential":
      return "認証情報が無効です";
    default:
      return (
        (error as { message?: string })?.message || "認証エラーが発生しました"
      );
  }
}
