"use client";

import { initializePaddle, type Paddle } from "@paddle/paddle-js";

// 결제 완료 후 webhook이 DB에 반영될 때까지 잠깐 대기 후 잔액 refetch 트리거.
const REFRESH_DELAY_MS = 3000;

// 페이지 lifetime 동안 Paddle 인스턴스 1개만 초기화 (overlay는 같은 인스턴스 재사용 가능).
let paddlePromise: Promise<Paddle | undefined> | null = null;

function getPaddle(): Promise<Paddle | undefined> {
  if (paddlePromise) return paddlePromise;
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (!token) {
    console.error("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN 환경변수 누락");
    return Promise.resolve(undefined);
  }
  paddlePromise = initializePaddle({
    environment: "production",
    token,
    eventCallback: (event) => {
      if (event.name === "checkout.completed") {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("paddle:checkout-completed"));
        }, REFRESH_DELAY_MS);
      }
    },
  });
  return paddlePromise;
}

export async function openCheckout(opts: {
  clerkUserId: string;
  email?: string;
}): Promise<void> {
  const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_DEFAULT;
  if (!priceId) {
    console.error("NEXT_PUBLIC_PADDLE_PRICE_DEFAULT 환경변수 누락");
    return;
  }
  const paddle = await getPaddle();
  if (!paddle) return;

  paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customData: { clerkUserId: opts.clerkUserId },
    customer: {
      ...(opts.email ? { email: opts.email } : {}),
      address: { countryCode: "KR" },
    },
    settings: {
      displayMode: "overlay",
      locale: "ko",
      theme: "light",
    },
  });
}
