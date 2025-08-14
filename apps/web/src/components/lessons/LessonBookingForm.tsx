'use client';

import { useState, useEffect } from 'react';
import { makeClient } from '@driveflow/clients';
import { CreateLessonRequest, LessonResponse } from '@driveflow/contracts';

const api = makeClient({ baseUrl: '/api' });

interface LessonBookingFormProps {
  onSuccess?: (lesson: LessonResponse) => void;
  onCancel?: () => void;
}

interface BookingFormData {
  instructorId: string;
  serviceId: string;
  startAt: string;
  endAt: string;
  pickupAddress: string;
  dropoffAddress: string;
  notes?: string;
}

interface Instructor {
  id: string;
  displayName: string;
  available: boolean;
}

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
}

export function LessonBookingForm({ onSuccess, onCancel }: LessonBookingFormProps) {
  const [formData, setFormData] = useState<BookingFormData>({
    instructorId: '',
    serviceId: '',
    startAt: '',
    endAt: '',
    pickupAddress: '',
    dropoffAddress: '',
    notes: ''
  });

  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'details' | 'time' | 'payment' | 'confirmation'>('details');

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Update end time when service or start time changes
  useEffect(() => {
    if (formData.serviceId && formData.startAt) {
      const service = services.find(s => s.id === formData.serviceId);
      if (service) {
        const startDate = new Date(formData.startAt);
        const endDate = new Date(startDate.getTime() + service.durationMinutes * 60000);
        setFormData(prev => ({
          ...prev,
          endAt: endDate.toISOString().slice(0, 16) // Format for datetime-local input
        }));
      }
    }
  }, [formData.serviceId, formData.startAt, services]);

  // Load available time slots when instructor and service are selected
  useEffect(() => {
    if (formData.instructorId && formData.serviceId) {
      loadAvailableSlots();
    }
  }, [formData.instructorId, formData.serviceId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Mock data for now - in real app, would fetch from API
      const mockInstructors: Instructor[] = [
        { id: 'inst_1', displayName: 'John Smith', available: true },
        { id: 'inst_2', displayName: 'Sarah Wilson', available: true },
        { id: 'inst_3', displayName: 'Mike Johnson', available: false }
      ];

      const mockServices: Service[] = [
        { id: 'svc_1', name: 'Standard Driving Lesson', durationMinutes: 60, priceCents: 8000 },
        { id: 'svc_2', name: 'Highway Driving Lesson', durationMinutes: 90, priceCents: 12000 },
        { id: 'svc_3', name: 'Parallel Parking Practice', durationMinutes: 45, priceCents: 6000 }
      ];

      setInstructors(mockInstructors);
      setServices(mockServices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load booking data');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    try {
      // Mock available slots - in real app, would call availability API
      const today = new Date();
      const slots: string[] = [];
      
      // Generate next 7 days of available slots (9 AM - 5 PM)
      for (let day = 0; day < 7; day++) {
        const date = new Date(today);
        date.setDate(today.getDate() + day);
        
        for (let hour = 9; hour < 17; hour++) {
          const slotTime = new Date(date);
          slotTime.setHours(hour, 0, 0, 0);
          slots.push(slotTime.toISOString().slice(0, 16));
        }
      }
      
      setAvailableSlots(slots);
    } catch (err) {
      setError('Failed to load available time slots');
    }
  };

  const handleInputChange = (field: keyof BookingFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const validateStep = (currentStep: string): boolean => {
    switch (currentStep) {
      case 'details':
        return !!(formData.instructorId && formData.serviceId && formData.pickupAddress);
      case 'time':
        return !!(formData.startAt && formData.endAt);
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(step)) {
      setError('Please fill in all required fields');
      return;
    }

    const steps: typeof step[] = ['details', 'time', 'payment', 'confirmation'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: typeof step[] = ['details', 'time', 'payment', 'confirmation'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create lesson request
      const lessonRequest: CreateLessonRequest = {
        instructorId: formData.instructorId,
        serviceId: formData.serviceId,
        startAt: formData.startAt,
        endAt: formData.endAt,
        pickupAddress: formData.pickupAddress,
        dropoffAddress: formData.dropoffAddress || formData.pickupAddress,
        notes: formData.notes
      };

      // Call our simple lesson API endpoint
      const response = await fetch('http://localhost:3001/api/lessons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lessonRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const lesson: LessonResponse = await response.json();
      
      setStep('confirmation');
      onSuccess?.(lesson);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book lesson');
    } finally {
      setLoading(false);
    }
  };

  const selectedService = services.find(s => s.id === formData.serviceId);
  const selectedInstructor = instructors.find(i => i.id === formData.instructorId);

  if (loading && instructors.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <a 
          href="/"
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Back to Home
        </a>
        
        <div className="flex items-center space-x-4">
          <a 
            href="/lessons"
            className="text-gray-600 hover:text-gray-900 text-sm"
          >
            My Lessons
          </a>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-900">Book Lesson</span>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {['Details', 'Time', 'Payment', 'Confirmation'].map((stepName, index) => {
            const stepValues = ['details', 'time', 'payment', 'confirmation'];
            const currentStepIndex = stepValues.indexOf(step);
            const isActive = index === currentStepIndex;
            const isComplete = index < currentStepIndex;
            
            return (
              <div key={stepName} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${isComplete ? 'bg-green-600 text-white' : 
                    isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
                `}>
                  {isComplete ? '✓' : index + 1}
                </div>
                <span className={`ml-2 text-sm ${isActive ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                  {stepName}
                </span>
                {index < 3 && <div className="w-12 h-px bg-gray-300 mx-4" />}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Step Content */}
      {step === 'details' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Lesson Details</h2>
          
          {/* Service Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Type *
            </label>
            <select
              value={formData.serviceId}
              onChange={(e) => handleInputChange('serviceId', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              style={{ color: '#111827' }}
              required
            >
              <option value="" style={{ color: '#6B7280' }}>Select a service...</option>
              {services.map(service => (
                <option key={service.id} value={service.id} style={{ color: '#111827', backgroundColor: '#FFFFFF' }}>
                  {service.name} ({service.durationMinutes} min) - ${(service.priceCents / 100).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {/* Instructor Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructor *
            </label>
            <select
              value={formData.instructorId}
              onChange={(e) => handleInputChange('instructorId', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              style={{ color: '#111827' }}
              required
            >
              <option value="" style={{ color: '#6B7280' }}>Select an instructor...</option>
              {instructors.filter(i => i.available).map(instructor => (
                <option key={instructor.id} value={instructor.id} style={{ color: '#111827', backgroundColor: '#FFFFFF' }}>
                  {instructor.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Pickup Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pickup Address *
            </label>
            <input
              type="text"
              value={formData.pickupAddress}
              onChange={(e) => handleInputChange('pickupAddress', e.target.value)}
              placeholder="Enter pickup address..."
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
              style={{ color: '#000000' }}
              required
            />
          </div>

          {/* Dropoff Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Drop-off Address
            </label>
            <input
              type="text"
              value={formData.dropoffAddress}
              onChange={(e) => handleInputChange('dropoffAddress', e.target.value)}
              placeholder="Enter drop-off address (optional)..."
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
              style={{ color: '#000000' }}
            />
            <p className="text-sm text-gray-500 mt-1">Leave blank to use pickup address</p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any special requirements or notes..."
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
              style={{ color: '#000000' }}
            />
          </div>
        </div>
      )}

      {step === 'time' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Select Date & Time</h2>
          
          {selectedService && (
            <div className="p-4 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>{selectedService.name}</strong> ({selectedService.durationMinutes} minutes)
                with <strong>{selectedInstructor?.displayName}</strong>
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Date & Time *
            </label>
            
            {/* Date and Time in separate fields for better browser compatibility */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.startAt ? formData.startAt.slice(0, 10) : ''}
                  onChange={(e) => {
                    const timeValue = formData.startAt ? formData.startAt.slice(11) : '09:00';
                    handleInputChange('startAt', `${e.target.value}T${timeValue}`);
                  }}
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
                  style={{ color: '#000000' }}
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                <input
                  type="time"
                  value={formData.startAt ? formData.startAt.slice(11, 16) : ''}
                  onChange={(e) => {
                    const dateValue = formData.startAt ? formData.startAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
                    handleInputChange('startAt', `${dateValue}T${e.target.value}`);
                  }}
                  min="09:00"
                  max="17:00"
                  step="1800"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
                  style={{ color: '#000000' }}
                  required
                />
              </div>
            </div>
            
            <p className="text-sm text-gray-500 mt-1">
              📅 Select date and time separately. Available hours: 9:00 AM - 5:00 PM (30-minute intervals)
            </p>
            
            {/* Quick Time Suggestions */}
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Popular Times:</p>
              <div className="flex flex-wrap gap-2">
                {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map(time => {
                  const today = new Date();
                  const tomorrow = new Date(today);
                  tomorrow.setDate(today.getDate() + 1);
                  const suggestedDateTime = `${tomorrow.toISOString().slice(0, 10)}T${time}`;
                  
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => handleInputChange('startAt', suggestedDateTime)}
                      className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                    >
                      Tomorrow {time === '09:00' ? '9 AM' : 
                              time === '10:00' ? '10 AM' : 
                              time === '11:00' ? '11 AM' : 
                              time === '14:00' ? '2 PM' : 
                              time === '15:00' ? '3 PM' : '4 PM'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {formData.endAt && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time
              </label>
              <input
                type="datetime-local"
                value={formData.endAt}
                readOnly
                className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-black"
                style={{ color: '#000000' }}
              />
              <p className="text-sm text-gray-500 mt-1">Automatically calculated based on service duration</p>
            </div>
          )}
        </div>
      )}

      {step === 'payment' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Payment Details</h2>
          
          {/* Booking Summary */}
          <div className="p-4 bg-gray-50 rounded-md">
            <h3 className="font-medium text-gray-900 mb-3">Booking Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Service:</span>
                <span>{selectedService?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Instructor:</span>
                <span>{selectedInstructor?.displayName}</span>
              </div>
              <div className="flex justify-between">
                <span>Date & Time:</span>
                <span>{formData.startAt ? new Date(formData.startAt).toLocaleString() : 'Not selected'}</span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span>{selectedService?.durationMinutes} minutes</span>
              </div>
              <div className="flex justify-between font-medium text-lg border-t pt-2">
                <span>Total:</span>
                <span>${selectedService ? (selectedService.priceCents / 100).toFixed(2) : '0.00'}</span>
              </div>
            </div>
          </div>

          {/* Payment Form (Mock) */}
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-md text-center">
            <p className="text-gray-600 mb-2">💳 Payment Integration</p>
            <p className="text-sm text-gray-500">
              In production, this would integrate with Stripe for secure payment processing.
              For demo purposes, click "Book Lesson" to proceed.
            </p>
          </div>
        </div>
      )}

      {step === 'confirmation' && (
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">Lesson Booked Successfully!</h2>
          <p className="text-gray-600">
            Your lesson has been booked and confirmation details have been sent to your email.
            Your instructor will contact you if any additional details are needed.
          </p>
          <div className="p-4 bg-green-50 rounded-md text-left">
            <h3 className="font-medium text-green-900 mb-2">Booking Details:</h3>
            <div className="text-sm text-green-800 space-y-1">
              <p><strong>Service:</strong> {selectedService?.name}</p>
              <p><strong>Instructor:</strong> {selectedInstructor?.displayName}</p>
              <p><strong>Date & Time:</strong> {formData.startAt ? new Date(formData.startAt).toLocaleString() : 'Not set'}</p>
              <p><strong>Pickup:</strong> {formData.pickupAddress}</p>
              {formData.dropoffAddress && <p><strong>Drop-off:</strong> {formData.dropoffAddress}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
        <div>
          {step !== 'details' && step !== 'confirmation' && (
            <button
              onClick={handleBack}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={loading}
            >
              ← Back
            </button>
          )}
        </div>
        
        <div className="space-x-3">
          {onCancel && step !== 'confirmation' && (
            <button
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
          )}
          
          {step === 'confirmation' ? (
            <div className="space-x-3">
              <a
                href="/"
                className="inline-flex items-center px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
                Back to Home
              </a>
              <a
                href="/lessons"
                className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                View My Lessons
              </a>
              <button
                onClick={onCancel}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Book Another Lesson
              </button>
            </div>
          ) : step === 'payment' ? (
            <button
              onClick={handleSubmit}
              disabled={loading || !validateStep(step)}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
              Book Lesson
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={loading || !validateStep(step)}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}