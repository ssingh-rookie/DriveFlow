'use client';

import { useState } from 'react';
import { LessonBookingForm } from '../../../components/lessons/LessonBookingForm';
import { LessonResponse } from '@driveflow/contracts';

export default function BookLessonPage() {
  const [bookedLesson, setBookedLesson] = useState<LessonResponse | null>(null);
  const [showForm, setShowForm] = useState(true);

  const handleBookingSuccess = (lesson: LessonResponse) => {
    setBookedLesson(lesson);
    console.log('Lesson booked successfully:', lesson);
  };

  const handleCancel = () => {
    setShowForm(false);
    // In a real app, this might navigate back to dashboard
    window.history.back();
  };

  const handleBookAnother = () => {
    setBookedLesson(null);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Book a Driving Lesson</h1>
          <p className="text-gray-600">Choose your instructor, select a time, and get started with your driving journey!</p>
        </div>

        {/* Demo User Context */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h2 className="text-sm font-semibold text-blue-900 mb-2">🎭 Demo Context</h2>
          <p className="text-sm text-blue-800">
            <strong>Persona:</strong> Student User | 
            <strong> Role:</strong> Learner | 
            <strong> Permissions:</strong> Can book own lessons, view own lessons
          </p>
          <p className="text-xs text-blue-600 mt-1">
            This booking form demonstrates the student booking experience with mock data.
          </p>
        </div>

        {/* API Status */}
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <h2 className="text-sm font-semibold text-green-900 mb-2">🔗 API Connection</h2>
          <p className="text-sm text-green-800">
            Connected to DriveFlow API at <code className="bg-green-100 px-1 rounded">http://localhost:3001</code>
          </p>
          <p className="text-xs text-green-600 mt-1">
            Bookings will be created via POST /api/lessons endpoint
          </p>
        </div>

        {/* Booking Form */}
        {showForm && (
          <LessonBookingForm 
            onSuccess={handleBookingSuccess}
            onCancel={handleCancel}
          />
        )}

        {/* Success State (if needed) */}
        {bookedLesson && (
          <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
            <h2 className="text-lg font-semibold text-green-900 mb-4">✅ Booking Confirmed!</h2>
            <div className="text-sm text-green-800 space-y-2">
              <p><strong>Lesson ID:</strong> {bookedLesson.id}</p>
              <p><strong>Status:</strong> {bookedLesson.status}</p>
              <p><strong>Created:</strong> {bookedLesson.createdAt}</p>
            </div>
            
            <div className="mt-4 space-x-3">
              <button
                onClick={handleBookAnother}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Book Another Lesson
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-green-600 text-green-600 rounded-md hover:bg-green-50"
              >
                View My Lessons
              </button>
            </div>
          </div>
        )}

        {/* Development Notes */}
        <div className="mt-12 p-6 bg-gray-100 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🔧 Development Notes</h2>
          <div className="text-sm text-gray-700 space-y-2">
            <p><strong>Implementation Status:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>✅ Multi-step booking flow (Details → Time → Payment → Confirmation)</li>
              <li>✅ Form validation and error handling</li>
              <li>✅ Mock instructor and service data</li>
              <li>✅ Real API integration with DriveFlow backend</li>
              <li>✅ Responsive design with loading states</li>
              <li>🔄 Mock payment integration (placeholder for Stripe)</li>
              <li>🔄 Mock availability checking (will integrate with backend)</li>
              <li>🔄 Real-time slot updates (future enhancement)</li>
            </ul>
            
            <p className="mt-4"><strong>Next Steps:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Integrate with real instructor/service APIs</li>
              <li>Connect to availability service for real-time slots</li>
              <li>Add Stripe payment integration</li>
              <li>Add user authentication context</li>
              <li>Implement proper error boundaries</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}