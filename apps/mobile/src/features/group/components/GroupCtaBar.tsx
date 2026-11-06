// Thanh dính đáy chi tiết nhóm theo vai trò người xem (groupViewerRole) và trạng thái (groupDisplayStatus):
//   khách / chưa tham gia / đã rời: "Tham gia" (vào ngay) hoặc "Xin tham gia" (sheet lời nhắn) — khách đăng nhập trước;
//   đã xin: "Đã gửi yêu cầu" (tắt) + "Rút yêu cầu" · thành viên: "Bạn đã tham gia" + "Chat nhóm" | "Rời nhóm" ·
//   bị từ chối: dòng giải thích · chủ nhóm: "Bạn là chủ nhóm" + "Chat nhóm" | "Huỷ nhóm" (nguy hiểm).
// "Chat nhóm" (config.detail.ctas có 'chat') là hành động chính của thành viên; vẫn mở được sau giờ hẹn.
// Nhóm đủ người / đã tới giờ / đã huỷ → nút tắt kèm nhãn. Hành động khó hoàn tác xác nhận bằng ConfirmSheet.
import type { PublicGroup } from '@hp/core';
import { type GroupDisplayStatus, groupDisplayStatus, type GroupViewerRole, GROUP_RULES } from '@hp/shared';
import { CircleCheck, Crown, type LucideIcon } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { BottomSheet, Button, ConfirmSheet, Icon, Input, Notice, Row, StickyCta, Text } from '@/ui';
import { useGroupActions } from '../hooks';
import { GroupChatButton } from './GroupChatButton';

type Sheet = 'note' | 'leave' | 'cancel_request' | 'cancel_group' | null;

/** Nhóm còn mở / đủ người (chưa tới giờ, chưa huỷ) → còn rời / huỷ được. */
const isLive = (s: GroupDisplayStatus) => s === 'open' || s === 'full';

export type GroupCtaBarProps = {
  group: PublicGroup;
  role: GroupViewerRole;
  loading: boolean;
  /** Hiện "Chat nhóm" cho chủ nhóm / thành viên (config.detail.ctas có 'chat'). */
  chat: boolean;
};

export function GroupCtaBar({ group, role, loading, chat }: GroupCtaBarProps) {
  const { t } = useTranslation('group');
  const actions = useGroupActions(group);
  const status = groupDisplayStatus(group);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [note, setNote] = useState('');
  const close = () => setSheet(null);

  let body: ReactNode;
  if (loading) {
    body = <Button label={t('action.join')} fullWidth loading disabled />;
  } else if (role === 'host') {
    body = (
      <>
        <StatusLine icon={Crown} text={t('action.host_badge')} />
        <MemberActions chat={chat ? group.id : null}>
          {isLive(status) ? <Button label={t('action.cancel_group')} variant="outline" fullWidth onPress={() => setSheet('cancel_group')} /> : null}
        </MemberActions>
      </>
    );
  } else if (role === 'member') {
    body = (
      <>
        <StatusLine icon={CircleCheck} text={t('action.joined')} tone="success" />
        <MemberActions chat={chat ? group.id : null}>
          {isLive(status) ? <Button label={t('action.leave')} variant="outline" fullWidth onPress={() => setSheet('leave')} /> : null}
        </MemberActions>
      </>
    );
  } else if (role === 'requested') {
    body = (
      <>
        <Button label={t('action.requested')} variant="secondary" fullWidth disabled />
        {isLive(status) ? (
          <Button label={t('action.cancel_request')} variant="ghost" fullWidth onPress={() => setSheet('cancel_request')} />
        ) : null}
      </>
    );
  } else if (role === 'declined') {
    body = <Notice text={t('action.declined')} />;
  } else if (status === 'open') {
    body = (
      <>
        <Button
          label={t(group.requires_approval ? 'action.request' : 'action.join')}
          fullWidth
          loading={actions.joining}
          onPress={group.requires_approval ? () => actions.openRequest(() => setSheet('note')) : actions.join}
        />
        <Text variant="caption" tone="muted" className="text-center">
          {t(group.requires_approval ? 'detail.approval_hint' : 'detail.instant_hint')}
        </Text>
      </>
    );
  } else {
    body = <Button label={t(status === 'full' ? 'action.full' : 'action.closed')} variant="secondary" fullWidth disabled />;
  }

  return (
    <>
      <StickyCta>{body}</StickyCta>

      <BottomSheet open={sheet === 'note'} onClose={close} title={t('action.note_title')}>
        <Input
          label={t('action.note_label')}
          placeholder={t('action.note_placeholder')}
          value={note}
          onChangeText={setNote}
          maxLength={GROUP_RULES.noteMax}
          multiline
          textAlignVertical="top"
          className="min-h-24"
        />
        <Button
          label={t('action.send_request')}
          fullWidth
          loading={actions.joining}
          onPress={() =>
            actions.sendRequest(note, () => {
              close();
              setNote('');
            })
          }
        />
      </BottomSheet>
      <ConfirmSheet
        open={sheet === 'leave'}
        onClose={close}
        title={t('action.leave_confirm_title')}
        body={t('action.leave_confirm_body')}
        confirmLabel={t('action.leave_confirm')}
        loading={actions.leaving}
        onConfirm={() => actions.leave(false, close)}
      />
      <ConfirmSheet
        open={sheet === 'cancel_request'}
        onClose={close}
        title={t('action.cancel_request_confirm_title')}
        confirmLabel={t('action.cancel_request_confirm')}
        loading={actions.leaving}
        onConfirm={() => actions.leave(true, close)}
      />
      <ConfirmSheet
        open={sheet === 'cancel_group'}
        onClose={close}
        title={t('action.cancel_confirm_title')}
        body={t('action.cancel_confirm_body')}
        confirmLabel={t('action.cancel_confirm')}
        loading={actions.cancelling}
        onConfirm={() => actions.cancel(close)}
      />
    </>
  );
}

/** Hàng nút của chủ nhóm / thành viên: "Chat nhóm" (nếu bật) + nút phụ (Rời / Huỷ) chia đôi; chỉ một nút → cả hàng. */
function MemberActions({ chat, children }: { chat: string | null; children: ReactNode }) {
  if (!chat) return children;
  if (!children) return <GroupChatButton groupId={chat} />;
  return (
    <Row gap={2} align="start">
      <View className="flex-1">
        <GroupChatButton groupId={chat} />
      </View>
      <View className="flex-1">{children}</View>
    </Row>
  );
}

/** Một dòng trạng thái của mình (chủ nhóm / đã tham gia): icon + chữ, căn giữa. */
function StatusLine({ icon, text, tone = 'primary' }: { icon: LucideIcon; text: string; tone?: 'primary' | 'success' }) {
  return (
    <View accessibilityRole="text" className="min-h-11 flex-row items-center justify-center gap-2">
      <Icon icon={icon} tone={tone} />
      <Text variant="label" tone={tone} className="shrink text-center">
        {text}
      </Text>
    </View>
  );
}
