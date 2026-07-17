import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProfilePage } from './ProfilePage';

const maraUser = {
  id: '00000000-0000-0000-0000-000000000001',
  usernameCanonical: 'mara',
  username: 'Mara',
};

const renderProfile = (
  options: Partial<Parameters<typeof ProfilePage>[0]> = {},
) => {
  const props = {
    currentUser: maraUser,
    isSessionLoading: false,
    sessionError: null,
    onSignIn: vi.fn(),
    onSignOut: vi.fn(),
    ...options,
  };

  render(<ProfilePage {...props} />);
  return props;
};

describe('ProfilePage', () => {
  it('shows the signed-in username without exposing email', () => {
    renderProfile();

    expect(screen.getByRole('heading', { name: 'Mara' })).toBeInTheDocument();
    expect(screen.getByText(/profile is read-only/i)).toBeInTheDocument();
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });

  it('removes the redundant Home action and preserves sign-out', () => {
    const { onSignOut } = renderProfile();

    expect(screen.queryByRole('button', { name: 'Home' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it('shows a sign-in-required state and opens sign in while signed out', () => {
    const { onSignIn } = renderProfile({ currentUser: null });

    expect(
      screen.getByRole('heading', { name: 'Sign in to view your profile.' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(onSignIn).toHaveBeenCalledOnce();
    expect(screen.queryByText('Mara')).not.toBeInTheDocument();
  });

  it('hides private and signed-out content while the session is loading', () => {
    renderProfile({ isSessionLoading: true });

    expect(
      screen.getByRole('heading', { name: 'Checking your account...' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Mara')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
    expect(screen.queryByText('Sign in to view your profile.')).not.toBeInTheDocument();
  });

  it('announces session errors and hides private content', () => {
    renderProfile({ sessionError: 'Could not check your session.' });

    expect(screen.getByRole('alert')).toHaveTextContent('Could not check your session.');
    expect(
      screen.getByRole('heading', { name: 'Could not load your profile' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Mara')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });
});
