#!/usr/bin/env bash
# 店铺收银管理 - 一键启动
# 双击此文件即可启动服务并自动打开浏览器

set -euo pipefail

# 切到脚本所在目录（即项目根目录）
cd "$(dirname "${BASH_SOURCE[0]}")"

# 让 PATH 涵盖常见 Node 安装位置（Homebrew / nvm / volta）
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.nvm/versions/node/$(ls -1 "$HOME/.nvm/versions/node" 2>/dev/null | tail -n1)/bin:$HOME/.volta/bin:$PATH"

PORT="${PORT:-8888}"

print_header() {
  printf '\n\033[1;36m%s\033[0m\n' "================================================"
  printf '\033[1;36m%s\033[0m\n' "          店铺收银管理 - 启动中"
  printf '\033[1;36m%s\033[0m\n\n' "================================================"
}

press_any_key_then_exit() {
  printf '\n按任意键关闭此窗口...'
  read -n 1 -s -r
  exit 1
}

print_header

if ! command -v node >/dev/null 2>&1; then
  printf '\033[1;31m✘ 未检测到 Node.js\033[0m\n'
  printf '请先安装 Node 18+ : https://nodejs.org/zh-cn\n'
  press_any_key_then_exit
fi

NODE_VERSION="$(node -v)"
printf '✓ Node 版本: %s\n' "$NODE_VERSION"

if [ ! -d "node_modules" ]; then
  printf '\n📦 首次运行：安装依赖（约 1-2 分钟，仅此一次）...\n\n'
  npm install
fi

# 判断是否需要重新构建：.next 不存在，或源文件比构建产物新
NEED_BUILD=false
if [ ! -f ".next/BUILD_ID" ]; then
  NEED_BUILD=true
elif [ -n "$(find app lib components -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' -o -name '*.sql' \) -newer .next/BUILD_ID 2>/dev/null | head -1)" ]; then
  NEED_BUILD=true
fi

if [ "$NEED_BUILD" = true ]; then
  printf '\n🔨 检测到代码变更，构建生产版本（约 30 秒）...\n\n'
  npm run build
fi

# 服务起来后自动开浏览器
( sleep 2 && open "http://localhost:${PORT}" ) >/dev/null 2>&1 &

printf '\n\033[1;32m🚀 服务已启动: http://localhost:%s\033[0m\n' "$PORT"
printf '\033[2m   - 浏览器会自动打开。首次打开后，可在 Chrome/Edge 地址栏右侧点"安装"，把网页变成桌面图标。\033[0m\n'
printf '\033[2m   - 想停止服务：关闭此窗口，或按 Ctrl+C\033[0m\n\n'

PORT=$PORT exec npm start
