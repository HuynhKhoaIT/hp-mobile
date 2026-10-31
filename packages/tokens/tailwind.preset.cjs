/* SINH TỰ ĐỘNG từ packages/tokens/src/index.ts — không sửa tay. Chạy: pnpm --filter @hp/tokens build */
/* Preset Tailwind v3 cho NativeWind 4 (apps/mobile). Web dùng theme.css (Tailwind v4). Cùng tên class. */

const light = {
  "--color-primary": "11 79 156",
  "--color-primary-light": "230 239 250",
  "--color-accent": "242 118 46",
  "--color-success": "30 158 90",
  "--color-warning": "224 161 0",
  "--color-danger": "217 48 37",
  "--color-bg": "246 247 249",
  "--color-surface": "255 255 255",
  "--color-surface-2": "238 240 243",
  "--color-border": "226 229 234",
  "--color-fg": "17 24 39",
  "--color-muted": "107 114 128",
  "--color-disabled": "156 163 175",
  "--color-on-primary": "255 255 255",
  "--color-on-accent": "17 24 39",
  "--color-service-pass": "217 105 46",
  "--color-service-pass-soft": "253 240 230",
  "--color-service-room": "124 92 196",
  "--color-service-room-soft": "242 238 251",
  "--color-service-job": "46 148 97",
  "--color-service-job-soft": "232 245 238",
  "--color-service-ride": "27 138 134",
  "--color-service-ride-soft": "228 244 243",
  "--color-service-sport": "210 85 90",
  "--color-service-sport-soft": "252 236 236",
  "--color-service-lost-found": "168 122 0",
  "--color-service-lost-found-soft": "251 243 217"
};

const dark = {
  "--color-primary": "91 155 230",
  "--color-primary-light": "21 40 63",
  "--color-accent": "245 138 76",
  "--color-success": "60 191 120",
  "--color-warning": "240 180 41",
  "--color-danger": "240 82 82",
  "--color-bg": "15 17 21",
  "--color-surface": "23 26 32",
  "--color-surface-2": "31 35 43",
  "--color-border": "42 47 56",
  "--color-fg": "243 244 246",
  "--color-muted": "156 163 175",
  "--color-disabled": "107 114 128",
  "--color-on-primary": "15 17 21",
  "--color-on-accent": "15 17 21",
  "--color-service-pass": "240 160 112",
  "--color-service-pass-soft": "58 42 32",
  "--color-service-room": "179 157 235",
  "--color-service-room-soft": "44 38 64",
  "--color-service-job": "108 199 154",
  "--color-service-job-soft": "30 50 41",
  "--color-service-ride": "95 196 191",
  "--color-service-ride-soft": "26 51 50",
  "--color-service-sport": "238 138 141",
  "--color-service-sport-soft": "58 34 36",
  "--color-service-lost-found": "230 190 85",
  "--color-service-lost-found-soft": "58 50 32"
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
      "service-lost-found-soft": "rgb(var(--color-service-lost-found-soft) / <alpha-value>)"
    },
    "borderRadius": {
      "none": "0px",
      "sm": "6px",
      "md": "10px",
      "lg": "14px",
      "xl": "20px",
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
        "card": "0px 1px 3px rgba(0,0,0,0.06)"
      },
      "aspectRatio": {
        "card": "4 / 3",
        "avatar": "1 / 1"
      }
    }
  },
  plugins: [
    ({ addBase }) => addBase({ ':root': light, '@media (prefers-color-scheme: dark)': { ':root': dark } }),
  ],
};
