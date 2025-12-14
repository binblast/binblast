// lib/zone-assignment.ts
// Shared logic for zone-based customer assignment

import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { customerMatchesZone } from "@/data/zoneMappings";

export interface AssignmentResult {
  assigned: number;
  skipped: number;
  reassigned: number;
  errors: string[];
  details: {
    customerId: string;
    action: "assigned" | "skipped" | "reassigned" | "error";
    reason?: string;
  }[];
}

export interface WorkloadMetrics {
  employeeId: string;
  employeeName: string;
  totalCustomers: number;
  customersByZone: Record<string, number>;
  customersByCounty: Record<string, number>;
  capacityUtilization: number; // percentage
  estimatedHours: number;
}

const MAX_CUSTOMERS_PER_EMPLOYEE = 40;
const ESTIMATED_HOURS_PER_CUSTOMER = 0.5; // 30 minutes per customer

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get all employees covering the same zones
 */
export async function getEmployeesInSameZones(
  employeeId: string,
  zones: string[],
  counties: string[]
): Promise<Array<{ id: string; name: string; zones: string[]; counties: string[] }>> {
  const db = await getDbInstance();
  if (!db) return [];

  const firestore = await safeImportFirestore();
  const { collection, query, where, getDocs, or } = firestore;

  const employeesRef = collection(db, "users");
  
  // Get all employees (we'll filter in memory for zone matching)
  // Note: This could be optimized with better Firestore queries
  const snapshot = await getDocs(employeesRef);
  const employees: Array<{ id: string; name: string; zones: string[]; counties: string[] }> = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    // Only include employees (not customers)
    if (data.role !== "employee" && data.role !== "operator" && data.role !== "admin") return;
    
    const empZones = data.zones || [];
    const empCounties = data.counties || [];
    
    // Check if employee shares any zones or counties
    const sharesZone = zones.length > 0 && zones.some((z) => empZones.includes(z));
    const sharesCounty = counties.length > 0 && counties.some((c) => empCounties.includes(c));
    
    if (sharesZone || sharesCounty) {
      employees.push({
        id: doc.id,
        name: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
        zones: empZones,
        counties: empCounties,
      });
    }
  });

  return employees;
}

/**
 * Calculate workload metrics for an employee
 */
export async function calculateWorkload(
  employeeId: string
): Promise<WorkloadMetrics | null> {
  const db = await getDbInstance();
  if (!db) return null;

  const firestore = await safeImportFirestore();
  const { collection, query, where, getDocs } = firestore;

  // Get employee data
  const employeeRef = firestore.doc(db, "users", employeeId);
  const employeeSnap = await firestore.getDoc(employeeRef);
  
  if (!employeeSnap.exists()) return null;
  
  const employeeData = employeeSnap.data();
  const employeeName = `${employeeData.firstName || ""} ${employeeData.lastName || ""}`.trim();

  // Get all assigned customers
  const cleaningsRef = collection(db, "scheduledCleanings");
  const assignedQuery = query(
    cleaningsRef,
    where("assignedEmployeeId", "==", employeeId)
  );
  
  const snapshot = await getDocs(assignedQuery);
  
  const customersByZone: Record<string, number> = {};
  const customersByCounty: Record<string, number> = {};
  let totalCustomers = 0;

  snapshot.forEach((doc) => {
    const data = doc.data();
    totalCustomers++;
    
    const county = data.county || "";
    const zone = data.zone || "";
    
    if (county) {
      customersByCounty[county] = (customersByCounty[county] || 0) + 1;
    }
    
    if (zone) {
      customersByZone[zone] = (customersByZone[zone] || 0) + 1;
    }
  });

  const capacityUtilization = (totalCustomers / MAX_CUSTOMERS_PER_EMPLOYEE) * 100;
  const estimatedHours = totalCustomers * ESTIMATED_HOURS_PER_CUSTOMER;

  return {
    employeeId,
    employeeName,
    totalCustomers,
    customersByZone,
    customersByCounty,
    capacityUtilization,
    estimatedHours,
  };
}

/**
 * Find unassigned customers matching zones/counties
 */
export async function findMatchingCustomers(
  zones: string[],
  counties: string[],
  excludeEmployeeId?: string
): Promise<Array<{ id: string; [key: string]: any }>> {
  const db = await getDbInstance();
  if (!db) return [];

  const firestore = await safeImportFirestore();
  const { collection, query, where, getDocs } = firestore;

  const cleaningsRef = collection(db, "scheduledCleanings");
  
  // Get all unassigned customers (or assigned to excludeEmployeeId for reassignment)
  const unassignedQuery = query(
    cleaningsRef,
    where("assignedEmployeeId", "==", excludeEmployeeId || null)
  );
  
  const snapshot = await getDocs(unassignedQuery);
  const matchingCustomers: Array<{ id: string; [key: string]: any }> = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    
    // Skip if already assigned to another employee (unless we're reassigning)
    if (excludeEmployeeId && data.assignedEmployeeId && data.assignedEmployeeId !== excludeEmployeeId) {
      return;
    }
    
    if (!excludeEmployeeId && data.assignedEmployeeId) {
      return;
    }

    const customerCounty = data.county || "";
    const customerCity = data.city || "";

    if (customerMatchesZone(customerCounty, customerCity, zones, counties)) {
      matchingCustomers.push({
        id: doc.id,
        ...data,
      });
    }
  });

  return matchingCustomers;
}

/**
 * Balance workload across employees in same zones
 */
export async function balanceWorkload(
  employeeId: string,
  zones: string[],
  counties: string[]
): Promise<{ targetCount: number; currentCount: number; canAssign: number }> {
  const employees = await getEmployeesInSameZones(employeeId, zones, counties);
  
  if (employees.length === 0) {
    return { targetCount: 0, currentCount: 0, canAssign: 0 };
  }

  // Calculate workload for all employees
  const workloads = await Promise.all(
    employees.map((emp) => calculateWorkload(emp.id))
  );

  const validWorkloads = workloads.filter((w) => w !== null) as WorkloadMetrics[];
  
  if (validWorkloads.length === 0) {
    return { targetCount: 0, currentCount: 0, canAssign: 0 };
  }

  // Find current employee's workload
  const currentWorkload = validWorkloads.find((w) => w.employeeId === employeeId);
  const currentCount = currentWorkload?.totalCustomers || 0;

  // Calculate average workload
  const totalCustomers = validWorkloads.reduce((sum, w) => sum + w.totalCustomers, 0);
  const averageWorkload = totalCustomers / validWorkloads.length;

  // Calculate target count (aim for average, but respect max capacity)
  const targetCount = Math.min(
    Math.ceil(averageWorkload),
    MAX_CUSTOMERS_PER_EMPLOYEE
  );

  // Calculate how many we can assign
  const canAssign = Math.max(0, targetCount - currentCount);

  return { targetCount, currentCount, canAssign };
}

/**
 * Cluster customers by geographic proximity
 * Groups customers within a threshold distance together
 */
export function clusterCustomersByProximity(
  customers: Array<{ id: string; latitude?: number; longitude?: number; city?: string; county?: string; [key: string]: any }>,
  maxDistance: number = 5 // miles
): Array<Array<{ id: string; [key: string]: any }>> {
  // Separate customers with and without coordinates
  const customersWithCoords = customers.filter(c => c.latitude && c.longitude);
  const customersWithoutCoords = customers.filter(c => !c.latitude || !c.longitude);

  const clusters: Array<Array<{ id: string; [key: string]: any }>> = [];

  // Cluster customers with coordinates using nearest neighbor approach
  const unassigned = [...customersWithCoords];
  
  while (unassigned.length > 0) {
    // Start a new cluster with the first unassigned customer
    const cluster: Array<{ id: string; [key: string]: any }> = [];
    const seed = unassigned.shift()!;
    cluster.push(seed);

    // Find all customers within maxDistance of any customer in the cluster
    let foundMore = true;
    while (foundMore) {
      foundMore = false;
      for (let i = unassigned.length - 1; i >= 0; i--) {
        const candidate = unassigned[i];
        if (!candidate.latitude || !candidate.longitude) continue;

        // Check if candidate is within maxDistance of any customer in cluster
        let isNearby = false;
        for (const clusterMember of cluster) {
          if (!clusterMember.latitude || !clusterMember.longitude) continue;
          
          const distance = calculateDistance(
            clusterMember.latitude,
            clusterMember.longitude,
            candidate.latitude,
            candidate.longitude
          );

          if (distance <= maxDistance) {
            isNearby = true;
            break;
          }
        }

        if (isNearby) {
          cluster.push(candidate);
          unassigned.splice(i, 1);
          foundMore = true;
        }
      }
    }

    clusters.push(cluster);
  }

  // Group customers without coordinates by city/county
  const locationGroups = new Map<string, Array<{ id: string; [key: string]: any }>>();
  
  customersWithoutCoords.forEach((customer) => {
    const locationKey = `${customer.city || ""}_${customer.county || ""}`.trim() || "unknown";
    if (!locationGroups.has(locationKey)) {
      locationGroups.set(locationKey, []);
    }
    locationGroups.get(locationKey)!.push(customer);
  });

  // Add location-based groups as clusters
  locationGroups.forEach((group) => {
    if (group.length > 0) {
      clusters.push(group);
    }
  });

  // Sort clusters by size (larger clusters first for efficiency)
  clusters.sort((a, b) => b.length - a.length);

  return clusters;
}

