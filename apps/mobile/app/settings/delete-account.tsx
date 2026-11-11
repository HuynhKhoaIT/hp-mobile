// Screen type: Form
// Xoá tài khoản (tab Tôi → dòng "Xoá tài khoản"; Nghị định 13/2023). Header xanh (DeleteAccountHero) cả khi đang khôi phục
// phiên để màn không nhảy. Khách (không phiên, không đang xoá) → về tab Tôi. Xoá xong (đã đăng xuất) → quay lại tab Tôi;
// `deleted` giữ màn không tự chuyển hướng lần hai khi phiên vừa mất. Nội dung + style Stitch: xem đầu DeleteAccount.tsx.
import { useSession } from '@hp/core/react';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { backOrHome } from '@/features/listing/navigation';
import { DeleteAccount, DeleteAccountHero, DeleteAccountSkeleton } from '@/features/profile/components/DeleteAccount';
import { useDeleteAccountFlow } from '@/features/profile/hooks';
import { Screen } from '@/ui';

export default function DeleteAccountScreen() {
  const session = useSession();
  const flow = useDeleteAccountFlow();
  const [deleted, setDeleted] = useState(false);

  if (!session.userId && !session.isLoading && !flow.isPending && !deleted) return <Redirect href="/me" />;

  return (
    <Screen keyboard>
      <DeleteAccountHero />
      {session.isLoading ? (
        <DeleteAccountSkeleton />
      ) : (
        <DeleteAccount
          flow={flow}
          onDeleted={() => {
            setDeleted(true);
            backOrHome();
          }}
        />
      )}
    </Screen>
  );
}
