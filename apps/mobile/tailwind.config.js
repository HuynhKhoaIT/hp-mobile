// Token lấy từ @hp/tokens (preset sinh tự động). Không thêm màu / cỡ chữ / bo góc ở đây.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset'), require('@hp/tokens/tailwind.preset')],
};
