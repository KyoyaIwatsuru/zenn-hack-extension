import { useState } from "react";
import browser from "webextension-polyfill";
import { AuthForm } from "@/components/AuthForm";
import { FlashcardItem } from "@/components/FlashcardItem";
import { useAuth } from "@/hooks/useAuth";
import { useWordData } from "@/hooks/useWordData";
import type { Flashcard } from "@/types";

function App() {
  const { isAuthenticated, signOut } = useAuth();
  const { currentWordData, isLoading, error } = useWordData();
  const [addingToCollection, setAddingToCollection] = useState<string | null>(null);
  const [addResult, setAddResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // フラッシュカードをマイコレクションに追加
  const addToCollection = async (flashcardId: string) => {
    if (!isAuthenticated) {
      setAddResult({ type: 'error', message: '認証が必要です' });
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
        setAddResult({ type: 'success', message: 'フラッシュカードを追加しました！' });
      } else {
        setAddResult({ type: 'error', message: '追加に失敗しました' });
      }
    } catch (error) {
      console.error("Failed to add flashcard:", error);
      setAddResult({ type: 'error', message: '追加中にエラーが発生しました' });
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
    <div className="w-[440px] p-6 space-y-5">
      {/* ヘッダー */}
      <div className="flex justify-between items-center pb-2 border-b border-main/20">
        <h1 className="text-xl font-bold text-custom">Zenn Hack Extension</h1>
        <button
          onClick={signOut}
          className="text-sm text-custom-sub hover:text-custom transition-colors px-3 py-1 rounded-md hover:bg-whole/30"
        >
          ログアウト
        </button>
      </div>

      {/* エラー表示 - カスタムカラーで統一 */}
      {error && (
        <div className="p-4 bg-red-sub border border-red text-red rounded-lg">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* フラッシュカード追加結果の表示 */}
      {addResult && (
        <div className={`p-4 rounded-lg border ${
          addResult.type === 'success' 
            ? 'bg-main/10 border-main text-custom' 
            : 'bg-red-sub border-red text-red'
        }`}>
          <div className="flex items-center gap-2">
            <span>{addResult.type === 'success' ? '✅' : '❌'}</span>
            <span className="font-medium">{addResult.message}</span>
          </div>
        </div>
      )}

      {/* ローディング表示 - カスタムカラーで統一 */}
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
          isAddingToCollection={addingToCollection === currentWordData.data.flashcardId}
        />
      ) : (
        !isLoading && (
          // サンプルデータ表示（実際のデータがない場合）
          <div className="space-y-4">
            <div className="text-center p-4 bg-whole/30 rounded-lg border border-main/20">
              <p className="text-sm text-custom-sub leading-relaxed">
                📚 英単語のあるページを閲覧するか、<br/>
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
              isAddingToCollection={addingToCollection === sampleFlashcard.flashcardId}
            />
          </div>
        )
      )}
    </div>
  );
}

export default App;
