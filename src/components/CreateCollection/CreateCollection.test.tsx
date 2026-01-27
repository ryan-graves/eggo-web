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

  it('shows error message on creation failure', async () => {
    mockCreateNewCollection.mockRejectedValue(new Error('Network error'));

    render(<CreateCollection />);

    await userEvent.type(screen.getByLabelText(/collection name/i), 'My Collection');
    await userEvent.type(screen.getByLabelText(/owners/i), 'Ryan');
    fireEvent.click(screen.getByRole('button', { name: /create collection/i }));

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });
});
