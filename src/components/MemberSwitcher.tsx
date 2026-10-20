import { useLocation, useNavigate } from 'react-router-dom';
import { useFamily } from '../contexts/FamilyContext';
import { Avatar } from './Avatar';

/** Large tap targets for switching person; keeps you on the same kind of page. */
export function MemberSwitcher() {
  const { members, selectedId, select } = useFamily();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if (members.length < 2) return null;

  const go = (id: string) => {
    select(id);
    const m = pathname.match(/^\/member\/[^/]+(\/history|\/report)?/);
    if (m) navigate(`/member/${id}${m[1] ?? ''}`);
  };

  return (
    <nav aria-label="Choose family member" className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-2">
        {members.map((m) => {
          const on = m.id === selectedId;
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => go(m.id)}
                aria-current={on ? 'true' : undefined}
                className={`flex min-h-[48px] items-center gap-2 whitespace-nowrap rounded-full border py-1 pl-1 pr-4 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                  on ? 'border-primary bg-primary-soft text-ink' : 'border-line bg-surface hover:bg-subtle'
                }`}
              >
                <Avatar name={m.full_name} color={m.avatar_color} size="sm" />
                {m.full_name.split(' ')[0]}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
