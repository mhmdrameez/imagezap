import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PwaInitializer from "./PwaInitializer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Bulk Image Resizer & Compressor",
    template: "%s · Bulk Image Resizer",
  },
  applicationName: "Bulk Image Resizer & Compressor",
  description:
    "Resize, compress, and convert multiple images directly in your browser. Fast, privacy-friendly, and PWA-ready.",
  keywords: [
    "image resizer",
    "bulk image resizer",
    "image compressor",
    "bulk image compressor",
    "webp converter",
    "jpeg compressor",
    "convert images",
    "optimize images",
    "canvas image resize",
    "browser image tool",
  ],
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/vercel.svg", type: "image/svg+xml" },
      { url: "/window.svg", type: "image/svg+xml" },
    ],
    apple: { url: "/window.svg", type: "image/svg+xml" },
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "Bulk Image Resizer & Compressor",
    description:
      "Resize, compress, and convert multiple images directly in your browser. Everything runs locally — your files are never uploaded.",
    siteName: "Bulk Image Resizer",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Bulk Image Resizer & Compressor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bulk Image Resizer & Compressor",
    description:
      "Resize, compress, and convert multiple images directly in your browser. Everything runs locally — your files are never uploaded.",
    images: ["/twitter-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PwaInitializer />
        {children}
      </body>
    </html>
  );
}
