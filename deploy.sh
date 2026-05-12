#!/bin/bash
# 部署到 Vercel —— 等你网络通 vercel.com 后运行

cd "$(dirname "$0")"

echo "=== 1. 检查 vercel 登录状态 ==="
if ! vercel whoami > /dev/null 2>&1; then
  echo "请先登录: vercel login"
  echo "(会跳浏览器,填邮箱即可)"
  exit 1
fi

echo "=== 2. 第一次部署:vercel link 项目 + 预览部署 ==="
echo "(项目名建议: notebook-board 或 ai-math-board)"
echo ""

# 部署到 production(去 -- prod 改预览,有 -- prod 直接生产)
vercel deploy --prod --yes

echo ""
echo "=== 完成. URL 在上面 ==="
