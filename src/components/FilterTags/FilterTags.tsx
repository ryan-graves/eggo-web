'use client';

import styles from './FilterTags.module.css';

interface FilterTag {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
}

interface FilterTagsProps {
  tags: FilterTag[];
}

export function FilterTags({ tags }: FilterTagsProps): React.JSX.Element | null {
  if (tags.length === 0) return null;

  return (
    <div className={styles.container}>
      {tags.map((tag) => (
        <span key={tag.key} className={styles.tag}>
          <span className={styles.tagLabel}>{tag.label}:</span>
          <span className={styles.tagValue}>{tag.value}</span>
          <button
            type="button"
            onClick={tag.onRemove}
            className={styles.removeButton}
            aria-label={`Remove ${tag.label} filter`}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
