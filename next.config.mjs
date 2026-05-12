import { withPostHogConfig } from "@posthog/nextjs-config";

/** @type {import('next').NextConfig} */
const nextConfig = {};

const phKey = process.env.POSTHOG_PERSONAL_API_KEY;
const phEnvId = process.env.POSTHOG_PROJECT_ID;

export default phKey && phEnvId
  ? withPostHogConfig(nextConfig, {
      personalApiKey: phKey,
      envId: phEnvId,
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      sourcemaps: {
        enabled: true,
        deleteAfterUpload: true,
      },
    })
  : nextConfig;
