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
    default: "Bulk Image Resizer & Compressor - Fast, Private, In-Browser",
    template: "%s | Bulk Image Resizer",
  },
  applicationName: "Bulk Image Resizer & Compressor",
  description: "Free bulk image resizer, compressor, and converter. Batch process images for SSC, UPSC, and government exams. 100% private — everything runs locally in your browser.",
  keywords: [
    "image resizer",
    "bulk image resizer",
    "image compressor",
    "bulk image compressor",
    "webp converter",
    "jpeg compressor",
    "SSC photo resizer",
    "UPSC image compressor",
    "passport photo resizer",
    "online signature resizer",
    "batch image process",
    "private image resizer",
    "no upload image tool",
  ],
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/vercel.svg", type: "image/svg+xml" },
    ],
    apple: { url: "/window.svg", type: "image/svg+xml" },
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "Bulk Image Resizer & Compressor - Fast, Private, In-Browser",
    description: "Resize, compress, and convert multiple images at once without uploading. Perfect for job applications and exam portals.",
    siteName: "Bulk Image Resizer",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Bulk Image Resizer & Compressor Tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bulk Image Resizer & Compressor - 100% Private",
    description: "Secure, batch image processing directly in your browser. No server uploads, no privacy risks.",
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
