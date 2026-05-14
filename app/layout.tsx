import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Light Upon Light — Turkey 2027",
  description: "Event booking platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
