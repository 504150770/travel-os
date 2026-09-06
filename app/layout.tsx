import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '欧洲18天 · Personal Travel Guide',
  description: '罗马、佛罗伦萨、威尼斯、维也纳、布拉格、巴黎的18天冬日旅行系统。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
