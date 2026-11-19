"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import { BorderBeam } from "@/components/ui/border-beam";

const SOSPage = () => {
  const router = useRouter();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const validationSchema = Yup.object().shape({
    recipientName: Yup.string().required("Name is required"),
    recipientPhone: Yup.string().required("Phone number is required"),
    recipientEmail: Yup.string().email("Invalid email"),
    bloodGroup: Yup.string().required("Blood Group is required"),
    message: Yup.string(),
    radiusKm: Yup.number().min(1).max(100).required("Radius is required"),
  });

  const getLocation = () => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          formik.setFieldValue("latitude", pos.coords.latitude);
          formik.setFieldValue("longitude", pos.coords.longitude);
          toast.success("Location captured!");
        },
        () => {
          toast.error("Location access denied. Please enter manually.");
        }
      );
    }
  };

  const handleSubmit = async (values: any) => {
    if (!values.latitude || !values.longitude) {
      toast.error("Please capture your location first");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(`SOS sent! ${data.notifiedDonors} donors notified.`);
        router.push("/Map");
      } else {
        toast.error(data.message || "Failed to send SOS");
      }
    } catch (error) {
      toast.error("Error sending SOS request");
    } finally {
      setLoading(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      recipientName: "",
      recipientPhone: "",
      recipientEmail: "",
      bloodGroup: "",
      message: "",
      radiusKm: 10,
      latitude: undefined as any,
      longitude: undefined as any,
    },
    validationSchema,
    onSubmit: handleSubmit,
  });

  const compulsory = <span className="text-red-600">*</span>;

  return (
    <motion.form
      className="mx-auto max-w-xl my-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.7 }}
      onSubmit={formik.handleSubmit}
    >
      <div className="flex items-center bg-gradient-to-r from-red-900 via-red-900 to-red-800 h-[11vh] mt-6 rounded w-full mb-[2vh]">
        <h1 className="text-white text-2xl font-bold ml-4">🆘 Emergency SOS Request</h1>
      </div>
      <div className="shadow border-1 p-8 relative h-full w-full rounded-xl">
        <BorderBeam />
        <Toaster />

        <div className="mb-5">
          <label className="w-full mb-2 mt-2 block">
            Recipient Name {compulsory}
          </label>
          <input
            type="text"
            name="recipientName"
            value={formik.values.recipientName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className="pl-2 border-2 border-gray-300 hover:border-red-800 flex-grow h-10 w-full mb-2"
            placeholder="Full Name"
            required
          />
          {formik.touched.recipientName && formik.errors.recipientName && (
            <div className="text-red-600 text-sm">{formik.errors.recipientName}</div>
          )}
        </div>

        <div className="mb-5">
          <label className="w-full mb-2 mt-2 block">
            Phone Number {compulsory}
          </label>
          <input
            type="tel"
            name="recipientPhone"
            value={formik.values.recipientPhone}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className="pl-2 border-2 border-gray-300 hover:border-red-800 flex-grow h-10 w-full mb-2"
            placeholder="+1234567890"
            required
          />
          {formik.touched.recipientPhone && formik.errors.recipientPhone && (
            <div className="text-red-600 text-sm">{formik.errors.recipientPhone}</div>
          )}
        </div>

        <div className="mb-5">
          <label className="w-full mb-2 mt-2 block">Email (Optional)</label>
          <input
            type="email"
            name="recipientEmail"
            value={formik.values.recipientEmail}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className="pl-2 border-2 border-gray-300 hover:border-red-800 flex-grow h-10 w-full mb-2"
            placeholder="email@example.com"
          />
        </div>

        <div className="mb-5">
          <label className="w-full mb-2 mt-2 block">
            Blood Group Needed {compulsory}
          </label>
          <select
            name="bloodGroup"
            value={formik.values.bloodGroup}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className="pl-2 border-2 border-gray-300 hover:border-red-600 h-10 w-full mb-2"
            required
          >
            <option value="">-- Select --</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </select>
          {formik.touched.bloodGroup && formik.errors.bloodGroup && (
            <div className="text-red-600 text-sm">{formik.errors.bloodGroup}</div>
          )}
        </div>

        <div className="mb-5">
          <label className="w-full mb-2 mt-2 block">
            Search Radius (km) {compulsory}
          </label>
          <input
            type="number"
            name="radiusKm"
            value={formik.values.radiusKm}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            min={1}
            max={100}
            className="pl-2 border-2 border-gray-300 hover:border-red-600 w-full h-10 mb-2"
            placeholder="10"
            required
          />
          {formik.touched.radiusKm && formik.errors.radiusKm && (
            <div className="text-red-600 text-sm">{formik.errors.radiusKm}</div>
          )}
        </div>

        <div className="mb-5">
          <label className="w-full mb-2 mt-2 block">Message (Optional)</label>
          <textarea
            name="message"
            value={formik.values.message}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className="pl-2 border-2 border-gray-300 hover:border-red-800 h-24 w-full mb-2"
            placeholder="Additional details about the emergency..."
          />
        </div>

        <div className="mb-5">
          <button
            type="button"
            onClick={getLocation}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-2"
          >
            📍 Capture Current Location
          </button>
          {location && (
            <div className="text-sm text-green-600">
              ✓ Location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!formik.isValid || loading || !location}
            className="w-full sm:w-1/2 mx-auto bg-red-900 hover:bg-red-800 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "🚨 Send SOS Alert"}
          </button>
        </div>
      </div>
    </motion.form>
  );
};

export default SOSPage;

