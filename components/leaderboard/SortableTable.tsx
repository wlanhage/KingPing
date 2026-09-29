'use client';

import { Fragment, useState, type ReactNode } from 'react';

export type SortValue = number | string | null;
/** `desc`: första klicket sorterar störst först — rimligt för statistik, inte för placering och namn. */
export type SortColumn = { key: string; label: string; desc?: boolean };
type SortRow = { id: string; values: Record<string, SortValue>; tr: ReactNode };

/** Tomma värden hamnar sist åt båda hållen; lika värden behåller ordningen de kom i (sort är stabil). */
export function sortRows<T extends { values: Record<string, SortValue> }>(rows: T[], key: string, desc: boolean): T[] {
  return [...rows].sort((a, b) => {
    const x = a.values[key] ?? null;
    const y = b.values[key] ?? null;
    if (x === null || y === null) return Number(x === null) - Number(y === null);
    const cmp = typeof x === 'string' ? x.localeCompare(String(y), 'sv') : x - Number(y);
    return desc ? -cmp : cmp;
  });
}

/** Raderna renderas på servern; här byter de bara plats. */
export function SortableTable({ columns, rows }: { columns: SortColumn[]; rows: SortRow[] }) {
  const [sort, setSort] = useState<{ key: string; desc: boolean } | null>(null);
  const sorted = sort ? sortRows(rows, sort.key, sort.desc) : rows;
  const toggle = (c: SortColumn) => setSort((s) => ({ key: c.key, desc: s?.key === c.key ? !s.desc : Boolean(c.desc) }));
  return (
    <table>
      <thead>
        <tr>
          {columns.map((c) => {
            const dir = sort?.key === c.key ? (sort.desc ? 'descending' : 'ascending') : 'none';
            return (
              <th key={c.key} aria-sort={dir}>
                <button type='button' className='lb-sort' onClick={() => toggle(c)}>
                  {c.label}{dir !== 'none' && <span aria-hidden>{dir === 'descending' ? ' ▼' : ' ▲'}</span>}
                </button>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>{sorted.map((r) => <Fragment key={r.id}>{r.tr}</Fragment>)}</tbody>
    </table>
  );
}
