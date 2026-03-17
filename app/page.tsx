import BulkImageTool from "./ui/BulkImageTool";

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Bulk Image Resizer & Compressor",
              alternateName: "ImageZap",
              applicationCategory: "MultimediaApplication, UtilitiesApplication",
              operatingSystem: "Windows, macOS, Linux, iOS, Android",
              description:
                "Free, private, and fast bulk image resizer, compressor, and converter. Process multiple images locally in your browser for SSC, UPSC, and other exam portals.",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
              featureList: [
                "Upload and process multiple images at once",
                "Resize images to custom pixel, cm, or inch dimensions",
                "Compress images to reduce file size while maintaining quality",
                "Convert images to JPEG, WebP, or PNG formats",
                "Built-in crop tool for precise adjustments",
                "100% private: images never leave your browser",
              ],
              author: {
                "@type": "Person",
                name: "Muhammed Rameez",
                url: "https://www.buymeacoffee.com/mhmdrameez",
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "Is this bulk image resizer free to use?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes, this tool is completely free for everyone. You can resize, compress, and convert as many images as you need without any cost.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Are my images uploaded to any server?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "No, your images are never uploaded. Everything happens locally in your browser using the Canvas API, ensuring maximum privacy and security.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Can I use this for SSC or UPSC exam photos?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Absolutely! You can set specific pixel dimensions and compress images to meet the exact requirements of Indian government exam portals like SSC and UPSC.",
                  },
                },
              ],
            },
          ]),
        }}
      />
      <BulkImageTool />
    </>
  );
}
