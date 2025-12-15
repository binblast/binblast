// components/AdminDashboard/EmployeeContactList.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Employee {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  serviceArea?: string[];
  payRatePerJob?: number;
  taxInfo?: any;
  certificationStatus?: string;
  hiringStatus?: string;
}

interface EmployeeContactListProps {
  onEmployeeSelect?: (employee: Employee) => void;
}

export function EmployeeContactList({ onEmployeeSelect }: EmployeeContactListProps) {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCertification, setFilterCertification] = useState<string>("");
  const [filterTaxInfo, setFilterTaxInfo] = useState<string>("");
  const [filterServiceArea, setFilterServiceArea] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    loadEmployees();
  }, [filterCertification, filterTaxInfo, filterServiceArea]);

  async function loadEmployees() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterCertification) params.append("certificationStatus", filterCertification);
      if (filterTaxInfo) params.append("taxInfoComplete", filterTaxInfo);
      if (filterServiceArea) params.append("serviceArea", filterServiceArea);

      const response = await fetch(`/api/admin/employees?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setEmployees(data.employees || []);
      } else {
        console.error("Failed to load employees:", data.error);
      }
    } catch (error) {
      console.error("Error loading employees:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredEmployees = employees.filter((emp) => {
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    const email = emp.email?.toLowerCase() || "";
    const searchLower = searchTerm.toLowerCase();
    
    return (
      fullName.includes(searchLower) ||
      email.includes(searchLower) ||
      emp.phone?.includes(searchTerm)
    );
  });

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);

  const getCertificationBadge = (status?: string) => {
    switch (status) {
      case "completed":
        return <span style={{ padding: "0.25rem 0.5rem", background: "#dcfce7", color: "#16a34a", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "600" }}>Certified</span>;
      case "expired":
        return <span style={{ padding: "0.25rem 0.5rem", background: "#fef2f2", color: "#dc2626", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "600" }}>Expired</span>;
      case "in_progress":
        return <span style={{ padding: "0.25rem 0.5rem", background: "#fef3c7", color: "#d97706", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "600" }}>In Progress</span>;
      default:
        return <span style={{ padding: "0.25rem 0.5rem", background: "#f3f4f6", color: "#6b7280", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "600" }}>Not Started</span>;
    }
  };

  const getTaxInfoBadge = (taxInfo: any) => {
    if (taxInfo && taxInfo.ssn) {
      return <span style={{ padding: "0.25rem 0.5rem", background: "#dcfce7", color: "#16a34a", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "600" }}>Complete</span>;
    }
    return <span style={{ padding: "0.25rem 0.5rem", background: "#fef2f2", color: "#dc2626", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "600" }}>Incomplete</span>;
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Loading employees...</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      {/* Search and Filters */}
      <div style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              flex: "1",
              minWidth: "250px",
              padding: "0.75rem 1rem",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "0.95rem",
            }}
          />
          <select
            value={filterCertification}
            onChange={(e) => {
              setFilterCertification(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: "0.75rem 1rem",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "0.95rem",
              background: "white",
            }}
          >
            <option value="">All Certifications</option>
            <option value="certified">Certified</option>
            <option value="expired">Expired</option>
            <option value="in_progress">In Progress</option>
          </select>
          <select
            value={filterTaxInfo}
            onChange={(e) => {
              setFilterTaxInfo(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: "0.75rem 1rem",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "0.95rem",
              background: "white",
            }}
          >
            <option value="">All Tax Info</option>
            <option value="true">Complete</option>
            <option value="false">Incomplete</option>
          </select>
          <input
            type="text"
            placeholder="Filter by service area..."
            value={filterServiceArea}
            onChange={(e) => {
              setFilterServiceArea(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: "0.75rem 1rem",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "0.95rem",
            }}
          />
        </div>
        <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          Showing {filteredEmployees.length} of {employees.length} employees
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", background: "white", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600", fontSize: "0.875rem", color: "#374151" }}>Name</th>
              <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600", fontSize: "0.875rem", color: "#374151" }}>Email</th>
              <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600", fontSize: "0.875rem", color: "#374151" }}>Phone</th>
              <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600", fontSize: "0.875rem", color: "#374151" }}>Training</th>
              <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600", fontSize: "0.875rem", color: "#374151" }}>Tax Info</th>
              <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600", fontSize: "0.875rem", color: "#374151" }}>Service Area</th>
              <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600", fontSize: "0.875rem", color: "#374151" }}>Pay Rate</th>
              <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600", fontSize: "0.875rem", color: "#374151" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEmployees.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                  No employees found
                </td>
              </tr>
            ) : (
              paginatedEmployees.map((employee) => (
                <tr
                  key={employee.id}
                  style={{
                    borderBottom: "1px solid #e5e7eb",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "white";
                  }}
                >
                  <td style={{ padding: "1rem", fontSize: "0.95rem" }}>
                    {employee.firstName} {employee.lastName}
                  </td>
                  <td style={{ padding: "1rem", fontSize: "0.95rem", color: "#6b7280" }}>
                    {employee.email}
                  </td>
                  <td style={{ padding: "1rem", fontSize: "0.95rem", color: "#6b7280" }}>
                    {employee.phone || "—"}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    {getCertificationBadge(employee.certificationStatus)}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    {getTaxInfoBadge(employee.taxInfo)}
                  </td>
                  <td style={{ padding: "1rem", fontSize: "0.95rem", color: "#6b7280" }}>
                    {employee.serviceArea && employee.serviceArea.length > 0
                      ? employee.serviceArea.slice(0, 2).join(", ") + (employee.serviceArea.length > 2 ? "..." : "")
                      : "—"}
                  </td>
                  <td style={{ padding: "1rem", fontSize: "0.95rem", fontWeight: "600" }}>
                    ${employee.payRatePerJob || 0}/job
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <button
                      onClick={() => {
                        if (onEmployeeSelect) {
                          onEmployeeSelect(employee);
                        } else {
                          router.push(`/admin/employees/${employee.id}`);
                        }
                      }}
                      style={{
                        padding: "0.5rem 1rem",
                        background: "#16a34a",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "center", gap: "0.5rem" }}>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              background: currentPage === 1 ? "#f3f4f6" : "white",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              opacity: currentPage === 1 ? 0.5 : 1,
            }}
          >
            Previous
          </button>
          <span style={{ padding: "0.5rem 1rem", display: "flex", alignItems: "center" }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              background: currentPage === totalPages ? "#f3f4f6" : "white",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              opacity: currentPage === totalPages ? 0.5 : 1,
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
