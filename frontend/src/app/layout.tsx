import type { Metadata } from "next";
import { Luckiest_Guy } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Script from "next/script";

const font = Luckiest_Guy({
  variable: "--luckiest-guy",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Fantabimbo",
  description: "Fantabimbo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${font.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
