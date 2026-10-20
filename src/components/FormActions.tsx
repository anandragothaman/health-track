import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

interface Props {
  isEdit: boolean;
  busy: boolean;
  onCancel(): void;
  onDelete(): Promise<void>;
  /** Shown only when adding: saves and keeps the form open for another reading. */
  onSaveAnother?(): void;
}

export function FormActions({ isEdit, busy, onCancel, onDelete, onSaveAnother }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="submit" className="btn-primary min-h-[56px] text-lg sm:min-w-[180px]" disabled={busy}>
          {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Save reading'}
        </button>
        {!isEdit && onSaveAnother && (
          <button type="button" className="btn-secondary min-h-[56px]" disabled={busy} onClick={onSaveAnother}>
            Save and add another
          </button>
        )}
        <button type="button" className="btn-ghost min-h-[56px]" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        {isEdit && (
          <button type="button" className="btn-ghost min-h-[56px] text-crit sm:ml-auto" onClick={() => setConfirm(true)} disabled={busy}>
            <Trash2 className="h-5 w-5" aria-hidden /> Delete
          </button>
        )}
      </div>
      <ConfirmDialog
        open={confirm}
        title="Delete this reading?"
        confirmLabel="Delete reading"
        danger
        busy={deleting}
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            await onDelete();
          } finally {
            setDeleting(false);
            setConfirm(false);
          }
        }}
      >
        This cannot be undone.
      </ConfirmDialog>
    </>
  );
}
