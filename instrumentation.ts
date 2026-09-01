export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getAdminCredentials } = await import('@/lib/auth');
    getAdminCredentials();
  }
}
