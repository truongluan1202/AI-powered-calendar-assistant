"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { api } from "~/trpc/react";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: session?.user?.name || "",
    timezone: "UTC",
  });

  // Update form data when session changes
  useState(() => {
    if (session?.user) {
      setFormData({
        name: session.user.name || "",
        timezone: "UTC", // You might want to get this from user data
      });
    }
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    // Here you would typically call a tRPC mutation to update user data
    // For now, we'll just show a success message
    alert("Profile updated successfully!");
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: session?.user?.name || "",
      timezone: "UTC",
    });
    setIsEditing(false);
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            Please sign in to view your profile
          </h1>
          <p className="text-gray-600">
            You need to be authenticated to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="mt-2 text-gray-600">
            Manage your account information and preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">
                    Personal Information
                  </h2>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-6 px-6 py-4">
                {/* Profile Picture */}
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {session.user?.image ? (
                      <img
                        src={session.user.image}
                        alt="Profile"
                        className="h-20 w-20 rounded-full"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-500">
                        <span className="text-2xl font-medium text-white">
                          {session.user?.name?.charAt(0) || "U"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {session.user?.name || "User"}
                    </h3>
                    <p className="text-gray-500">{session.user?.email}</p>
                    <p className="text-sm text-gray-400">
                      Profile picture managed by Google
                    </p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">
                        {session.user?.name || "Not provided"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <p className="text-gray-900">{session.user?.email}</p>
                    <p className="text-sm text-gray-400">
                      Email is managed by Google
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Timezone
                    </label>
                    {isEditing ? (
                      <select
                        name="timezone"
                        value={formData.timezone}
                        onChange={handleInputChange}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">
                          Pacific Time
                        </option>
                        <option value="Europe/London">London</option>
                        <option value="Europe/Paris">Paris</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                        <option value="Asia/Shanghai">Shanghai</option>
                      </select>
                    ) : (
                      <p className="text-gray-900">{formData.timezone}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      User ID
                    </label>
                    <p className="font-mono text-sm text-gray-900">
                      {session.user?.id}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                {isEditing && (
                  <div className="flex space-x-3 border-t border-gray-200 pt-4">
                    <button
                      onClick={handleSave}
                      className="rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancel}
                      className="rounded-md bg-gray-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Status */}
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Account Status
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded-full bg-green-400"></div>
                  <span className="text-sm text-gray-600">Active</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Your account is active and ready to use.
                </p>
              </div>
            </div>

            {/* Connected Accounts */}
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Connected Accounts
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500">
                    <span className="text-xs font-bold text-white">G</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Google</p>
                    <p className="text-xs text-gray-500">Connected</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Quick Actions
                </h3>
              </div>
              <div className="space-y-3 px-6 py-4">
                <a
                  href="/chat"
                  className="block w-full rounded-md bg-blue-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-600"
                >
                  Go to Chat
                </a>
                <button className="block w-full rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
                  Export Data
                </button>
                <button className="block w-full rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-200">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
