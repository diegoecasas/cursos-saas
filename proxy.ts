import { clerkMiddleware } from "@clerk/nextjs/server";

// No routes are protected — the entire site is browsable anonymously. Clerk
// middleware just makes auth() available inside route handlers and server
// components so we can pick between anon-cookie and signed-in identity.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
