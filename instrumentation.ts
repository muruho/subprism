export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getAdminCredentials } = await import('@/lib/auth');
    getAdminCredentials();

    try {
      const { ensureSchema, isDbConfigured } = await import('@/lib/db');
      if (isDbConfigured()) {
        await ensureSchema();
        console.log('✅ MySQL 数据表结构已就绪');
      } else {
        console.warn(
          '⚠️  未配置 MySQL：请设置 MYSQL_URL 或 MYSQL_HOST/MYSQL_USER/MYSQL_DATABASE'
        );
      }
    } catch (e) {
      console.error('❌ MySQL 初始化失败:', e);
    }
  }
}
