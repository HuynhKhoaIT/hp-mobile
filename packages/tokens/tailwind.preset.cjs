/* SINH TỰ ĐỘNG từ packages/tokens/src/index.ts — không sửa tay. Chạy: pnpm --filter @hp/tokens build */
/* Preset Tailwind v3 cho NativeWind 4 (apps/mobile). Web dùng theme.css (Tailwind v4). Cùng tên class. */

const light = {
  "--color-primary": "11 74 156",
  "--color-primary-light": "230 239 250",
  "--color-accent": "234 88 12",
  "--color-success": "30 158 90",
  "--color-warning": "224 161 0",
  "--color-danger": "217 48 37",
  "--color-bg": "248 250 252",
  "--color-surface": "255 255 255",
  "--color-surface-2": "241 245 249",
  "--color-border": "226 232 240",
  "--color-fg": "17 24 39",
  "--color-muted": "91 107 130",
  "--color-disabled": "148 163 184",
  "--color-on-primary": "255 255 255",
  "--color-on-accent": "255 255 255",
  "--color-service-pass": "217 105 46",
  "--color-service-pass-soft": "253 240 230",
  "--color-service-room": "4 120 87",
  "--color-service-room-soft": "231 246 239",
  "--color-service-job": "79 70 229",
  "--color-service-job-soft": "238 240 255",
  "--color-service-ride": "27 138 134",
  "--color-service-ride-soft": "228 244 243",
  "--color-service-sport": "210 85 90",
  "--color-service-sport-soft": "252 236 236",
  "--color-service-lost-found": "168 122 0",
  "--color-service-lost-found-soft": "251 243 217",
  "--color-app-from": "11 74 156",
  "--color-app-to": "30 111 217"
};

const dark = {
  "--color-primary": "91 155 230",
  "--color-primary-light": "21 40 63",
  "--color-accent": "234 88 12",
  "--color-success": "60 191 120",
  "--color-warning": "240 180 41",
  "--color-danger": "240 82 82",
  "--color-bg": "11 17 32",
  "--color-surface": "19 27 43",
  "--color-surface-2": "28 37 55",
  "--color-border": "39 50 71",
  "--color-fg": "241 245 249",
  "--color-muted": "148 163 184",
  "--color-disabled": "100 116 139",
  "--color-on-primary": "11 17 32",
  "--color-on-accent": "255 255 255",
  "--color-service-pass": "240 160 112",
  "--color-service-pass-soft": "58 42 32",
  "--color-service-room": "52 211 153",
  "--color-service-room-soft": "15 46 36",
  "--color-service-job": "165 180 252",
  "--color-service-job-soft": "30 31 69",
  "--color-service-ride": "95 196 191",
  "--color-service-ride-soft": "26 51 50",
  "--color-service-sport": "238 138 141",
  "--color-service-sport-soft": "58 34 36",
  "--color-service-lost-found": "230 190 85",
  "--color-service-lost-found-soft": "58 50 32",
  "--color-app-from": "11 74 156",
  "--color-app-to": "30 111 217"
};

module.exports = {
  "darkMode": "class",
  "theme": {
    "colors": {
      "transparent": "transparent",
      "current": "currentColor",
      "primary": "rgb(var(--color-primary) / <alpha-value>)",
      "primary-light": "rgb(var(--color-primary-light) / <alpha-value>)",
      "accent": "rgb(var(--color-accent) / <alpha-value>)",
      "success": "rgb(var(--color-success) / <alpha-value>)",
      "warning": "rgb(var(--color-warning) / <alpha-value>)",
      "danger": "rgb(var(--color-danger) / <alpha-value>)",
      "bg": "rgb(var(--color-bg) / <alpha-value>)",
      "surface": "rgb(var(--color-surface) / <alpha-value>)",
      "surface-2": "rgb(var(--color-surface-2) / <alpha-value>)",
      "border": "rgb(var(--color-border) / <alpha-value>)",
      "fg": "rgb(var(--color-fg) / <alpha-value>)",
      "muted": "rgb(var(--color-muted) / <alpha-value>)",
      "disabled": "rgb(var(--color-disabled) / <alpha-value>)",
      "on-primary": "rgb(var(--color-on-primary) / <alpha-value>)",
      "on-accent": "rgb(var(--color-on-accent) / <alpha-value>)",
      "service-pass": "rgb(var(--color-service-pass) / <alpha-value>)",
      "service-pass-soft": "rgb(var(--color-service-pass-soft) / <alpha-value>)",
      "service-room": "rgb(var(--color-service-room) / <alpha-value>)",
      "service-room-soft": "rgb(var(--color-service-room-soft) / <alpha-value>)",
      "service-job": "rgb(var(--color-service-job) / <alpha-value>)",
      "service-job-soft": "rgb(var(--color-service-job-soft) / <alpha-value>)",
      "service-ride": "rgb(var(--color-service-ride) / <alpha-value>)",
      "service-ride-soft": "rgb(var(--color-service-ride-soft) / <alpha-value>)",
      "service-sport": "rgb(var(--color-service-sport) / <alpha-value>)",
      "service-sport-soft": "rgb(var(--color-service-sport-soft) / <alpha-value>)",
      "service-lost-found": "rgb(var(--color-service-lost-found) / <alpha-value>)",
      "service-lost-found-soft": "rgb(var(--color-service-lost-found-soft) / <alpha-value>)",
      "app-from": "rgb(var(--color-app-from) / <alpha-value>)",
      "app-to": "rgb(var(--color-app-to) / <alpha-value>)"
    },
    "borderRadius": {
      "none": "0px",
      "sm": "8px",
      "md": "12px",
      "lg": "16px",
      "xl": "24px",
      "full": "9999px"
    },
    "fontSize": {
      "xs": [
        "12px",
        {
          "lineHeight": "17px"
        }
      ],
      "sm": [
        "14px",
        {
          "lineHeight": "20px"
        }
      ],
      "md": [
        "16px",
        {
          "lineHeight": "22px"
        }
      ],
      "lg": [
        "18px",
        {
          "lineHeight": "25px"
        }
      ],
      "xl": [
        "20px",
        {
          "lineHeight": "28px"
        }
      ],
      "2xl": [
        "24px",
        {
          "lineHeight": "34px"
        }
      ],
      "3xl": [
        "28px",
        {
          "lineHeight": "39px"
        }
      ]
    },
    "fontFamily": {
      "sans": [
        "BeVietnamPro_400Regular"
      ],
      "sans-medium": [
        "BeVietnamPro_500Medium"
      ],
      "sans-semibold": [
        "BeVietnamPro_600SemiBold"
      ],
      "sans-bold": [
        "BeVietnamPro_700Bold"
      ],
      "zh": [
        "NotoSansSC"
      ]
    },
    "extend": {
      "boxShadow": {
        "card": "0px 2px 8px rgba(15,23,42,0.06)",
        "bar": "0px -2px 10px rgba(15,23,42,0.06)",
        "fab": "0px 6px 16px rgba(234,88,12,0.35)"
      },
      "aspectRatio": {
        "card": "4 / 3",
        "avatar": "1 / 1",
        "banner": "16 / 7"
      }
    }
  },
  plugins: [
    ({ addBase }) => addBase({ ':root': light, '@media (prefers-color-scheme: dark)': { ':root': dark } }),
  ],
};
