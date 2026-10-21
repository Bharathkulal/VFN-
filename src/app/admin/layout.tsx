"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { getAdminMe, getAdminToken, AdminUser } from "@/lib/adminApi";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(!isLoginPage);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    const token = getAdminToken();
    if (!token) {
      router.push("/admin/login");
      return;
    }

    let isMounted = true;
    getAdminMe()
      .then((user) => {
        if (isMounted) {
          setAdminUser(user);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          router.push("/admin/login?expired=true");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [pathname, isLoginPage, router]);

  // Login page layout (standalone)
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#072416] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-300 mb-3" />
        <p className="text-xs uppercase font-mono tracking-widest text-emerald-300/80">
          Verifying Admin Credentials...
        </p>
      </div>
    );
  }

  // Derive title from current route
  let pageTitle = "Dashboard";
  if (pathname.includes("/admin/players")) pageTitle = "Registered Players";
  else if (pathname.includes("/admin/tournament")) pageTitle = "Tournament Details";
  else if (pathname.includes("/admin/posters")) pageTitle = "Auction Posters";
  else if (pathname.includes("/admin/settings")) pageTitle = "Settings";

  return (
    <div className="min-h-screen bg-[#f4f7f4] text-neutral-900 flex">
      {/* Sidebar (Desktop persistent + Mobile drawer) */}
      <AdminSidebar
        adminUser={adminUser}
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        <AdminHeader
          title={pageTitle}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
