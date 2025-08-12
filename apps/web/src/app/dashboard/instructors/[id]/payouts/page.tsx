'use client';

import { StripeOnboarding } from "@/components/instructors/StripeOnboarding";

interface PayoutsPageProps {
  params: {
    id: string;
  };
}

export default async function PayoutsPage({ params }: PayoutsPageProps) {
  const { id } = await params;

  if (!id) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Instructor Payouts</h1>
      <StripeOnboarding instructorId={id} />
    </div>
  );
}
