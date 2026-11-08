import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateCollection } from './CreateCollection';

// Mock useCollection hook
const mockCreateNewCollection = jest.fn();
jest.mock('@/hooks/useCollection', () => ({
  useCollection: () => ({
    createNewCollection: mockCreateNewCollection,
  }),
}));

describe('CreateCollection', () => {
  beforeEach(() => {
    mockCreateNewCollection.mockReset();
    mockCreateNewCollection.mockResolvedValue('new-collection-id');
  });

  it('renders form fields', () => {
    render(<CreateCollection />);

    expect(screen.getByLabelText(/collection name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/owners/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create collection/i })).toBeInTheDocument();
  });

  it('shows error when submitting without name', async () => {
    render(<CreateCollection />);

    fireEvent.click(screen.getByRole('button', { name: /create collection/i }));

    expect(await screen.findByText(/please enter a collection name/i)).toBeInTheDocument();
    expect(mockCreateNewCollection).not.toHaveBeenCalled();
  });

  it('shows error when submitting without owners', async () => {
    render(<CreateCollection />);

    await userEvent.type(screen.getByLabelText(/collection name/i), 'My Collection');
    fireEvent.click(screen.getByRole('button', { name: /create collection/i }));

    expect(await screen.findByText(/please enter at least one owner name/i)).toBeInTheDocument();
    expect(mockCreateNewCollection).not.toHaveBeenCalled();
  });

  it('creates collection with valid input', async () => {
    render(<CreateCollection />);

    await userEvent.type(screen.getByLabelText(/collection name/i), 'The Graves Collection');
    await userEvent.type(screen.getByLabelText(/owners/i), 'Ryan, Alyssa');
    fireEvent.click(screen.getByRole('button', { name: /create collection/i }));

    await waitFor(() => {
      expect(mockCreateNewCollection).toHaveBeenCalledWith('The Graves Collection', [
        'Ryan',
        'Alyssa',
      ]);
    });
  });

  it('trims whitespace from name and owners', async () => {
    render(<CreateCollection />);

    await userEvent.type(screen.getByLabelText(/collection name/i), '  My Collection  ');
    await userEvent.type(screen.getByLabelText(/owners/i), '  Ryan  ,  Alyssa  ');
    fireEvent.click(screen.getByRole('button', { name: /create collection/i }));

    await waitFor(() => {
      expect(mockCreateNewCollection).toHaveBeenCalledWith('My Collection', ['Ryan', 'Alyssa']);
    });
  });

  it('filters out empty owner entries', async () => {
    render(<CreateCollection />);

    await userEvent.type(screen.getByLabelText(/collection name/i), 'My Collection');
    await userEvent.type(screen.getByLabelText(/owners/i), 'Ryan, , Alyssa, ');
    fireEvent.click(screen.getByRole('button', { name: /create collection/i }));

    await waitFor(() => {
      expect(mockCreateNewCollection).toHaveBeenCalledWith('My Collection', ['Ryan', 'Alyssa']);
    });
  });

  it('shows loading state while submitting', async () => {
    mockCreateNewCollection.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<CreateCollection />);

    await userEvent.type(screen.getByLabelText(/collection name/i), 'My Collection');
    await userEvent.type(screen.getByLabelText(/owners/i), 'Ryan');
    fireEvent.click(screen.getByRole('button', { name: /create collection/i }));

    expect(await screen.findByText(/creating/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/collection name/i)).toBeDisabled();
    expect(screen.getByLabelText(/owners/i)).toBeDisabled();
  });

  it('reports the new collection id through onCreated', async () => {
    const onCreated = jest.fn();
    render(<CreateCollection onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText(/collection name/i), 'Second Shelf');
    await userEvent.type(screen.getByLabelText(/owners/i), 'Ryan');
    fireEvent.click(screen.getByRole('button', { name: /create collection/i }));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith('new-collection-id');
    });
  });

  it('does not call onCreated when creation fails', async () => {
    mockCreateNewCollection.mockRejectedValue(new Error('Network error'));
    const onCreated = jest.fn();
    render(<CreateCollection onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText(/collection name/i), 'Second Shelf');
    await userEvent.type(screen.getByLabelText(/owners/i), 'Ryan');
    fireEvent.click(screen.getByRole('button', { name: /create collection/i }));

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('uses onboarding copy by default and accepts custom copy', () => {
    const { rerender } = render(<CreateCollection />);
    expect(screen.getByRole('heading', { name: /create your collection/i })).toBeInTheDocument();

    rerender(<CreateCollection title="New Collection" description="Start another one." />);
    expect(screen.getByRole('heading', { name: /^new collection$/i })).toBeInTheDocument();
    expect(screen.getByText('Start another one.')).toBeInTheDocument();
  });

  it('shows error message on creation failure', async () => {
    mockCreateNewCollection.mockRejectedValue(new Error('Network error'));

    render(<CreateCollection />);

    await userEvent.type(screen.getByLabelText(/collection name/i), 'My Collection');
    await userEvent.type(screen.getByLabelText(/owners/i), 'Ryan');
    fireEvent.click(screen.getByRole('button', { name: /create collection/i }));

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });
});
