import { render, screen, fireEvent } from '@testing-library/react';
import { CollectionSelector } from './CollectionSelector';
import type { Collection } from '@/types';

function makeCollection(id: string, name: string, owners: string[]): Collection {
  return {
    id,
    name,
    owners,
    memberUserIds: ['user-1'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const graves = makeCollection('coll-1', 'The Graves Collection', ['Ryan', 'Alyssa']);
const shelf = makeCollection('coll-2', 'Second Shelf', ['Ryan']);

function renderSelector(overrides: Partial<React.ComponentProps<typeof CollectionSelector>> = {}) {
  const props = {
    collections: [graves],
    activeCollection: graves,
    onSelect: jest.fn(),
    onCreateClick: jest.fn(),
    ...overrides,
  };
  render(<CollectionSelector {...props} />);
  return props;
}

function getTrigger() {
  return screen.getByRole('button', { name: /the graves collection/i });
}

function openMenu() {
  fireEvent.click(getTrigger());
  return screen.getByRole('menu', { name: /collections/i });
}

describe('CollectionSelector', () => {
  it('is a dropdown even with a single collection, so "New collection" is reachable', () => {
    renderSelector();

    const trigger = getTrigger();
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    openMenu();

    expect(screen.getAllByRole('menuitemradio')).toHaveLength(1);
    expect(screen.getByRole('menuitem', { name: /new collection/i })).toBeInTheDocument();
  });

  it('lists each collection with its owners and marks the active one', () => {
    renderSelector({ collections: [shelf, graves], activeCollection: graves });
    openMenu();

    const items = screen.getAllByRole('menuitemradio');
    expect(items.map((item) => item.textContent)).toEqual([
      'Second ShelfRyan',
      'The Graves CollectionRyan, Alyssa',
    ]);
    expect(items[0]).toHaveAttribute('aria-checked', 'false');
    expect(items[1]).toHaveAttribute('aria-checked', 'true');
  });

  it('moves focus to the active collection when opened', () => {
    renderSelector({ collections: [shelf, graves], activeCollection: graves });
    openMenu();

    expect(screen.getByRole('menuitemradio', { name: /the graves collection/i })).toHaveFocus();
  });

  it('opens from the trigger with the arrow keys, landing on the first or last item', () => {
    renderSelector({ collections: [shelf, graves], activeCollection: graves });

    fireEvent.keyDown(getTrigger(), { key: 'ArrowDown' });
    expect(screen.getByRole('menuitemradio', { name: /second shelf/i })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.keyDown(getTrigger(), { key: 'ArrowUp' });
    expect(screen.getByRole('menuitem', { name: /new collection/i })).toHaveFocus();
  });

  it('selects a collection, closes, and returns focus to the trigger', () => {
    const { onSelect } = renderSelector({ collections: [shelf, graves], activeCollection: graves });
    openMenu();

    fireEvent.click(screen.getByRole('menuitemradio', { name: /second shelf/i }));

    expect(onSelect).toHaveBeenCalledWith(shelf);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(getTrigger()).toHaveFocus();
  });

  it('fires onCreateClick from the footer action and closes', () => {
    const { onCreateClick, onSelect } = renderSelector();
    openMenu();

    fireEvent.click(screen.getByRole('menuitem', { name: /new collection/i }));

    expect(onCreateClick).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape and Tab, handing focus back to the trigger', () => {
    renderSelector();

    let menu = openMenu();
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(getTrigger()).toHaveFocus();

    menu = openMenu();
    fireEvent.keyDown(menu, { key: 'Tab' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(getTrigger()).toHaveFocus();
  });

  it('moves focus with the arrow keys and wraps around', () => {
    renderSelector({ collections: [shelf, graves], activeCollection: graves });
    const menu = openMenu();
    const [first, second] = screen.getAllByRole('menuitemradio');
    const create = screen.getByRole('menuitem', { name: /new collection/i });

    // Opening via click lands on the active (second) collection.
    expect(second).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(create).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(create).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'Home' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'End' });
    expect(create).toHaveFocus();
  });

  it('shows the settings button only when a handler is given', () => {
    const { rerender } = render(
      <CollectionSelector
        collections={[graves]}
        activeCollection={graves}
        onSelect={jest.fn()}
        onCreateClick={jest.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: /collection settings/i })).not.toBeInTheDocument();

    const onSettingsClick = jest.fn();
    rerender(
      <CollectionSelector
        collections={[graves]}
        activeCollection={graves}
        onSelect={jest.fn()}
        onCreateClick={jest.fn()}
        onSettingsClick={onSettingsClick}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /collection settings/i }));
    expect(onSettingsClick).toHaveBeenCalledTimes(1);
  });
});
