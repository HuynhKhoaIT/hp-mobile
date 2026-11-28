// Điểm vào Edge Function zalo-send (logic ở handler.ts để test import không mở cổng).
import { zaloSend } from './handler.ts';

Deno.serve(zaloSend);
