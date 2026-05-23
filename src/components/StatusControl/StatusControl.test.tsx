import { render, screen, fireEvent, act } from '@testing-library/react';
import { StatusControl } from './StatusControl';

jest.mock('@/lib/supabase', () => ({
  updateSet: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

import { updateSet } from '@/lib/supabase';
import { toast } from 'sonner';

const mockUpdateSet = updateSet as jest.MockedFunction<typeof updateSet>;
const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>;

beforeEach(() => {
  mockUpdateSet.mockReset();
  mockToastError.mockReset();
});

describe('StatusControl', () => {
  it('renders the current status as the badge label', () => {
    render(<StatusControl setId="set-1" currentStatus="assembled" />);

    const badge = screen.getByRole('button', { name: /change status, currently assembled/i });
    expect(badge).toHaveTextContent('Assembled');
    expect(badge).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands into a chip row when the badge is clicked', () => {
    render(<StatusControl setId="set-1" currentStatus="unopened" />);

    fireEvent.click(screen.getByRole('button', { name: /change status/i }));

    expect(screen.getByRole('radiogroup', { name: /set status/i })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('radio', { name: 'Unopened' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('optimistically updates the badge label and persists via updateSet on pick', async () => {
    mockUpdateSet.mockResolvedValue();
    render(<StatusControl setId="set-1" currentStatus="in_progress" />);

    fireEvent.click(screen.getByRole('button', { name: /change status/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: 'Assembled' }));
    });

    expect(mockUpdateSet).toHaveBeenCalledWith('set-1', {
      status: 'assembled',
      hasBeenAssembled: true,
    });
    expect(
      screen.getByRole('button', { name: /change status, currently assembled/i })
    ).toBeInTheDocument();
  });

  it('reverts the badge and fires a toast when updateSet fails', async () => {
    mockUpdateSet.mockRejectedValue(new Error('network down'));
    render(<StatusControl setId="set-1" currentStatus="unopened" />);

    fireEvent.click(screen.getByRole('button', { name: /change status/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: 'Assembled' }));
    });

    expect(mockToastError).toHaveBeenCalledWith(
      "Couldn't update status",
      expect.objectContaining({ description: 'network down' })
    );
    expect(
      screen.getByRole('button', { name: /change status, currently unopened/i })
    ).toBeInTheDocument();
  });

  it('closes the chip row without saving when the same status is picked', async () => {
    render(<StatusControl setId="set-1" currentStatus="assembled" />);

    fireEvent.click(screen.getByRole('button', { name: /change status/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: 'Assembled' }));
    });

    expect(mockUpdateSet).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /change status, currently assembled/i })
    ).toHaveAttribute('aria-expanded', 'false');
  });
});
