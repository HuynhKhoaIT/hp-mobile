// Điểm vào Edge Function translate-content (logic ở handler.ts để test import không mở cổng).
import { translateContent } from './handler.ts';

Deno.serve(translateContent);
