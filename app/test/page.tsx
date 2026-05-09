// Lottie 애니메이션 파일을 확인하는 개발용 테스트 페이지
"use client";
import LottieAnimation from "@/components/LottieAnimation";

export default function TestLotties() {
  return (
    <div className="flex flex-col gap-10 p-10 bg-white min-h-dvh">
      <div className="p-5 border">
        <p>1. Sparkles Loop Loader ai</p>
        <LottieAnimation src="/lottie/Sparkles Loop Loader ai.json" className="w-32 h-32 bg-gray-100" />
      </div>
      <div className="p-5 border">
        <p>2. Loading 51 _ Monoplane</p>
        <LottieAnimation src="/lottie/Loading 51 _ Monoplane.json" className="w-32 h-32 bg-gray-100" />
      </div>
      <div className="p-5 border">
        <p>3. Trophy</p>
        <LottieAnimation src="/lottie/Trophy.json" className="w-32 h-32 bg-gray-100" />
      </div>
    </div>
  );
}
