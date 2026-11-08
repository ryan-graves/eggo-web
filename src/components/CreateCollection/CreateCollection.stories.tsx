import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import styles from './CreateCollection.module.css';

interface DemoProps {
  title?: string;
  description?: string;
}

// Create a standalone demo component for Storybook
// This avoids needing to mock the actual useCollection hook
function CreateCollectionDemo({
  title = 'Create Your Collection',
  description = 'Set up your Lego collection to start tracking your sets.',
}: DemoProps): React.JSX.Element {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>

        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>
              Collection Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="e.g., The Graves Collection"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="owners" className={styles.label}>
              Owners
            </label>
            <input
              id="owners"
              type="text"
              placeholder="e.g., Ryan, Alyssa"
              className={styles.input}
            />
            <p className={styles.hint}>Separate multiple owners with commas</p>
          </div>

          <button type="submit" className={styles.button}>
            Create Collection
          </button>
        </form>
      </div>
    </div>
  );
}

function CreateCollectionWithError(): React.JSX.Element {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Create Your Collection</h2>
        <p className={styles.description}>
          Set up your Lego collection to start tracking your sets.
        </p>

        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>
              Collection Name
            </label>
            <input
              id="name"
              type="text"
              defaultValue="My Collection"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="owners" className={styles.label}>
              Owners
            </label>
            <input id="owners" type="text" defaultValue="Ryan" className={styles.input} />
            <p className={styles.hint}>Separate multiple owners with commas</p>
          </div>

          <p className={styles.error}>Network error: Failed to create collection</p>

          <button type="submit" className={styles.button}>
            Create Collection
          </button>
        </form>
      </div>
    </div>
  );
}

function CreateCollectionLoading(): React.JSX.Element {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Create Your Collection</h2>
        <p className={styles.description}>
          Set up your Lego collection to start tracking your sets.
        </p>

        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>
              Collection Name
            </label>
            <input
              id="name"
              type="text"
              defaultValue="The Graves Collection"
              className={styles.input}
              disabled
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="owners" className={styles.label}>
              Owners
            </label>
            <input
              id="owners"
              type="text"
              defaultValue="Ryan, Alyssa"
              className={styles.input}
              disabled
            />
            <p className={styles.hint}>Separate multiple owners with commas</p>
          </div>

          <button type="submit" className={styles.button} disabled>
            Creating...
          </button>
        </form>
      </div>
    </div>
  );
}

const meta: Meta = {
  title: 'Components/CreateCollection',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj = {
  render: () => <CreateCollectionDemo />,
};

/** The copy used on /collections/new, when the user already has a collection. */
export const AdditionalCollection: StoryObj = {
  render: () => (
    <CreateCollectionDemo
      title="Start another collection"
      description="It gets its own sets, owners, and share link."
    />
  ),
};

export const WithError: StoryObj = {
  render: () => <CreateCollectionWithError />,
};

export const Loading: StoryObj = {
  render: () => <CreateCollectionLoading />,
};
