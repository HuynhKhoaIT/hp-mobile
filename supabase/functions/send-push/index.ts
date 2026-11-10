// Điểm vào Edge Function send-push (logic ở handler.ts để test import không mở cổng).
import { sendPush } from './handler.ts';

Deno.serve(sendPush);
