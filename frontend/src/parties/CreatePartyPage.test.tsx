import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PartiesApiError } from './api';
import type { CreatePartyResponseDTO } from './apiTypes';
import { CreatePartyPage } from './CreatePartyPage';

const createdParty: CreatePartyResponseDTO = {
  id: 'party-1',
  name: 'The Lantern Guard',
  role: 'gm',
};

describe('CreatePartyPage', () => {
  it('renders a labelled Party name field and optional cancel action', () => {
    const onCancel = vi.fn();

    renderPage({ onCancel });

    expect(screen.getByRole('heading', { name: 'Create a party' })).toBeInTheDocument();
    expect(screen.getByLabelText('Party name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create party' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('provides scoped form and action-group hooks', () => {
    const { container } = renderPage({ onCancel: vi.fn() });

    expect(container.querySelector('main')).toHaveClass('party-page', 'party-create-page');
    expect(screen.getByRole('heading', { name: 'Create a party' })).toHaveClass(
      'party-form__title',
    );

    const nameInput = screen.getByLabelText('Party name');
    expect(nameInput).toHaveClass('party-form__input');
    expect(nameInput.closest('label')).toHaveClass('party-form__field');

    const form = screen.getByRole('button', { name: 'Create party' }).closest('form');
    expect(form).toHaveClass('party-form');
    expect(form?.querySelector('.party-actions')).toContainElement(
      screen.getByRole('button', { name: 'Cancel' }),
    );
  });

  it('shows inline validation and focuses an invalid Party name field', () => {
    const createParty = vi.fn();

    renderPage({ createParty });
    const nameInput = screen.getByLabelText('Party name');
    fireEvent.change(nameInput, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create party' }));

    expect(createParty).not.toHaveBeenCalled();
    expect(nameInput).toHaveFocus();
    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    const validationError = screen.getByText('Enter a party name.');
    expect(nameInput).toHaveAttribute('aria-describedby', validationError.id);
  });

  it('submits the trimmed name and reports the created Party id', async () => {
    const createParty = vi.fn().mockResolvedValue(createdParty);
    const onPartyCreated = vi.fn();

    renderPage({ createParty, onPartyCreated });
    fireEvent.change(screen.getByLabelText('Party name'), {
      target: { value: '  The Lantern Guard  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create party' }));

    await waitFor(() => {
      expect(createParty).toHaveBeenCalledWith({ name: 'The Lantern Guard' });
      expect(onPartyCreated).toHaveBeenCalledWith('party-1');
    });
  });

  it('disables submission and prevents duplicate requests while pending', () => {
    const pendingCreate = deferred<CreatePartyResponseDTO>();
    const createParty = vi.fn().mockReturnValue(pendingCreate.promise);

    renderPage({ createParty });
    fireEvent.change(screen.getByLabelText('Party name'), {
      target: { value: 'The Lantern Guard' },
    });
    const submitButton = screen.getByRole('button', { name: 'Create party' });
    const form = submitButton.closest('form');

    fireEvent.submit(form as HTMLFormElement);
    fireEvent.submit(form as HTMLFormElement);

    expect(screen.getByRole('button', { name: 'Creating party...' })).toBeDisabled();
    expect(createParty).toHaveBeenCalledOnce();
  });

  it('preserves the entered name and shows a safe API error', async () => {
    const createParty = vi.fn().mockRejectedValue(
      new PartiesApiError('The party request failed. Please try again.', 500, 'server_error'),
    );

    renderPage({ createParty });
    const nameInput = screen.getByLabelText('Party name');
    fireEvent.change(nameInput, { target: { value: 'The Lantern Guard' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create party' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The party request failed. Please try again.',
    );
    expect(nameInput).toHaveValue('The Lantern Guard');
  });

  it('does not expose unexpected error details', async () => {
    const createParty = vi.fn().mockRejectedValue(
      new Error('sensitive backend and request details'),
    );

    renderPage({ createParty });
    fireEvent.change(screen.getByLabelText('Party name'), {
      target: { value: 'The Lantern Guard' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create party' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not create the party. Please try again.');
    expect(alert).not.toHaveTextContent('sensitive backend and request details');
  });

  it('clears stale validation and server errors when the user edits', async () => {
    const createParty = vi.fn().mockRejectedValue(
      new PartiesApiError('The party request failed. Please try again.', 500, 'server_error'),
    );

    renderPage({ createParty });
    const nameInput = screen.getByLabelText('Party name');

    fireEvent.click(screen.getByRole('button', { name: 'Create party' }));
    expect(screen.getByText('Enter a party name.')).toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: 'The Lantern Guard' } });
    expect(screen.queryByText('Enter a party name.')).not.toBeInTheDocument();
    expect(nameInput).not.toHaveAttribute('aria-invalid');

    fireEvent.click(screen.getByRole('button', { name: 'Create party' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: 'The Silver Guard' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears a stale server error when retrying', async () => {
    const retry = deferred<CreatePartyResponseDTO>();
    const createParty = vi
      .fn()
      .mockRejectedValueOnce(
        new PartiesApiError('The party request failed. Please try again.', 500, 'server_error'),
      )
      .mockReturnValueOnce(retry.promise);

    renderPage({ createParty });
    fireEvent.change(screen.getByLabelText('Party name'), {
      target: { value: 'The Lantern Guard' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create party' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create party' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Creating party...' })).toBeDisabled();
    expect(createParty).toHaveBeenCalledTimes(2);
  });
});

const renderPage = ({
  createParty = vi.fn().mockResolvedValue(createdParty),
  onPartyCreated = vi.fn(),
  onCancel,
}: {
  createParty?: (input: { name: string }) => Promise<CreatePartyResponseDTO>;
  onPartyCreated?: (partyId: string) => void;
  onCancel?: () => void;
} = {}) => {
  return render(
    <CreatePartyPage
      createParty={createParty}
      onPartyCreated={onPartyCreated}
      onCancel={onCancel}
    />,
  );
};

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => {};
  let reject: (reason?: unknown) => void = () => {};
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
};
