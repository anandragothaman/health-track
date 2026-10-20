import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useFamily } from '../contexts/FamilyContext';
import type { Member } from '../types';

/** Member from the ":memberId" URL segment; also makes it the selected member. */
export function useRouteMember(): Member | null {
  const { memberId } = useParams();
  const { members, selectedId, select } = useFamily();
  const member = members.find((m) => m.id === memberId) ?? null;
  useEffect(() => {
    if (member && member.id !== selectedId) select(member.id);
  }, [member, selectedId, select]);
  return member;
}
