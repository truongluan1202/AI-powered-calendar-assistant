"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { api } from "~/trpc/react";

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
  });

  // Update form data when session changes
  useEffect(() => {
    if (session?.user) {
      setFormData({
        name: session.user.name || "",
      });
    }
  }, [session]);

  // tRPC mutations
  const updateUserMutation = api.user.updateProfile.useMutation({
    onSuccess: async (updatedUser) => {
      // Update the session with the new user data
      await update({
        ...session,
        user: {
          ...session?.user,
          name: updatedUser.name,
        },
      });
      alert("Profile updated successfully!");
      setIsEditing(false);
    },
    onError: (error) => {
      alert(`Failed to update profile: ${error.message}`);
    },
  });

  const deleteAccountMutation = api.user.deleteAccount.useMutation({
    onSuccess: () => {
      alert("Account deleted successfully. You will be signed out.");
      void signOut({ callbackUrl: "/" });
    },
    onError: (error) => {
      alert(`Failed to delete account: ${error.message}`);
    },
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
    if (!session?.user?.id) return;

    updateUserMutation.mutate({
      userId: session.user.id,
      name: formData.name,
    });
  };

  const handleCancel = () => {
    setFormData({
      name: session?.user?.name || "",
    });
    setIsEditing(false);
  };

  const handleDeleteAccount = () => {
    if (!session?.user?.id) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.",
    );

    if (confirmed) {
      deleteAccountMutation.mutate({
        userId: session.user.id,
      });
    }
  };

  if (status === "loading") {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
        {/* Background Effects */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          {/* Elegant gradient orbs */}
          <div className="animate-gentle-float absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/40 via-purple-500/25 to-transparent blur-3xl"></div>
          <div className="animate-gentle-float-reverse absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-gradient-to-tr from-indigo-500/35 via-pink-500/20 to-transparent blur-3xl"></div>
          <div className="animate-gentle-drift absolute top-1/2 right-1/4 h-64 w-64 rounded-full bg-gradient-to-bl from-cyan-500/30 via-blue-500/18 to-transparent blur-2xl"></div>

          {/* Subtle geometric patterns */}
          <div className="absolute top-20 left-20 h-32 w-32 opacity-50">
            <div className="elegant-pattern-1"></div>
          </div>
          <div className="absolute right-32 bottom-32 h-24 w-24 opacity-40">
            <div className="elegant-pattern-2"></div>
          </div>
          <div className="absolute top-1/3 left-1/2 h-16 w-16 opacity-35">
            <div className="elegant-pattern-3"></div>
          </div>

          {/* Sophisticated grid overlay */}
          <div className="absolute inset-0 opacity-15">
            <div className="elegant-grid"></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 text-center">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <div className="animate-pulse-glow animate-float animate-shimmer flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-gray-900 to-gray-950 dark:from-gray-400 dark:to-gray-500">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                Cal
              </span>
            </div>
          </div>

          {/* App Name */}
          <h1 className="mb-8 text-4xl font-bold sm:text-5xl md:text-6xl">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400">
              Calendara
            </span>
          </h1>

          {/* Loading Animation */}
          <div className="mb-8">
            <div className="relative mx-auto h-16 w-16">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
              {/* Spinning ring */}
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-blue-600 dark:border-t-blue-400"></div>
              {/* Inner pulsing dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-600 dark:bg-blue-400"></div>
              </div>
            </div>
          </div>

          {/* Loading Text */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Loading your profile
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Setting up your account information...
            </p>
          </div>

          {/* Loading Steps */}
          <div className="mx-auto mt-8 max-w-md">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <svg
                    className="h-4 w-4 text-green-600 dark:text-green-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Authenticating user
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent dark:border-blue-400"></div>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Loading profile data
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mx-auto mt-8 max-w-xs">
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-2 animate-pulse rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400"
                style={{ width: "60%" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="gradient-bg flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-refined mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Please sign in to view your profile
          </h1>
          <p className="text-refined text-gray-600 dark:text-gray-400">
            You need to be authenticated to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-20 h-full overflow-y-auto py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-refined text-3xl font-bold text-gray-900 dark:text-gray-100">
            Profile
          </h1>
          <p className="text-refined mt-2 text-gray-600 dark:text-gray-400">
            Manage your account information and preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <div className="gradient-card shadow-refined rounded-lg">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Personal Information
                  </h2>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="hover:shadow-elegant rounded-md bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:from-gray-700 hover:to-gray-800 dark:from-gray-200 dark:to-gray-300 dark:text-gray-900 dark:hover:from-gray-100 dark:hover:to-gray-200"
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
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-gray-700 to-gray-800 dark:from-gray-300 dark:to-gray-400">
                        <span className="text-2xl font-medium text-white dark:text-white">
                          {session.user?.name?.charAt(0) || "U"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {session.user?.name || "User"}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      {session.user?.email}
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      Profile picture managed by Google
                    </p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Full Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="text-refined w-full rounded-md border border-gray-300 px-3 py-2 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        disabled={updateUserMutation.isPending}
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-gray-100">
                        {session.user?.name || "Not provided"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">
                      {session.user?.email}
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      Email is managed by Google
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      User ID
                    </label>
                    <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                      {session.user?.id}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                {isEditing && (
                  <div className="flex space-x-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                    <button
                      onClick={handleSave}
                      disabled={updateUserMutation.isPending}
                      className="hover:shadow-elegant rounded-md bg-gradient-to-r from-gray-700 to-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:from-gray-600 hover:to-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:from-gray-300 dark:to-gray-400 dark:text-gray-900 dark:hover:from-gray-200 dark:hover:to-gray-300"
                    >
                      {updateUserMutation.isPending
                        ? "Saving..."
                        : "Save Changes"}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={updateUserMutation.isPending}
                      className="hover:shadow-elegant rounded-md bg-gradient-to-r from-gray-500 to-gray-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:from-gray-400 hover:to-gray-500 disabled:cursor-not-allowed disabled:opacity-50 dark:from-gray-400 dark:to-gray-500 dark:text-gray-900 dark:hover:from-gray-300 dark:hover:to-gray-400"
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
            <div className="gradient-card shadow-refined rounded-lg">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Account Status
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded-full bg-gradient-to-r from-gray-600 to-gray-700 dark:from-gray-400 dark:to-gray-500"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Active
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Your account is active and ready to use.
                </p>
              </div>
            </div>

            {/* Connected Accounts */}
            <div className="gradient-card shadow-refined rounded-lg">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Connected Accounts
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-gray-700 to-gray-800 dark:from-gray-300 dark:to-gray-400">
                    <span className="text-xs font-bold text-white dark:text-white">
                      G
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Google
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Connected
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="gradient-card shadow-refined rounded-lg">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Quick Actions
                </h3>
              </div>
              <div className="space-y-3 px-6 py-4">
                <a
                  href="/chat"
                  className="hover:shadow-elegant block w-full rounded-md bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:from-gray-700 hover:to-gray-800 dark:from-gray-200 dark:to-gray-300 dark:text-gray-900 dark:hover:from-gray-100 dark:hover:to-gray-200"
                >
                  Go to Chat
                </a>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteAccountMutation.isPending}
                  className="hover:shadow-elegant block w-full rounded-md bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:from-gray-200 hover:to-gray-300 disabled:cursor-not-allowed disabled:opacity-50 dark:from-gray-700 dark:to-gray-800 dark:text-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-700"
                >
                  {deleteAccountMutation.isPending
                    ? "Deleting..."
                    : "Delete Account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
