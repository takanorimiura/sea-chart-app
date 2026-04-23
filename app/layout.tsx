import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SEA-CHART — 海の出版社",
  description: "ワークフロー設計ツール SEA-CHART",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
