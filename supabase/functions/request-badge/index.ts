// Điểm vào Edge Function request-badge (logic ở handler.ts để test import không mở cổng).
import { requestBadge } from './handler.ts';

Deno.serve(requestBadge);
