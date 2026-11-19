"use client";

import React, { useState, useEffect } from "react";
import DonorCard from "@/components/DonorCard";
import  BloodGroupFilter  from "@/components/BloodGroupFilter";

interface Donor {
  id: number;
  firstName: string;
  lastName: string;
  gender: string;
  bloodGroup: string;
  age: number;
  phone: string;
  address: string;
}


const FindBlood: React.FC = () => {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
        });
        if (bloodGroupFilter) {
          params.append("bloodGroup", bloodGroupFilter);
        }
        
        const response = await fetch(`/api/DonorForm?${params.toString()}`);
        const data: { 
          Donors: Donor[]; 
          pagination?: { page: number; total: number; totalPages: number } 
        } = await response.json();
        
        setDonors(data.Donors);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
          setTotal(data.pagination.total);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page, bloodGroupFilter]);

  const handleBloodGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBloodGroupFilter(e.target.value);
    setPage(1); // Reset to first page when filter changes
  };

  return (
    <div className="mb-10 overflow-x-hidden mx-5">
      <div className="md:w-full lg:w-1/2 pr-4 lg:pr-8 xl:pr-16 mb-4 md:mb-0">
        <h1 className="mt-8 text-4xl text-center">Donor's Information</h1>
        <BloodGroupFilter
          bloodGroupFilter={bloodGroupFilter}
          handleBloodGroupChange={handleBloodGroupChange}
        />
      </div>

      <div className="lg:wd-1/2">
        {loading ? (
          <div className="text-center mt-8">
            <h2 className="text-2xl font-semibold">Loading...</h2>
          </div>
        ) : (
          <>
            {donors.length === 0 ? (
              <div className="text-center mt-8">
                <h2 className="text-2xl font-semibold">No donors found</h2>
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-gray-600">
                  Showing {donors.length} of {total} donors
                </div>
                <div className="grid grid-cols-1 gap-6 mt-8 sm:w-full lg:grid-cols-2 xl:grid-cols-3">
                  {donors.map((donor) => (
                    <DonorCard key={donor.id} donor={donor} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-4 mt-8">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 bg-red-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 bg-red-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FindBlood;
