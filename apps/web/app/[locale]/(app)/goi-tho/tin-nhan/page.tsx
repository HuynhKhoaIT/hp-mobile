// /goi-tho/tin-nhan — chat của mini-app Gọi thợ: hộp thư khoá theo Gọi thợ (chỉ hội thoại về yêu cầu, không chip lọc). Cần đăng
// nhập (proxy.ts); noindex. Mở một hội thoại → khung chat trong mini-app /goi-tho/tin-nhan/[id] (quay lại về đây).
import type { Metadata } from 'next';
import { ConversationList } from '@/features/chat/components/conversation-list';
import { goiThoMetadata } from '@/features/goi-tho/metadata';
import { GOI_THO_PATHS } from '@/features/goi-tho/trades';

export function generateMetadata(): Promise<Metadata> {
  return goiThoMetadata('chat');
}

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 pb-6 sm:px-4 sm:pt-6">
      <div className="flex flex-col sm:overflow-hidden sm:rounded-lg sm:border sm:border-border">
        <ConversationList selectedId={null} lockFeature="goiTho" emptyHref={GOI_THO_PATHS.home} threadBase={GOI_THO_PATHS.chat} bare />
      </div>
    </div>
  );
}
