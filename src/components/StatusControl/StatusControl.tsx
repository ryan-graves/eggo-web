'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { updateSet } from '@/lib/supabase';
import { StatusPicker } from '@/components/StatusPicker';
import type { LegoSet, SetStatus } from '@/types';

interface StatusControlProps {
  setId: LegoSet['id'];
  currentStatus: SetStatus;
}

/**
 * Persisting wrapper around `StatusPicker` for a saved set.
 *
 * Optimistic update: the badge label flips immediately, `updateSet` fires
 * in the background, failure reverts the badge and emits a toast.
 */
export function StatusControl({ setId, currentStatus }: StatusControlProps): React.JSX.Element {
  const [optimisticStatus, setOptimisticStatus] = useState<SetStatus>(currentStatus);
  const [isSaving, setIsSaving] = useState(false);

  // Sync optimistic state when the parent's status prop changes (e.g. a
  // realtime echo). A successful local save arrives as a matching value
  // and is a no-op.
  useEffect(() => {
    setOptimisticStatus(currentStatus);
  }, [currentStatus]);

  const pick = async (next: SetStatus) => {
    const previous = optimisticStatus;
    setOptimisticStatus(next);
    setIsSaving(true);

    try {
      // Only WRITE hasBeenAssembled when transitioning into a status that
      // implies the set has been built — never clear it from this control.
      // Otherwise moving an already-built set from `assembled` to
      // `rebuild_in_progress` would erase the build history. The edit page
      // does the same kind of preservation (`hasBeenAssembled || status === …`).
      const becomingBuilt = next === 'assembled' || next === 'disassembled';
      const update: Parameters<typeof updateSet>[1] = { status: next };
      if (becomingBuilt) update.hasBeenAssembled = true;
      await updateSet(setId, update);
    } catch (err) {
      setOptimisticStatus(previous);
      const message = err instanceof Error ? err.message : 'Please try again';
      toast.error("Couldn't update status", { description: message });
    } finally {
      setIsSaving(false);
    }
  };

  return <StatusPicker value={optimisticStatus} onChange={pick} busy={isSaving} />;
}
