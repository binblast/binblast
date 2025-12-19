// lib/__tests__/proximity-utils.test.ts
import {
  haversineDistance,
  clusterCustomers,
  sortByDistance,
  filterWithinRadius,
  calculateCentroid,
} from "../proximity-utils";

describe("proximity-utils", () => {
  describe("haversineDistance", () => {
    it("should calculate distance between two points", () => {
      // Atlanta to Decatur (approximately 6 miles)
      const distance = haversineDistance(33.749, -84.388, 33.775, -84.296);
      expect(distance).toBeGreaterThan(5);
      expect(distance).toBeLessThan(7);
    });

    it("should return 0 for same point", () => {
      const distance = haversineDistance(33.749, -84.388, 33.749, -84.388);
      expect(distance).toBe(0);
    });
  });

  describe("clusterCustomers", () => {
    it("should cluster customers within radius", () => {
      const customers = [
        { id: "1", latitude: 33.749, longitude: -84.388 },
        { id: "2", latitude: 33.750, longitude: -84.389 }, // Very close to customer 1
        { id: "3", latitude: 34.0, longitude: -84.0 }, // Far away
      ];

      const clusters = clusterCustomers(customers, 1);
      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters.length).toBeLessThanOrEqual(3);
    });

    it("should return empty array for customers without coordinates", () => {
      const customers = [
        { id: "1" },
        { id: "2" },
      ];

      const clusters = clusterCustomers(customers, 1);
      expect(clusters).toEqual([]);
    });
  });

  describe("sortByDistance", () => {
    it("should sort customers by distance from anchor", () => {
      const anchor = { latitude: 33.749, longitude: -84.388 };
      const customers = [
        { id: "1", latitude: 33.750, longitude: -84.389 }, // Closest
        { id: "2", latitude: 34.0, longitude: -84.0 }, // Farthest
        { id: "3", latitude: 33.755, longitude: -84.390 }, // Middle
      ];

      const sorted = sortByDistance(customers, anchor.latitude, anchor.longitude);
      expect(sorted[0].id).toBe("1");
      expect(sorted[0].distance).toBeLessThan(sorted[1].distance);
    });
  });

  describe("filterWithinRadius", () => {
    it("should filter customers within radius", () => {
      const anchor = { latitude: 33.749, longitude: -84.388 };
      const customers = [
        { id: "1", latitude: 33.750, longitude: -84.389 }, // Within 1 mile
        { id: "2", latitude: 34.0, longitude: -84.0 }, // Far away
      ];

      const filtered = filterWithinRadius(
        customers,
        anchor.latitude,
        anchor.longitude,
        1
      );
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe("1");
    });
  });

  describe("calculateCentroid", () => {
    it("should calculate centroid of coordinates", () => {
      const coordinates = [
        { latitude: 33.749, longitude: -84.388 },
        { latitude: 33.750, longitude: -84.389 },
        { latitude: 33.751, longitude: -84.390 },
      ];

      const centroid = calculateCentroid(coordinates);
      expect(centroid.latitude).toBeCloseTo(33.75, 2);
      expect(centroid.longitude).toBeCloseTo(-84.389, 2);
    });

    it("should throw error for empty array", () => {
      expect(() => calculateCentroid([])).toThrow();
    });
  });
});
