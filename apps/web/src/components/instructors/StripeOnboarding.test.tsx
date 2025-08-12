import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StripeOnboarding } from './StripeOnboarding';
import { makeClient } from '@driveflow/clients';
import { StripeAccountStatusDto } from '@driveflow/contracts';

jest.mock('@driveflow/clients');

const mockApi = {
  GET: jest.fn(),
};

(makeClient as jest.Mock).mockReturnValue(mockApi);

describe('StripeOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<StripeOnboarding instructorId="test-instructor" />);
    expect(screen.getByText('Loading Stripe status...')).toBeInTheDocument();
  });

  it('should display the Complete status', async () => {
    const mockStatus: StripeAccountStatusDto = { status: 'Complete', requirements: [] };
    mockApi.GET.mockResolvedValue({ data: mockStatus });

    render(<StripeOnboarding instructorId="test-instructor" />);

    expect(await screen.findByText('Status:')).toBeInTheDocument();
    expect(await screen.findByText('Complete')).toBeInTheDocument();
    expect(await screen.findByText('Your Stripe account is connected and ready for payouts.')).toBeInTheDocument();
  });

  it('should display the Pending status with requirements', async () => {
    const mockStatus: StripeAccountStatusDto = { status: 'Pending', requirements: ['bank_account', 'person.id_number'] };
    mockApi.GET.mockResolvedValue({ data: mockStatus });

    render(<StripeOnboarding instructorId="test-instructor" />);

    expect(await screen.findByText('Status:')).toBeInTheDocument();
    expect(await screen.findByText('Pending')).toBeInTheDocument();
    expect(await screen.findByText('Requirements:')).toBeInTheDocument();
    expect(await screen.findByText('bank_account')).toBeInTheDocument();
    expect(await screen.findByText('person.id_number')).toBeInTheDocument();
  });

  it('should display an error message on API failure', async () => {
    mockApi.GET.mockRejectedValue(new Error('API Error'));

    render(<StripeOnboarding instructorId="test-instructor" />);

    expect(await screen.findByText('Error: API Error')).toBeInTheDocument();
  });

  it('should call the connect link endpoint and redirect on button click', async () => {
    const initialStatus: StripeAccountStatusDto = { status: 'Pending', requirements: [] };
    mockApi.GET.mockResolvedValueOnce({ data: initialStatus });
    
    const connectLink = 'https://connect.stripe.com/onboarding/test-link';
    mockApi.GET.mockResolvedValueOnce({ data: { onboardingLink: connectLink } });

    Object.defineProperty(window, 'location', {
        value: {
          href: '',
        },
        writable: true,
      });

    render(<StripeOnboarding instructorId="test-instructor" />);

    const button = await screen.findByText('Connect with Stripe');
    fireEvent.click(button);

    await waitFor(() => {
        expect(mockApi.GET).toHaveBeenCalledWith('/payments/instructors/{id}/stripe/connect-link', {
            params: { path: { id: 'test-instructor' } },
        });
    });
    
    await waitFor(() => {
        expect(window.location.href).toBe(connectLink);
    });
  });
});
