import type { Metadata } from "next";
import "./globals.css";
import { SupabaseProvider } from "@/lib/SupabaseContext";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import AndroidAppBanner from "@/components/AndroidAppBanner";


export const metadata: Metadata = {
  title: "Lead by SolveCrew",
  description: "Lead by SolveCrew — Your AI-powered accountability engine. Live Every Ambition Daily.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lead by SolveCrew",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/logo-white.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <SupabaseProvider>
          <ServiceWorkerRegistrar />
          <AndroidAppBanner />
          {children}
        </SupabaseProvider>
      </body>

    </html>
  );
}

