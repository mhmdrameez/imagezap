import BulkImageTool from "./ui/BulkImageTool";

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Bulk Image Resizer & Compressor",
            applicationCategory: "MultimediaApplication",
            operatingSystem: "All",
            description:
              "Resize, compress, and convert multiple images directly in your browser. Everything runs locally — your files are never uploaded.",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
            featureList: [
              "Upload and process multiple images at once",
              "Resize images to custom dimensions",
              "Compress images to reduce file size",
              "Convert images to JPEG, WebP, or PNG",
              "Runs locally in the browser (Canvas API)",
            ],
          }),
        }}
      />
      <BulkImageTool />
    </>
  );
}
