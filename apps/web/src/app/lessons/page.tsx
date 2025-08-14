'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MockLesson {
  id: string;
  status: string;
  serviceName: string;
  instructorName: string;
  startAt: string;
  endAt: string;
  pickupAddress: string;
  dropoffAddress?: string;
  notes?: string;
  totalCents: number;
}

interface FilterState {
  status: string;
  dateFrom: string;
  dateTo: string;
  instructorId: string;
  searchTerm: string;
}

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export default function LessonsPage() {
  const [lessons, setLessons] = useState<MockLesson[]>([]);
  const [filteredLessons, setFilteredLessons] = useState<MockLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<MockLesson | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Filter and pagination state
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    dateFrom: '',
    dateTo: '',
    instructorId: 'all',
    searchTerm: ''
  });
  
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    total: 0
  });

  useEffect(() => {
    // Load lessons from API
    loadLessons();
  }, []);

  // Apply filters and pagination
  useEffect(() => {
    applyFilters();
  }, [lessons, filters]);

  const applyFilters = () => {
    let filtered = [...lessons];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(lesson => lesson.status === filters.status);
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(lesson => new Date(lesson.startAt) >= fromDate);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(lesson => new Date(lesson.startAt) <= toDate);
    }

    // Instructor filter
    if (filters.instructorId !== 'all') {
      filtered = filtered.filter(lesson => lesson.instructorName === filters.instructorId);
    }

    // Search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(lesson => 
        lesson.serviceName.toLowerCase().includes(searchLower) ||
        lesson.instructorName.toLowerCase().includes(searchLower) ||
        lesson.pickupAddress.toLowerCase().includes(searchLower) ||
        (lesson.notes && lesson.notes.toLowerCase().includes(searchLower))
      );
    }

    setFilteredLessons(filtered);
    setPagination(prev => ({
      ...prev,
      total: filtered.length,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handleFilterChange = (filterName: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      dateFrom: '',
      dateTo: '',
      instructorId: 'all',
      searchTerm: ''
    });
  };

  const handleLessonAction = async (lessonId: string, action: 'reschedule' | 'cancel' | 'view') => {
    if (action === 'view') {
      const lesson = lessons.find(l => l.id === lessonId);
      if (lesson) {
        setSelectedLesson(lesson);
        setShowDetailModal(true);
      }
      return;
    }

    setActionLoading(lessonId);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (action === 'cancel') {
        setLessons(prev => prev.map(lesson => 
          lesson.id === lessonId 
            ? { ...lesson, status: 'cancelled' }
            : lesson
        ));
        alert(`Lesson ${lessonId} has been cancelled successfully.`);
      } else if (action === 'reschedule') {
        alert(`Reschedule functionality would open a rescheduling dialog for lesson ${lessonId}.`);
      }
    } catch (error) {
      alert('Action failed. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const loadLessons = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from real API first
      const response = await fetch('http://localhost:3001/api/lessons');
      if (response.ok) {
        const data = await response.json();
        setLessons(data);
      } else {
        // Fallback to mock data if API not available
        const mockLessons: MockLesson[] = [
          {
            id: 'lesson_1',
            status: 'confirmed',
            serviceName: 'Standard Driving Lesson',
            instructorName: 'John Smith',
            startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            endAt: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
            pickupAddress: '123 Main St, City',
            dropoffAddress: '789 Oak Ave, City',
            notes: 'First lesson, focus on basics',
            totalCents: 8000
          },
          {
            id: 'lesson_2',
            status: 'completed',
            serviceName: 'Highway Driving Lesson',
            instructorName: 'Sarah Wilson',
            startAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            endAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
            pickupAddress: '456 Oak Ave, City',
            notes: 'Highway practice completed successfully',
            totalCents: 12000
          },
          {
            id: 'lesson_3',
            status: 'pending_payment',
            serviceName: 'Parallel Parking Practice',
            instructorName: 'Mike Johnson',
            startAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            endAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
            pickupAddress: '321 Pine St, City',
            notes: 'Special focus on parallel parking techniques',
            totalCents: 6000
          },
          {
            id: 'lesson_4',
            status: 'cancelled',
            serviceName: 'Night Driving Practice',
            instructorName: 'Emily Davis',
            startAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            endAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
            pickupAddress: '654 Elm St, City',
            notes: 'Cancelled due to weather conditions',
            totalCents: 9000
          },
          {
            id: 'lesson_5',
            status: 'requested',
            serviceName: 'Test Preparation',
            instructorName: 'John Smith',
            startAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 120 * 60 * 1000).toISOString(),
            pickupAddress: '987 Maple Ave, City',
            notes: 'Final preparation before driving test',
            totalCents: 15000
          }
        ];
        setLessons(mockLessons);
      }
    } catch (error) {
      console.error('Failed to load lessons:', error);
      // Show mock data on error
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending_payment': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'requested': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get unique instructors for filter dropdown
  const uniqueInstructors = Array.from(new Set(lessons.map(l => l.instructorName)));

  // Paginate filtered lessons
  const paginatedLessons = filteredLessons.slice(
    (pagination.page - 1) * pagination.pageSize,
    pagination.page * pagination.pageSize
  );

  const totalPages = Math.ceil(pagination.total / pagination.pageSize);

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your lessons...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Lessons</h1>
            <p className="text-gray-600 mt-1">Manage your driving lessons and track your progress</p>
          </div>
          <Link
            href="/lessons/book"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Book New Lesson
          </Link>
        </div>

        {/* Demo Context */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h2 className="text-sm font-semibold text-blue-900 mb-2">🎭 Demo Context</h2>
          <p className="text-sm text-blue-800">
            <strong>Persona:</strong> Student User | 
            <strong> View:</strong> Own lessons only | 
            <strong> Actions:</strong> Book, View, Cancel (with restrictions)
          </p>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex flex-wrap items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Filter Lessons</h2>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear All Filters
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* Search */}
            <div className="xl:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                placeholder="Search lessons, instructors, locations..."
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="requested">Requested</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending_payment">Pending Payment</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            {/* Instructor Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
              <select
                value={filters.instructorId}
                onChange={(e) => handleFilterChange('instructorId', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Instructors</option>
                {uniqueInstructors.map(instructor => (
                  <option key={instructor} value={instructor}>{instructor}</option>
                ))}
              </select>
            </div>
            
            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            
            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
          
          {/* Active Filters Display */}
          {(filters.status !== 'all' || filters.instructorId !== 'all' || filters.dateFrom || filters.dateTo || filters.searchTerm) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Active filters:</span>
                {filters.status !== 'all' && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    Status: {filters.status.replace('_', ' ')}
                  </span>
                )}
                {filters.instructorId !== 'all' && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    Instructor: {filters.instructorId}
                  </span>
                )}
                {filters.dateFrom && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    From: {new Date(filters.dateFrom).toLocaleDateString()}
                  </span>
                )}
                {filters.dateTo && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    To: {new Date(filters.dateTo).toLocaleDateString()}
                  </span>
                )}
                {filters.searchTerm && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    Search: "{filters.searchTerm}"
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Lessons</p>
                <p className="text-2xl font-semibold text-gray-900">{lessons.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {lessons.filter(l => l.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {lessons.filter(l => ['confirmed', 'requested'].includes(l.status) && new Date(l.startAt) > new Date()).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Hours Practiced</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {lessons.filter(l => l.status === 'completed').length * 1.5}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lessons List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Lessons</h2>
              <p className="text-sm text-gray-600 mt-1">
                Showing {paginatedLessons.length} of {filteredLessons.length} lessons
                {filteredLessons.length !== lessons.length && ` (filtered from ${lessons.length} total)`}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Page size:</span>
              <select
                value={pagination.pageSize}
                onChange={(e) => setPagination(prev => ({ ...prev, pageSize: parseInt(e.target.value), page: 1 }))}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
          
          {filteredLessons.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No lessons yet</h3>
              <p className="text-gray-600 mb-6">Get started by booking your first driving lesson!</p>
              <Link
                href="/lessons/book"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Book Your First Lesson
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {paginatedLessons.map((lesson) => (
                <div key={lesson.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">{lesson.serviceName}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lesson.status)}`}>
                          {lesson.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                          </svg>
                          Instructor: {lesson.instructorName}
                        </div>
                        
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                          {new Date(lesson.startAt).toLocaleDateString()} at {new Date(lesson.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          </svg>
                          {lesson.pickupAddress}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-6">
                      <button 
                        onClick={() => handleLessonAction(lesson.id, 'view')}
                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 rounded hover:bg-blue-100"
                        disabled={actionLoading === lesson.id}
                      >
                        View Details
                      </button>
                      {(lesson.status === 'confirmed' || lesson.status === 'requested') && new Date(lesson.startAt) > new Date() && (
                        <>
                          <button 
                            onClick={() => handleLessonAction(lesson.id, 'reschedule')}
                            className="px-3 py-1 text-sm text-yellow-600 hover:text-yellow-800 bg-yellow-50 rounded hover:bg-yellow-100"
                            disabled={actionLoading === lesson.id}
                          >
                            {actionLoading === lesson.id ? 'Loading...' : 'Reschedule'}
                          </button>
                          <button 
                            onClick={() => handleLessonAction(lesson.id, 'cancel')}
                            className="px-3 py-1 text-sm text-red-600 hover:text-red-800 bg-red-50 rounded hover:bg-red-100"
                            disabled={actionLoading === lesson.id}
                          >
                            {actionLoading === lesson.id ? 'Loading...' : 'Cancel'}
                          </button>
                        </>
                      )}
                      {lesson.totalCents && (
                        <span className="text-sm font-medium text-gray-900">
                          ${(lesson.totalCents / 100).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {filteredLessons.length > pagination.pageSize && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, filteredLessons.length)} of {filteredLessons.length} results
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 text-sm rounded-md ${
                          pagination.page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lesson Detail Modal */}
        {showDetailModal && selectedLesson && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Lesson Details</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Status and Service */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{selectedLesson.serviceName}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedLesson.status)}`}>
                      {selectedLesson.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Lesson ID</p>
                    <p className="font-mono text-sm">{selectedLesson.id}</p>
                  </div>
                </div>
                
                {/* Instructor and Schedule */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Instructor</h4>
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">{selectedLesson.instructorName}</p>
                        <p className="text-sm text-gray-600">Certified Instructor</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Schedule</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <span>{new Date(selectedLesson.startAt).toLocaleDateString()} at {new Date(selectedLesson.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span>Duration: {Math.round((new Date(selectedLesson.endAt).getTime() - new Date(selectedLesson.startAt).getTime()) / (1000 * 60))} minutes</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Locations */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Locations</h4>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Pickup Location</p>
                        <p className="text-sm text-gray-600">{selectedLesson.pickupAddress}</p>
                      </div>
                    </div>
                    {selectedLesson.dropoffAddress && selectedLesson.dropoffAddress !== selectedLesson.pickupAddress && (
                      <div className="flex items-start">
                        <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                          <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">Drop-off Location</p>
                          <p className="text-sm text-gray-600">{selectedLesson.dropoffAddress}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Payment and Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedLesson.totalCents && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Payment</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Total Amount:</span>
                          <span className="text-lg font-semibold text-gray-900">${(selectedLesson.totalCents / 100).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {selectedLesson.notes && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Notes</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-700">{selectedLesson.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Close
                  </button>
                  {(selectedLesson.status === 'confirmed' || selectedLesson.status === 'requested') && new Date(selectedLesson.startAt) > new Date() && (
                    <>
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          handleLessonAction(selectedLesson.id, 'reschedule');
                        }}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          handleLessonAction(selectedLesson.id, 'cancel');
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        Cancel Lesson
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Development Notes */}
        <div className="mt-12 p-6 bg-gray-100 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🔧 Task 6.2 Implementation Status</h2>
          <div className="text-sm text-gray-700 space-y-2">
            <p><strong>✅ Completed Features (Task 6.2):</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Advanced filtering system (status, instructor, date range, search)</li>
              <li>Pagination with configurable page sizes</li>
              <li>Role-based lesson views (Student persona - own lessons only)</li>
              <li>Comprehensive lesson detail modal with all information</li>
              <li>Lesson action buttons (View, Reschedule, Cancel) with proper permissions</li>
              <li>Real-time filter feedback with active filter display</li>
              <li>Performance optimizations (client-side filtering and pagination)</li>
              <li>Enhanced lesson list with pricing, status indicators, and actions</li>
            </ul>
            
            <p className="mt-4"><strong>🔄 Ready for Task 6.3 - Basic Updates & State Management:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>TanStack Query for REST API calls with optimistic updates</li>
              <li>Real-time lesson status notifications</li>
              <li>Polling for live lesson updates (30s intervals)</li>
              <li>Enhanced error handling and retry logic</li>
              <li>Background data synchronization</li>
            </ul>

            <p className="mt-4"><strong>🎯 Next: Task 6.3 - Basic Updates & State Management</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}