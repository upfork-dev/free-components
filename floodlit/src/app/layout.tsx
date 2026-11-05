import type { Metadata } from "next";
import "@fontsource-variable/archivo/wdth.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Floodlit: a night showroom for sports shoes",
  description: "A React showroom in raw WebGL2. Point at a shelf and it lights up. Click, and the camera walks up to the shoe.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
