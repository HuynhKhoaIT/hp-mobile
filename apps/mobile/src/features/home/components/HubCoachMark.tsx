// Hướng dẫn lần đầu ở Hub (CLAUDE.md mục 10): 3 bước tìm → đăng (+) → nhắn tin, bỏ qua được; xem / bỏ qua một lần
// thì không hiện lại (cờ `coachSeen` trong cài đặt máy, MMKV). Chỉ hiện khi tab Trang chủ đang mở.
import { MessageCircle, Search, SquarePlus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/core/settings';
import { CoachMark, type CoachMarkStep } from '@/ui';

export function HubCoachMark({ active }: { active: boolean }) {
  const { t } = useTranslation();
  const seen = useSettings((s) => s.coachSeen);
  const markSeen = useSettings((s) => s.setCoachSeen);
  if (seen) return null;
  const steps: CoachMarkStep[] = [
    { icon: Search, title: t('coach.search_title'), body: t('coach.search_body') },
    { icon: SquarePlus, title: t('coach.post_title'), body: t('coach.post_body') },
    { icon: MessageCircle, title: t('coach.chat_title'), body: t('coach.chat_body') },
  ];
  return <CoachMark open={active} steps={steps} onDone={markSeen} />;
}
