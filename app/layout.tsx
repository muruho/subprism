import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/components/I18nProvider';

export const metadata: Metadata = {
  title: 'SubPrism - 现代化代理订阅与分发系统',
  description: '基于 Next.js + Upstash Redis 的高性能代理节点管理与多协议订阅分发平台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-blue-500 selection:text-white">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
