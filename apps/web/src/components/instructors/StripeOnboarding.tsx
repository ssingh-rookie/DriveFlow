'use client';

import { useState, useEffect } from 'react';
import { makeClient } from '@driveflow/clients';
import { StripeAccountStatusDto } from '@driveflow/contracts';

const api = makeClient({ baseUrl: '/api' });

// TODO: Import real types from @driveflow/contracts - THIS IS NOW DONE
// type PayoutReadinessStatus = 'Not Started' | 'Pending' | 'Restricted' | 'Complete';
// interface StripeAccountStatus {
//   status: PayoutReadinessStatus;
//   requirements: string[];
// }

interface StripeOnboardingProps {
  instructorId: string;
}

export function StripeOnboarding({ instructorId }: StripeOnboardingProps) {
  const [status, setStatus] = useState<StripeAccountStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        setLoading(true);
        
        // Check if we're returning from Stripe onboarding
        const urlParams = new URLSearchParams(window.location.search);
        const stripeOnboarding = urlParams.get('stripe_onboarding');
        
        if (stripeOnboarding === 'success') {
          // Simulate successful onboarding completion
          setStatus({
            status: 'Complete',
            requirements: []
          });
          setLoading(false);
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }
        
        const response = await fetch(`http://localhost:3001/api/payments/instructors/${instructorId}/payout-readiness`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setStatus(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch Stripe status.');
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, [instructorId]);

  const handleConnect = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/payments/instructors/${instructorId}/stripe/connect-link`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // For demo purposes, show what would happen and offer to simulate
      const userChoice = confirm(
        `🚀 STRIPE CONNECT FLOW:\n\n` +
        `1. You'd be redirected to: ${data.onboardingLink}\n` +
        `2. Fill out business details on Stripe\n` +
        `3. Stripe redirects back to your app\n` +
        `4. Status updates to "Complete"\n\n` +
        `Click OK to simulate successful onboarding\n` +
        `Click Cancel to see the real Stripe URL`
      );
      
      if (userChoice) {
        // Simulate successful onboarding
        setStatus({
          status: 'Complete',
          requirements: []
        });
        alert('🎉 Simulated: Stripe account connected successfully!');
      } else {
        // Show the real URL (in production, you'd redirect here)
        alert(`Real Stripe URL:\n${data.onboardingLink}\n\n(In production: window.location.href = data.onboardingLink)`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate connect link.');
    }
  };

  if (loading) {
    return <div>Loading Stripe status...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div className="p-6 border rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Stripe Payouts</h2>
      <p className="mb-2">
        Status: <span className="font-bold">{status?.status}</span>
      </p>

      {status?.status === 'Complete' && (
        <p className="text-green-600">Your Stripe account is connected and ready for payouts.</p>
      )}

      {status?.status !== 'Complete' && (
        <>
          <button
            onClick={handleConnect}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Connect with Stripe
          </button>
          
          {status?.requirements && status.requirements.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold">Requirements:</h3>
              <ul className="list-disc list-inside">
                {status.requirements.map((req) => (
                  <li key={req}>{req}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
