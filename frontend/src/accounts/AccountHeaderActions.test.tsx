import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AccountHeaderActions } from './AccountHeaderActions';

const maraUser = {
  id: '00000000-0000-0000-0000-000000000001',
  usernameCanonical: 'mara',
  username: 'Mara',
};

const renderActions = (
  options: Partial<Parameters<typeof AccountHeaderActions>[0]> = {},
) => {
  const props = {
    accountsAvailable: true,
    currentUser: null,
    isSessionLoading: false,
    sessionError: null,
    onHome: vi.fn(),
    onOpenAccount: vi.fn(),
    onOpenProfile: vi.fn(),
    onSignOut: vi.fn(),
    ...options,
  };

  render(<AccountHeaderActions {...props} />);
  return props;
};

describe('AccountHeaderActions', () => {
  it('renders quiet unavailable account status', () => {
    renderActions({ accountsAvailable: false });

    expect(screen.getByLabelText('Account status')).toHaveTextContent(
      'Accounts are unavailable in the public demo until the backend is deployed. Mara remains available without an account.',
    );
    expect(screen.getByRole('button', { name: 'Home' }).querySelector('.lucide-house')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('opens account routes from signed-out actions', () => {
    const { onHome, onOpenAccount } = renderActions();

    fireEvent.click(screen.getByRole('button', { name: 'Home' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(onHome).toHaveBeenCalledOnce();
    expect(onOpenAccount).toHaveBeenNthCalledWith(1, 'sign-in');
    expect(onOpenAccount).toHaveBeenNthCalledWith(2, 'register');
  });

  it('renders session errors near account controls', () => {
    renderActions({ sessionError: 'Could not check your session.' });

    expect(screen.getByRole('alert')).toHaveTextContent('Could not check your session.');
  });

  it('opens the signed-in account menu', () => {
    renderActions({ currentUser: maraUser });

    const accountMenu = screen.getByRole('button', { name: 'Mara account menu' });
    fireEvent.click(accountMenu);

    const menu = screen.getByRole('menu');
    expect(accountMenu).toHaveAttribute('aria-expanded', 'true');
    expect(within(menu).getByRole('menuitem', { name: 'Home' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Profile' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('closes the account menu when clicking outside it', () => {
    render(
      <>
        <AccountHeaderActions
          accountsAvailable
          currentUser={maraUser}
          isSessionLoading={false}
          sessionError={null}
          onHome={vi.fn()}
          onOpenAccount={vi.fn()}
          onOpenProfile={vi.fn()}
          onSignOut={vi.fn()}
        />
        <button type="button">Outside</button>
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mara account menu' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the profile route and closes the account menu', () => {
    const { onOpenProfile } = renderActions({ currentUser: maraUser });

    fireEvent.click(screen.getByRole('button', { name: 'Mara account menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Profile' }));

    expect(onOpenProfile).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('signs out and closes the account menu', () => {
    const { onSignOut } = renderActions({ currentUser: maraUser });

    fireEvent.click(screen.getByRole('button', { name: 'Mara account menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(onSignOut).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens Home and closes the signed-in menu', () => {
    const { onHome } = renderActions({ currentUser: maraUser });

    fireEvent.click(screen.getByRole('button', { name: 'Mara account menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Home' }));

    expect(onHome).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes the desktop menu with Escape and returns focus to its trigger', () => {
    renderActions({ currentUser: maraUser });

    const trigger = screen.getByRole('button', { name: 'Mara account menu' });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
