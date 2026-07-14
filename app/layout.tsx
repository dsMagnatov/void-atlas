import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VPN Service",
  description: "Secure VPN service.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}
