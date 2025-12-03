'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

export interface GooglePlacesAutocompleteProps {
  /** Input value */
  value: string;
  /** Callback when place is selected */
  onPlaceSelect: (place: {
    address: string;
    latitude: number;
    longitude: number;
  }) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Input label */
  label?: string;
  /** Whether input is required */
  required?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Google Maps API key */
  apiKey?: string;
}

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

export function GooglePlacesAutocomplete({
  value,
  onPlaceSelect,
  placeholder = 'Search for a location...',
  label,
  required = false,
  className = '',
  apiKey,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState(value);
  const isInitializedRef = useRef(false);
  const manualInputTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPlaceSelectionInProgressRef = useRef(false);
  const isUserTypingRef = useRef(false);

  const googleApiKey = apiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // Update input value when prop changes, but only if it's a meaningful change
  // (not during place selection or when user is actively typing)
  useEffect(() => {
    // Only update if:
    // 1. Not during place selection
    // 2. Not when user is actively typing
    // 3. The prop value is different from current input value
    if (!isPlaceSelectionInProgressRef.current && !isUserTypingRef.current && value !== inputValue) {
      // Don't update if user is currently typing in the input
      if (document.activeElement !== inputRef.current) {
        setInputValue(value);
      }
    }
  }, [value, inputValue]);

  // Initialize autocomplete - wrapped in useCallback to prevent recreation
  const initializeAutocomplete = useCallback(() => {
    if (!inputRef.current || !window.google?.maps?.places || isInitializedRef.current) {
      return;
    }

    // Clean up existing autocomplete if any
    if (autocompleteRef.current && window.google?.maps?.event) {
      window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }

    try {
      // Initialize Autocomplete
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['geocode'], // geocode includes addresses and locations
        fields: ['formatted_address', 'geometry', 'name'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        // Clear any pending manual input timeout since we're selecting from autocomplete
        if (manualInputTimeoutRef.current) {
          clearTimeout(manualInputTimeoutRef.current);
          manualInputTimeoutRef.current = null;
        }
        
        // Mark that a place selection is in progress
        isPlaceSelectionInProgressRef.current = true;

        if (place.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const address = place.formatted_address || place.name || '';

          setInputValue(address);
          onPlaceSelect({
            address,
            latitude: lat,
            longitude: lng,
          });
        } else {
          // If place doesn't have geometry, clear coordinates
          setInputValue(place.name || inputRef.current?.value || '');
          onPlaceSelect({
            address: place.name || inputRef.current?.value || '',
            latitude: NaN,
            longitude: NaN,
          });
        }
        
        // Reset the flags after a short delay to allow React to update
        setTimeout(() => {
          isPlaceSelectionInProgressRef.current = false;
          isUserTypingRef.current = false;
        }, 100);
      });

      autocompleteRef.current = autocomplete;
      isInitializedRef.current = true;
      setIsLoaded(true);
      setError(null);
    } catch (err) {
      console.error('Error initializing Google Places Autocomplete:', err);
      setError('Failed to initialize Google Places Autocomplete');
    }
  }, [onPlaceSelect]);

  // Load Google Maps script
  useEffect(() => {
    if (!googleApiKey) {
      setError('Google Maps API key is not configured');
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      initializeAutocomplete();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Wait for it to load
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          clearInterval(checkInterval);
          initializeAutocomplete();
        }
      }, 100);

      return () => clearInterval(checkInterval);
    }

    // Load Google Maps script with proper async loading
    // Note: You may see "ERR_BLOCKED_BY_CLIENT" for gen_204 endpoint in console.
    // This is Google Maps' CSP test endpoint and is often blocked by ad blockers.
    // It's non-critical and doesn't affect functionality.
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.setAttribute('loading', 'async');
    script.onload = () => {
      // Wait a bit for Google Maps to fully initialize
      setTimeout(() => {
        if (window.google?.maps?.places) {
          initializeAutocomplete();
        } else {
          setError('Google Maps loaded but Places API is not available. Please check your API key configuration.');
        }
      }, 100);
    };
    script.onerror = () => {
      setError('Failed to load Google Maps. Please check your API key and ensure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set correctly in Netlify environment variables.');
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
      if (manualInputTimeoutRef.current) {
        clearTimeout(manualInputTimeoutRef.current);
      }
      isInitializedRef.current = false;
    };
  }, [googleApiKey, initializeAutocomplete]);

  // Handle manual input changes - clear coordinates if user types manually
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Mark that user is typing
    isUserTypingRef.current = true;
    setInputValue(newValue);
    
    // Don't process if a place selection is in progress (from autocomplete)
    if (isPlaceSelectionInProgressRef.current) {
      return;
    }
    
    // Clear any existing timeout
    if (manualInputTimeoutRef.current) {
      clearTimeout(manualInputTimeoutRef.current);
    }
    
    // Debounce the parent update to avoid too many re-renders
    manualInputTimeoutRef.current = setTimeout(() => {
      // Update parent with the new address value (for controlled component behavior)
      onPlaceSelect({
        address: newValue,
        latitude: NaN,
        longitude: NaN,
      });
      
      // Reset typing flag after a short delay
      setTimeout(() => {
        isUserTypingRef.current = false;
      }, 100);
    }, 300); // Debounce parent updates
  }, [onPlaceSelect]);

  if (!googleApiKey) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
          Google Maps API key not configured. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env file.
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => {
          isUserTypingRef.current = true;
        }}
        onBlur={() => {
          // Reset after a short delay to allow any pending updates to complete
          setTimeout(() => {
            isUserTypingRef.current = false;
          }, 200);
        }}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        disabled={!isLoaded}
      />
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
      {!isLoaded && !error && (
        <p className="text-xs text-gray-500 mt-1">Loading Google Maps...</p>
      )}
    </div>
  );
}
