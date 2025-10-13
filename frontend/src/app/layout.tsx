import type { Metadata } from "next";
import { Luckiest_Guy } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const font = Luckiest_Guy({
  variable: "--luckiest-guy",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Fantanome",
  description: "Fantanome",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>Fantanome</title>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#c2a083" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={`${font.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
