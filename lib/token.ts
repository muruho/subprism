import crypto from 'crypto';

/**
 * 获取全局配置的订阅主密钥/盐值
 */
export function getSecretToken(): string {
  return (
    process.env.SUB_TOKEN ||
    process.env.SUB_SECRET_TOKEN ||
    process.env.SECRET_TOKEN ||
    process.env.TOKEN ||
    'sub_mgr_default_secret_token_salt_2026'
  );
}

/**
 * 根据用户名和 Secret Token 生成 16 位的加密/防篡改 URL Token
 * 规则：HMAC-SHA256(username, secretToken) 截取前 16 位小写十六进制字符串
 * @param username 用户名
 * @param customSalt 可选自定义盐值
 */
export function generateSubToken(username: string, customSalt?: string): string {
  const secret = customSalt || getSecretToken();
  const normalizedUser = username.trim().toLowerCase();
  
  const hash = crypto
    .createHmac('sha256', secret)
    .update(normalizedUser)
    .digest('hex');

  // 取前 16 位字符
  return hash.substring(0, 16);
}

/**
 * 校验 Token 格式是否符合 16 位 hex 字符串要求
 */
export function isValidSubTokenFormat(token: string): boolean {
  return typeof token === 'string' && /^[0-9a-fA-F]{16}$/.test(token);
}
