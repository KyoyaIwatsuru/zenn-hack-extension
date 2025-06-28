import { Card, CardContent } from "@/components/ui/card";
import type { Flashcard, Meaning, MediaCreateResult } from "@/types";
import { Volume2 } from "lucide-react";

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
  const handlePlaySound = () => {
    if (!word) return;
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US"; // 発音の言語を英語に設定
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="text-center space-y-2">
      <div className="flex items-center justify-center gap-3">
        <h3 className="text-3xl font-bold text-custom">{word}</h3>
        <button
          onClick={handlePlaySound}
          className="text-custom-sub hover:text-custom transition-colors"
          title="発音を聞く"
        >
          <Volume2 size={24} />
        </button>
      </div>
      {pronunciation && (
        <p className="text-base text-custom-sub font-mono">{pronunciation}</p>
      )}
    </div>
  );
}

// 意味リストコンポーネント
function MeaningList({
  meanings,
  selectedMeaningId,
}: {
  meanings: Meaning[];
  selectedMeaningId: string;
}) {
  const selectedMeaning = meanings.find(
    (m) => m.meaningId === selectedMeaningId
  );

  if (!selectedMeaning) return null;

  return (
    <div className="text-center space-y-3">
      <div className="flex justify-center">
        <span className="bg-main text-white px-4 py-2 rounded-full text-sm font-medium">
          {selectedMeaning.pos}
        </span>
      </div>
      <div className="bg-main/10 p-6 rounded-xl border-2 border-main/30">
        <p className="text-xl font-bold text-custom text-center">
          {selectedMeaning.translation}
        </p>
      </div>
    </div>
  );
}

// 例文セクション
function ExampleSection({
  word,
  exampleEng,
  exampleJpn,
}: {
  word: string;
  exampleEng?: string;
  exampleJpn?: string;
}) {
  if (!exampleEng && !exampleJpn) return null;

  const highlightedExample = exampleEng
    ? exampleEng.replace(
        new RegExp(`\\b(${word})\\b`, "gi"),
        '<strong class="text-main">$1</strong>'
      )
    : "";

  return (
    <details className="border-t border-main/20 pt-4">
      <summary className="text-sm text-custom-sub cursor-pointer hover:text-custom font-medium mb-3">
        📝 例文を見る
      </summary>
      <div className="space-y-3 pl-4">
        {exampleEng && (
          <div className="p-3 bg-secondary rounded-lg">
            <p
              className="text-sm text-custom italic leading-relaxed"
              dangerouslySetInnerHTML={{ __html: `"${highlightedExample}"` }}
            />
          </div>
        )}
        {exampleJpn && (
          <div className="p-3 bg-whole/50 rounded-lg">
            <p className="text-sm text-custom-sub">{exampleJpn}</p>
          </div>
        )}
      </div>
    </details>
  );
}

// 説明セクション
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

// メディア表示
function MediaDisplay({ word, mediaUrls }: { word: string; mediaUrls?: string[] }) {
  if (!mediaUrls || mediaUrls.length === 0) {
    return (
      <div className="w-full h-24 bg-whole rounded-lg border-2 border-dashed border-main/30 flex items-center justify-center">
        <span className="text-4xl font-bold text-main/50 select-none">
          {word.charAt(0).toUpperCase()}
        </span>
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
  showWordHeader = true,
  showMedia = true,
  showMeanings = true,
  showExamples = true,
  showExplanation = true,
  showAddButton = true,
  borderColor,
  isCompact = true,
  isAddingToCollection = false,
}: FlashcardItemProps) {
  const cardWidth = isCompact ? "w-full" : "w-full max-w-5xl"; // 横幅を親要素に合わせる

  return (
    <Card
      className={`bg-primary ${cardWidth} shadow-sm ${
        borderColor ? `border-4 ${borderColor}` : "border-0"
      }`}
    >
      <CardContent className="p-4">
        <div className="space-y-5">
          {showWordHeader && (
            <WordHeader
              word={flashcard.word.word}
              pronunciation={selectedMeaning?.pronunciation}
            />
          )}

          {showMedia && (
            <MediaDisplay
              word={flashcard.word.word}
              mediaUrls={flashcard.media?.mediaUrls}
            />
          )}

          {showMeanings && (
            <MeaningList
              meanings={flashcard.meanings}
              selectedMeaningId={selectedMeaning.meaningId}
            />
          )}

          {showExamples && (
            <ExampleSection
              word={flashcard.word.word}
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
              disabled={isAddingToCollection}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-base transition-all duration-200 shadow-md ${
                isAddingToCollection
                  ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                  : "bg-main text-white hover-green hover:shadow-lg"
              }`}
            >
              {isAddingToCollection ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>追加中...</span>
                </div>
              ) : (
                "➕ マイコレクションに追加"
              )}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
