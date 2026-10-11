import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "Border Beam Button – a CTA with a comet of light on its border",
  description:
    "A pill call to action whose glowing beam travels the real rounded border at constant speed, reacts to the cursor, and shows loading, success and error. Next.js, Tailwind CSS, pure CSS and SVG.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

/* Applies the saved theme (or the system one) before the first paint, so the page never flashes. */
const themeScript = `try{var t=localStorage.getItem("beam-button-theme"),d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches),e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light"}catch(_){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-zinc-50 font-sans text-zinc-950 antialiased dark:bg-[#09090b] dark:text-white">{children}</body>
    </html>
  );
}
