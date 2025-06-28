import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

// バリデーションスキーマ
const authSchema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("有効なメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上で入力してください"),
});

type AuthFormData = z.infer<typeof authSchema>;

interface AuthFormProps {
  onSuccess?: () => void;
}

// Firebaseエラーコードを日本語メッセージに変換
const getFirebaseAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case "auth/email-already-in-use":
      return "このメールアドレスは既に使用されています。";
    case "auth/invalid-email":
      return "無効なメールアドレスです。";
    case "auth/operation-not-allowed":
      return "メールアドレスとパスワードによる認証は有効ではありません。";
    case "auth/weak-password":
      return "パスワードが弱すぎます。6文字以上で設定してください。";
    case "auth/user-disabled":
      return "このユーザーアカウントは無効化されています。";
    case "auth/user-not-found":
      return "ユーザーが見つかりませんでした。";
    case "auth/wrong-password":
      return "パスワードが間違っています。";
    case "auth/invalid-credential":
      return "メールアドレスまたはパスワードが正しくありません。";
    default:
      return "認証中に不明なエラーが発生しました。";
  }
};

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, isLoading, error, clearError } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  const onSubmit = async (data: AuthFormData) => {
    try {
      clearError();

      if (isSignUp) {
        await signUp(data.email, data.password);
      } else {
        await signIn(data.email, data.password);
      }

      reset();
      onSuccess?.();
    } catch {
      // エラーはuseAuthフックで処理される
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    clearError();
    reset();
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const displayError = error ? getFirebaseAuthErrorMessage(error) : null;

  return (
    <Card className="w-full max-w-md mx-auto border-0 shadow-none">
      <CardHeader className="space-y-1 px-2">
        <CardTitle className="text-2xl font-bold text-center text-custom">
          {isSignUp ? "アカウント作成" : "ログイン"}
        </CardTitle>
        <p className="text-sm text-custom-sub text-center">
          {isSignUp
            ? "Zenn Hack拡張機能を使用するためのアカウントを作成"
            : "Zenn Hack拡張機能にログイン"}
        </p>
      </CardHeader>

      <CardContent className="space-y-4 px-2">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* メールアドレス */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-custom">
              メールアドレス
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              {...register("email")}
              className={errors.email ? "border-red-500" : ""}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.email.message}
              </p>
            )}
          </div>

          {/* パスワード */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-custom">
              パスワード
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="6文字以上"
                {...register("password")}
                className={errors.password ? "border-red-500 pr-10" : "pr-10"}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={togglePasswordVisibility}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-custom-sub" />
                ) : (
                  <Eye className="h-4 w-4 text-custom-sub" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.password.message}
              </p>
            )}
          </div>

          {/* エラーメッセージ */}
          {displayError && (
            <div className="p-3 bg-red-sub border border-red rounded-md">
              <p className="text-sm text-red flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {displayError}
              </p>
            </div>
          )}

          {/* 送信ボタン */}
          <Button
            type="submit"
            className="w-full bg-main hover-green"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {isSignUp ? "作成中..." : "ログイン中..."}
              </div>
            ) : isSignUp ? (
              "アカウント作成"
            ) : (
              "ログイン"
            )}
          </Button>
        </form>

        {/* モード切替 */}
        <div className="text-center">
          <button
            type="button"
            onClick={toggleMode}
            className="text-sm text-main hover:text-dark-green transition-colors"
            disabled={isLoading}
          >
            {isSignUp
              ? "既にアカウントをお持ちの方はこちら"
              : "アカウントをお持ちでない方はこちら"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
