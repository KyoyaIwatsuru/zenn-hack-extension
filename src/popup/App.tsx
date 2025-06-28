import { useState } from "react";
import browser from "webextension-polyfill";
import { AuthForm } from "@/components/AuthForm";
import { FlashcardItem } from "@/components/FlashcardItem";
import { useAuth } from "@/hooks/useAuth";
import { useWordData } from "@/hooks/useWordData";
import type { Flashcard } from "@/types";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

function App() {
  const { isAuthenticated, signOut } = useAuth();
  const { currentWordData, isLoading, error } = useWordData();
  const [addingToCollection, setAddingToCollection] = useState<string | null>(
    null
  );
  const [addResult, setAddResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // フラッシュカードをマイコレクションに追加
  const addToCollection = async (flashcardId: string) => {
    if (!isAuthenticated) {
      setAddResult({ type: "error", message: "認証が必要です" });
      return;
    }

    try {
      setAddingToCollection(flashcardId);
      setAddResult(null);

      // バックグラウンドスクリプトにメッセージを送信
      const response = await browser.runtime.sendMessage({
        type: "ADD_FLASHCARD",
        flashcardId,
      });

      if (response?.success) {
        setAddResult({
          type: "success",
          message: "フラッシュカードを追加しました！",
        });
      } else {
        setAddResult({ type: "error", message: "追加に失敗しました" });
      }
    } catch (error) {
      console.error("Failed to add flashcard:", error);
      setAddResult({ type: "error", message: "追加中にエラーが発生しました" });
    } finally {
      setAddingToCollection(null);
      // 3秒後に結果メッセージを自動で非表示
      setTimeout(() => setAddResult(null), 3000);
    }
  };

  // デモ用のサンプルデータ（実際のAPIデータを待つ間）
  const [sampleFlashcard] = useState<Flashcard>({
    flashcardId: "sample-1",
    word: {
      wordId: "word-1",
      word: "example",
      coreMeaning:
        "A thing characteristic of its kind or illustrating a general rule.",
      explanation:
        "A representative form or pattern; an instance serving for illustration.",
    },
    meanings: [
      {
        meaningId: "meaning-1",
        pos: "noun",
        translation: "例、実例",
        pronunciation: "/ɪɡˈzæmpəl/",
        exampleEng: "This is a perfect example of modern architecture.",
        exampleJpn: "これは現代建築の完璧な例です。",
      },
    ],
    media: {
      mediaId: "media-1",
      meaningId: "meaning-1",
      mediaUrls: [],
    },
    version: 1,
    memo: "",
    checkFlag: false,
  });

  if (!isAuthenticated) {
    return (
      <div className="w-[440px] p-6">
        <AuthForm />
      </div>
    );
  }

  return (
    <div className="w-[440px] p-4">
      <Tabs defaultValue="add" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-custom">Zenn Hack</h1>
          <TabsList>
            <TabsTrigger value="add">単語を追加</TabsTrigger>
            <TabsTrigger value="settings">設定</TabsTrigger>
          </TabsList>
        </div>

        {/* 単語追加タブ */}
        <TabsContent value="add">
          <div className="space-y-4">
            {/* エラー表示 */}
            {error && (
              <div className="p-3 bg-red-sub border border-red text-red rounded-lg">
                <div className="flex items-center gap-2">
                  <span>⚠️</span>
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* 追加結果の表示 */}
            {addResult && (
              <div
                className={`p-3 rounded-lg border ${
                  addResult.type === "success"
                    ? "bg-main/10 border-main text-custom"
                    : "bg-red-sub border-red text-red"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{addResult.type === "success" ? "✅" : "❌"}</span>
                  <span className="font-medium">{addResult.message}</span>
                </div>
              </div>
            )}

            {/* ローディング表示 */}
            {isLoading && (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-main"></div>
              </div>
            )}

            {/* フラッシュカード表示 */}
            {currentWordData ? (
              <FlashcardItem
                flashcard={{
                  ...currentWordData.data,
                  version: 1,
                  memo: "",
                  checkFlag: false,
                }}
                selectedMeaning={currentWordData.data.meanings[0]}
                onAddToCollection={addToCollection}
                isCompact={true}
                showCheckbox={false}
                showAddButton={true}
                isAddingToCollection={
                  addingToCollection === currentWordData.data.flashcardId
                }
              />
            ) : (
              !isLoading && (
                <div className="space-y-4">
                  <div className="text-center p-4 bg-whole/30 rounded-lg border border-main/20">
                    <p className="text-sm text-custom-sub leading-relaxed">
                      📚 英単語のあるページを閲覧するか、
                      <br />
                      テキストを選択してフラッシュカードを表示
                    </p>
                  </div>
                  <FlashcardItem
                    flashcard={sampleFlashcard}
                    selectedMeaning={sampleFlashcard.meanings[0]}
                    onAddToCollection={addToCollection}
                    isCompact={true}
                    showCheckbox={false}
                    showAddButton={true}
                    isAddingToCollection={
                      addingToCollection === sampleFlashcard.flashcardId
                    }
                  />
                </div>
              )
            )}
          </div>
        </TabsContent>

        {/* 設定タブ */}
        <TabsContent value="settings">
          <div className="space-y-6 p-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-custom">アカウント</h3>
              <div className="p-4 border rounded-lg bg-primary">
                <button
                  onClick={signOut}
                  className="w-full text-left text-sm text-red hover:bg-red/10 transition-colors px-3 py-2 rounded-md"
                >
                  ログアウト
                </button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


export default App;
