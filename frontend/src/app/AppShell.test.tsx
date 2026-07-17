import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';

const maraUser = {
  id: '00000000-0000-0000-0000-000000000001',
  usernameCanonical: 'mara',
  username: 'Mara',
};

const renderShell = (
  options: Partial<Parameters<typeof AppShell>[0]> = {},
) => {
  const props = {
    accountsAvailable: false,
    children: <main>Shell content</main>,
    currentUser: null,
    isSessionLoading: false,
    sessionError: null,
    onHome: vi.fn(),
    onOpenAccount: vi.fn(),
    onOpenProfile: vi.fn(),
    onSignOut: vi.fn(),
    ...options,
  };

  const result = render(<AppShell {...props} />);
  return { ...props, ...result };
};

describe('AppShell', () => {
  it('renders brand, navigation shell, and children', () => {
    renderShell();

    expect(screen.getByRole('heading', { name: 'Hunin' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Hunin' })).toHaveAttribute('href', '/');
    expect(screen.getByText('Your party companion.')).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Create, bring in, and understand a character without decoding the whole sheet.',
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Shell content')).toBeInTheDocument();
  });

  it('opens account actions from the desktop header', () => {
    const { onHome, onOpenAccount } = renderShell({ accountsAvailable: true });

    const accountActions = screen.getByLabelText('Account actions');
    fireEvent.click(within(accountActions).getByRole('button', { name: 'Home' }));
    fireEvent.click(within(accountActions).getByRole('button', { name: 'Sign in' }));
    fireEvent.click(within(accountActions).getByRole('button', { name: 'Create account' }));

    expect(onHome).toHaveBeenCalledOnce();
    expect(onOpenAccount).toHaveBeenNthCalledWith(1, 'sign-in');
    expect(onOpenAccount).toHaveBeenNthCalledWith(2, 'register');
  });

  it('shows unavailable account copy when accounts are disabled', () => {
    renderShell();

    expect(
      screen.getByText(
        'Accounts are unavailable in the public demo until the backend is deployed. Mara remains available without an account.',
      ),
    ).toBeInTheDocument();
  });

  it('keeps the complete guest navigation available in desktop and mobile menus', () => {
    renderShell({ accountsAvailable: true });

    const desktop = screen.getByLabelText('Account actions');
    expect(within(desktop).getByRole('button', { name: 'Home' })).toBeInTheDocument();
    expect(within(desktop).getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(within(desktop).getByRole('button', { name: 'Create account' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const mobile = screen.getByRole('menu');
    expect(within(mobile).getByRole('menuitem', { name: 'Home' })).toBeInTheDocument();
    expect(within(mobile).getByRole('menuitem', { name: 'Sign in' })).toBeInTheDocument();
    expect(within(mobile).getByRole('menuitem', { name: 'Create account' })).toBeInTheDocument();
  });

  it('opens mobile account actions and closes them with Escape', () => {
    const { onOpenAccount } = renderShell({ accountsAvailable: true });

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const menu = screen.getByRole('menu');
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Sign in' }));

    expect(onOpenAccount).toHaveBeenCalledWith('sign-in');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveFocus();
  });

  it('uses the menu icon while signed out and the account icon while signed in', () => {
    const { rerender } = renderShell({ accountsAvailable: true });

    const signedOutMenu = screen.getByRole('button', { name: 'Menu' });
    expect(signedOutMenu.querySelector('.lucide-menu')).toBeInTheDocument();

    rerender(
      <AppShell
        accountsAvailable
        currentUser={maraUser}
        isSessionLoading={false}
        sessionError={null}
        onHome={vi.fn()}
        onOpenAccount={vi.fn()}
        onOpenProfile={vi.fn()}
        onSignOut={vi.fn()}
      >
        <main>Shell content</main>
      </AppShell>,
    );

    const signedInMenu = screen.getByRole('button', { name: 'Mara mobile account menu' });
    expect(signedInMenu.querySelector('.lucide-user-round')).toBeInTheDocument();
  });

  it('signs out from the mobile account menu', () => {
    const { onSignOut } = renderShell({
      accountsAvailable: true,
      currentUser: maraUser,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mara mobile account menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(onSignOut).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the profile and closes the mobile account menu', () => {
    const { onOpenProfile } = renderShell({
      accountsAvailable: true,
      currentUser: maraUser,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mara mobile account menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Profile' }));

    expect(onOpenProfile).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens Home from the signed-in mobile menu', () => {
    const { onHome } = renderShell({ accountsAvailable: true, currentUser: maraUser });

    fireEvent.click(screen.getByRole('button', { name: 'Mara mobile account menu' }));
    const homeItem = screen.getByRole('menuitem', { name: 'Home' });
    expect(homeItem.querySelector('.lucide-house')).toBeInTheDocument();
    fireEvent.click(homeItem);

    expect(onHome).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
