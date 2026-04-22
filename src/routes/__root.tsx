import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { Starfield } from "@/components/Starfield";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <Starfield density={140} />
      <div className="max-w-md text-center relative z-10 animate-warp-in">
        <h1 className="text-8xl font-bold gradient-text">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Lost in the void</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This coordinate doesn't exist in the known universe.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md gradient-galaxy text-primary-foreground px-5 py-2 text-sm font-medium glow-primary hover:opacity-90 transition-opacity"
          >
            Return to home base
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Drive Architect — Galaxy Edition" },
      { name: "description", content: "Design Windows file systems visually. Galaxy-themed system layout engine with templates, smart rules, preview, and safe scripts." },
      { name: "author", content: "Drive Architect" },
      { property: "og:title", content: "Drive Architect — Galaxy Edition" },
      { property: "og:description", content: "Design, preview, and deploy your Windows storage like an architect." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <>
      <Starfield density={160} />
      <div className="relative z-10">
        <Outlet />
      </div>
      <Toaster theme="dark" position="bottom-right" />
    </>
  );
}
