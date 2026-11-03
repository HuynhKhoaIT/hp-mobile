// Điểm vào Edge Function respond-join (logic ở handler.ts để test import không mở cổng).
import { respondJoin } from './handler.ts';

Deno.serve(respondJoin);
