import { Card, CardContent } from "@/components/ui/card";
import type { Flashcard, Meaning, MediaCreateResult } from "@/types";

interface FlashcardItemProps {
  flashcard: Flashcard;
  selectedMeaning: Meaning;
  mediaCreateResult?: MediaCreateResult;
  onAddToCollection?: (flashcardId: string) => void;
  // 表示制御のオプション（ポップアップ用に簡略化）
  showCheckbox?: boolean;
  showWordHeader?: boolean;
  showMedia?: boolean;
  showMeanings?: boolean;
  showExamples?: boolean;
  showExplanation?: boolean;
  showAddButton?: boolean;
  // スタイル制御のオプション
  borderColor?: string;
  isCompact?: boolean; // ポップアップ用のコンパクト表示
  // ローディング状態
  isAddingToCollection?: boolean;
}

// 単語ヘッダーコンポーネント
function WordHeader({
  word,
  pronunciation,
}: {
  word: string;
  pronunciation?: string;
}) {
  return (
    <div className="text-center space-y-2">
      <h3 className="text-3xl font-bold text-custom">{word}</h3>
      {pronunciation && (
        <p className="text-base text-custom-sub font-mono">{pronunciation}</p>
      )}
    </div>
  );
}

// 意味リストコンポーネント - 選択された意味のみを大きく表示
function MeaningList({
  meanings,
  selectedMeaningId,
}: {
  meanings: Meaning[];
  selectedMeaningId: string;
}) {
  const selectedMeaning = meanings.find(m => m.meaningId === selectedMeaningId);
  
  if (!selectedMeaning) return null;
  
  return (
    <div className="text-center space-y-3">
      {/* 品詞バッジ */}
      <div className="flex justify-center">
        <span className="bg-main text-white px-4 py-2 rounded-full text-sm font-medium">
          {selectedMeaning.pos}
        </span>
      </div>
      
      {/* メイン翻訳 - 最も重要な情報 */}
      <div className="bg-main/10 p-6 rounded-xl border-2 border-main/30">
        <p className="text-xl font-bold text-custom text-center">
          {selectedMeaning.translation}
        </p>
      </div>
    </div>
  );
}

// 例文セクションコンポーネント - 折りたたみ式で補助情報として
function ExampleSection({
  exampleEng,
  exampleJpn,
}: {
  exampleEng?: string;
  exampleJpn?: string;
}) {
  if (!exampleEng && !exampleJpn) return null;

  return (
    <details className="border-t border-main/20 pt-4">
      <summary className="text-sm text-custom-sub cursor-pointer hover:text-custom font-medium mb-3">
        📝 例文を見る
      </summary>
      <div className="space-y-3 pl-4">
        {exampleEng && (
          <div className="p-3 bg-secondary rounded-lg">
            <p className="text-sm text-custom italic leading-relaxed">
              "{exampleEng}"
            </p>
          </div>
        )}
        {exampleJpn && (
          <div className="p-3 bg-whole/50 rounded-lg">
            <p className="text-sm text-custom-sub">
              {exampleJpn}
            </p>
          </div>
        )}
      </div>
    </details>
  );
}

// 説明セクションコンポーネント - より読みやすく
function ExplanationSection({ explanation }: { explanation?: string }) {
  if (!explanation) return null;

  return (
    <div className="p-4 bg-secondary rounded-lg border border-main/20">
      <p className="text-sm text-custom-sub leading-relaxed text-center">
        {explanation}
      </p>
    </div>
  );
}

// メディア表示コンポーネント - より美しく、Chrome拡張機能に適したサイズ
function MediaDisplay({
  mediaUrls,
  word,
}: {
  mediaUrls?: string[];
  word: string;
}) {
  if (!mediaUrls || mediaUrls.length === 0) {
    return (
      <div className="w-full h-24 bg-whole rounded-lg border-2 border-dashed border-main/30 flex items-center justify-center">
        <span className="text-custom-sub text-sm">🖼️ 画像なし</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <img
        src={mediaUrls[0]}
        alt={word}
        className="w-full h-24 object-cover rounded-lg border border-main/20 shadow-sm"
      />
    </div>
  );
}

export function FlashcardItem({
  flashcard,
  selectedMeaning,
  onAddToCollection,
  // デフォルト値（ポップアップ用に簡略化）
  showWordHeader = true,
  showMedia = true,
  showMeanings = true,
  showExamples = true,
  showExplanation = true,
  showAddButton = true,
  borderColor,
  isCompact = true, // ポップアップ用はデフォルトでコンパクト
  isAddingToCollection = false,
}: FlashcardItemProps) {
  const cardWidth = isCompact ? "w-[420px]" : "w-full max-w-5xl";

  return (
    <Card
      className={`bg-primary ${cardWidth} shadow-sm ${
        borderColor ? `border-4 ${borderColor}` : "border-0"
      }`}
    >
      <CardContent className="p-4">
        {isCompact ? (
          // ポップアップ用のコンパクトレイアウト
          <div className="space-y-5">
            {/* 単語ヘッダー */}
            {showWordHeader && (
              <WordHeader
                word={flashcard.word.word}
                pronunciation={selectedMeaning?.pronunciation}
              />
            )}

            {/* メディア */}
            {showMedia && (
              <MediaDisplay
                mediaUrls={flashcard.media?.mediaUrls}
                word={flashcard.word.word}
              />
            )}

            {/* 意味リスト */}
            {showMeanings && (
              <MeaningList
                meanings={flashcard.meanings}
                selectedMeaningId={selectedMeaning.meaningId}
              />
            )}

            {/* 例文 */}
            {showExamples && (
              <ExampleSection
                exampleEng={selectedMeaning?.exampleEng}
                exampleJpn={selectedMeaning?.exampleJpn}
              />
            )}

            {/* 説明 */}
            {showExplanation && (
              <ExplanationSection explanation={flashcard.word.explanation} />
            )}

            {/* 追加ボタン - より目立つデザイン */}
            {showAddButton && onAddToCollection && (
              <button
                onClick={() => onAddToCollection(flashcard.flashcardId)}
                disabled={isAddingToCollection}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-base transition-all duration-200 shadow-md ${
                  isAddingToCollection
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-main text-white hover-green hover:shadow-lg'
                }`}
              >
                {isAddingToCollection ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>追加中...</span>
                  </div>
                ) : (
                  '➕ マイコレクションに追加'
                )}
              </button>
            )}
          </div>
        ) : (
          // 通常のレイアウト（将来的に使用）
          <div className="flex gap-6">
            {/* 左側：単語情報 + メディア */}
            <div className="w-48 flex-shrink-0 space-y-4">
              {showWordHeader && (
                <WordHeader
                  word={flashcard.word.word}
                  pronunciation={selectedMeaning?.pronunciation}
                />
              )}
              {showMedia && (
                <MediaDisplay
                  mediaUrls={flashcard.media?.mediaUrls}
                  word={flashcard.word.word}
                />
              )}
            </div>

            {/* 右側：意味・例文・説明 */}
            <div className="flex-1 space-y-4">
              {showMeanings && (
                <MeaningList
                  meanings={flashcard.meanings}
                  selectedMeaningId={selectedMeaning.meaningId}
                />
              )}
              {showExamples && (
                <ExampleSection
                  exampleEng={selectedMeaning?.exampleEng}
                  exampleJpn={selectedMeaning?.exampleJpn}
                />
              )}
              {showExplanation && (
                <ExplanationSection explanation={flashcard.word.explanation} />
              )}
              {showAddButton && onAddToCollection && (
                <button
                  onClick={() => onAddToCollection(flashcard.flashcardId)}
                  className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                >
                  Add to My Collection
                </button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
