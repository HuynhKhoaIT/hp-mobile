// Điểm vào Edge Function zalo-notify (logic ở handler.ts để test import không mở cổng).
import { zaloNotify } from './handler.ts';

Deno.serve(zaloNotify);
