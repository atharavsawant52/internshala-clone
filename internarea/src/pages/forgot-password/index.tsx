import React, { useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import Link from "next/link";

type ForgotPasswordForm = {
  identifier: string;
};

type ApiSuccess = {
  success: true;
  message: string;
  delivery?: { type: "email" | "phone"; mode: string };
  password?: string;
};

type ApiError = {
  error: string;
};

const API_BASE = "https://internshala-clone-7les.onrender.com";

export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    defaultValues: { identifier: "" },
  });

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);
  const [phonePassword, setPhonePassword] = useState<string | null>(null);

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      setSubmitting(true);
      setServerError(null);
      setServerSuccess(null);
      setPhonePassword(null);

      const res = await axios.post<ApiSuccess>(`${API_BASE}/api/auth/forgot-password`, {
        identifier: data.identifier.trim(),
      });

      setServerSuccess(res.data.message || "A new password has been sent to your registered email/phone.");
      if (res.data.password) {
        setPhonePassword(res.data.password);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: ApiError; status?: number } };
      const msg = e.response?.data?.error || "Password reset failed due to a server error.";
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border rounded-2xl shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Forgot Password</h1>
        <p className="mt-2 text-sm text-gray-600">
          Enter your registered email or phone number. You can use this option only once per day.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email or Phone</label>
            <input
              type="text"
              {...register("identifier", {
                required: "Email or phone is required",
                validate: (value) => {
                  const v = value.trim();
                  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                  const isPhone = /^\+?[1-9]\d{9,14}$/.test(v);
                  return isEmail || isPhone || "Enter a valid email or phone number";
                },
              })}
              placeholder="e.g. name@example.com or +919876543210"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              disabled={submitting}
            />
            {errors.identifier ? (
              <p className="mt-1 text-sm text-red-600">{errors.identifier.message}</p>
            ) : null}
          </div>

          {serverError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {serverError}
            </div>
          ) : null}

          {serverSuccess ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {serverSuccess}
              {phonePassword ? (
                <div className="mt-2">
                  <div className="text-xs text-green-700">SMS mock password:</div>
                  <div className="font-mono text-sm text-green-900 break-all">{phonePassword}</div>
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {submitting ? "Sending..." : "Send new password"}
          </button>
        </form>

        <div className="mt-6 text-sm text-gray-600">
          <Link href="/" className="text-blue-700 hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
