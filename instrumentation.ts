export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getAdminCredentials } = await import('@/lib/auth');
    getAdminCredentials();

    const dbConfigured = !!(
      process.env.MYSQL_URL ||
      process.env.DATABASE_URL ||
      (process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_DATABASE) ||
      (process.env.DB_HOST && process.env.DB_USERNAME && process.env.DB_NAME)
    );

    if (!dbConfigured) {
      console.warn(
        '⚠️  未配置 MySQL：请设置 MYSQL_URL 或 MYSQL_HOST/MYSQL_USER/MYSQL_DATABASE（边缘环境使用 Wasmer 托管库注入的 DB_*；数据表将在首次访问时自动创建）'
      );
    }
  }
}
