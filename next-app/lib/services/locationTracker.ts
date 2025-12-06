import { agentApi } from '@/lib/api/agent';

export interface Location {
  latitude: number;
  longitude: number;
  timestamp: number;
}

type LocationUpdateCallback = (location: Location) => void;
type ErrorCallback = (error: GeolocationPositionError) => void;

class LocationTracker {
  private watchId: number | null = null;
  private updateInterval: number = 5000; // 5 seconds
  private lastLocation: Location | null = null;
  private isTracking: boolean = false;
  private onLocationUpdate: LocationUpdateCallback | null = null;
  private onError: ErrorCallback | null = null;

  /**
   * Start tracking location and sending updates to the server
   */
  startTracking(
    onUpdate?: LocationUpdateCallback,
    onError?: ErrorCallback,
    interval: number = 5000
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      if (this.isTracking) {
        resolve();
        return;
      }

      this.updateInterval = interval;
      this.onLocationUpdate = onUpdate || null;
      this.onError = onError || null;
      this.isTracking = true;

      // Get initial location
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.handleLocationUpdate(position);
          resolve();
        },
        (error) => {
          this.handleError(error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );

      // Start watching for location changes
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          this.handleLocationUpdate(position);
        },
        (error) => {
          this.handleError(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }

  /**
   * Stop tracking location
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
    this.onLocationUpdate = null;
    this.onError = null;
  }

  /**
   * Get the last known location
   */
  getLastLocation(): Location | null {
    return this.lastLocation;
  }

  /**
   * Check if currently tracking
   */
  isActive(): boolean {
    return this.isTracking;
  }

  private handleLocationUpdate(position: GeolocationPosition): void {
    const location: Location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      timestamp: Date.now(),
    };

    this.lastLocation = location;

    // Call the update callback if provided
    if (this.onLocationUpdate) {
      this.onLocationUpdate(location);
    }

    // Send to server
    this.sendLocationToServer(location).catch((error) => {
      console.error('Failed to send location to server:', error);
    });
  }

  private async sendLocationToServer(location: Location): Promise<void> {
    try {
      await agentApi.updateLocation(location.latitude, location.longitude);
    } catch (error) {
      console.error('Error updating location on server:', error);
      throw error;
    }
  }

  private handleError(error: GeolocationPositionError): void {
    console.error('Geolocation error:', error);
    if (this.onError) {
      this.onError(error);
    }
  }
}

// Export singleton instance
export const locationTracker = new LocationTracker();





















