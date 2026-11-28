// Điểm vào Edge Function zalo-connect (logic ở handler.ts để test import không mở cổng).
import { zaloConnect } from './handler.ts';

Deno.serve(zaloConnect);
