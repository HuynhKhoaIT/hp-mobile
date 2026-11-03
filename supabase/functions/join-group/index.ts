// Điểm vào Edge Function join-group (logic ở handler.ts để test import không mở cổng).
import { joinGroup } from './handler.ts';

Deno.serve(joinGroup);
