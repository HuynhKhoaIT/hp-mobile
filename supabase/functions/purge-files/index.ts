// Điểm vào Edge Function purge-files (logic ở handler.ts để test import không mở cổng).
import { purgeFiles } from './handler.ts';

Deno.serve(purgeFiles);
