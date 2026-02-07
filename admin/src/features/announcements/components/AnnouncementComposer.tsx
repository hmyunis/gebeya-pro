import {
  Button,
  Card,
  CardBody,
  Chip,
  Select,
  SelectItem,
  Textarea,
} from '@heroui/react';
import { Megaphone, PaperPlaneTilt } from '@phosphor-icons/react';
import type {
  BroadcastKind,
  BroadcastRole,
  BroadcastTarget,
  BroadcastUser,
} from '../types';
import { kindOptions, roleOptions, targetOptions } from '../utils';
import { AudienceUserPicker } from './AudienceUserPicker';

type AnnouncementComposerProps = {
  kind: BroadcastKind;
  target: BroadcastTarget;
  role: BroadcastRole;
  message: string;
  selectedUsers: BroadcastUser[];
  isSubmitting: boolean;
  onKindChange: (value: BroadcastKind) => void;
  onTargetChange: (value: BroadcastTarget) => void;
  onRoleChange: (value: BroadcastRole) => void;
  onMessageChange: (value: string) => void;
  onAddUser: (user: BroadcastUser) => void;
  onRemoveUser: (userId: number) => void;
  onSubmit: () => void;
};

export function AnnouncementComposer({
  kind,
  target,
  role,
  message,
  selectedUsers,
  isSubmitting,
  onKindChange,
  onTargetChange,
  onRoleChange,
  onMessageChange,
  onAddUser,
  onRemoveUser,
  onSubmit,
}: AnnouncementComposerProps) {
  const isUsersTarget = target === 'users';
  const isRoleTarget = target === 'role';
  const isBotSubscribersTarget = target === 'bot_subscribers';
  const isSubmitDisabled =
    !message.trim() || (isUsersTarget && selectedUsers.length === 0);

  return (
    <Card>
      <CardBody className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Create Announcement</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Select
            label="Content Type"
            selectedKeys={new Set([kind])}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0];
              if (!key) return;
              onKindChange(String(key) as BroadcastKind);
            }}
          >
            {kindOptions.map((option) => (
              <SelectItem key={option.key}>{option.label}</SelectItem>
            ))}
          </Select>

          <Select
            label="Target Mode"
            selectedKeys={new Set([target])}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0];
              if (!key) return;
              onTargetChange(String(key) as BroadcastTarget);
            }}
          >
            {targetOptions.map((option) => (
              <SelectItem key={option.key} description={option.description}>
                {option.label}
              </SelectItem>
            ))}
          </Select>

          <Select
            label="Role"
            selectedKeys={new Set([role])}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0];
              if (!key) return;
              onRoleChange(String(key) as BroadcastRole);
            }}
            isDisabled={!isRoleTarget}
            description={isRoleTarget ? 'Only linked users in this role.' : 'Enabled for role targeting.'}
          >
            {roleOptions.map((option) => (
              <SelectItem key={option.key}>{option.label}</SelectItem>
            ))}
          </Select>
        </div>

        <Textarea
          label="Message"
          value={message}
          onValueChange={onMessageChange}
          placeholder="Write your announcement/news/ad message (HTML tags supported by Telegram)."
          minRows={6}
          maxRows={10}
          description="Telegram message max: 4000 characters"
        />

        {isUsersTarget ? (
          <AudienceUserPicker
            selectedUsers={selectedUsers}
            onAddUser={onAddUser}
            onRemoveUser={onRemoveUser}
          />
        ) : null}

        {isBotSubscribersTarget ? (
          <Chip variant="flat" color="warning">
            Sends to bot subscribers, including users who are not registered on the platform.
          </Chip>
        ) : null}

        <div className="flex justify-end">
          <Button
            color="primary"
            isLoading={isSubmitting}
            isDisabled={isSubmitDisabled}
            onPress={onSubmit}
            startContent={<PaperPlaneTilt className="h-4 w-4" />}
          >
            Send Now
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
