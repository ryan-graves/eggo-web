import { render, screen, fireEvent } from '@testing-library/react';
import { StatusPicker } from './StatusPicker';

describe('StatusPicker', () => {
  it('renders the current value as the badge and is closed by default', () => {
    render(<StatusPicker value="assembled" onChange={jest.fn()} />);

    const badge = screen.getByRole('button', { name: /change status, currently assembled/i });
    expect(badge).toHaveTextContent('Assembled');
    expect(badge).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('reports a new pick through onChange and closes', () => {
    const onChange = jest.fn();
    render(<StatusPicker value="unopened" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /change status/i }));
    fireEvent.click(screen.getByRole('radio', { name: 'Assembled' }));

    expect(onChange).toHaveBeenCalledWith('assembled');
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('does not call onChange when the current value is re-picked', () => {
    const onChange = jest.fn();
    render(<StatusPicker value="assembled" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /change status/i }));
    fireEvent.click(screen.getByRole('radio', { name: 'Assembled' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('ignores clicks while busy but stays focusable', () => {
    render(<StatusPicker value="assembled" onChange={jest.fn()} busy />);

    const badge = screen.getByRole('button', { name: /change status/i });
    fireEvent.click(badge);

    expect(badge).toHaveAttribute('aria-disabled', 'true');
    expect(badge).not.toBeDisabled();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('cannot be opened while disabled', () => {
    render(<StatusPicker value="assembled" onChange={jest.fn()} disabled />);

    const badge = screen.getByRole('button', { name: /change status/i });
    expect(badge).toBeDisabled();
    fireEvent.click(badge);
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('closes an open menu when it becomes disabled', () => {
    const { rerender } = render(<StatusPicker value="assembled" onChange={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /change status/i }));
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();

    rerender(<StatusPicker value="assembled" onChange={jest.fn()} disabled />);
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('does not reopen on its own when re-enabled after being disabled while open', () => {
    const { rerender } = render(<StatusPicker value="assembled" onChange={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /change status/i }));
    rerender(<StatusPicker value="assembled" onChange={jest.fn()} disabled />);
    rerender(<StatusPicker value="assembled" onChange={jest.fn()} />);

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change status/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('names the subject in its accessible labels', () => {
    render(<StatusPicker value="unopened" onChange={jest.fn()} subject="Galaxy Explorer" />);

    fireEvent.click(
      screen.getByRole('button', { name: /change status for galaxy explorer, currently unopened/i })
    );
    expect(
      screen.getByRole('radiogroup', { name: 'Set status for Galaxy Explorer' })
    ).toBeInTheDocument();
  });

  it('uses the small badge class when size is sm', () => {
    render(<StatusPicker value="unopened" onChange={jest.fn()} size="sm" />);
    expect(screen.getByRole('button', { name: /change status/i })).toHaveClass('status-badge-sm');
  });
});
