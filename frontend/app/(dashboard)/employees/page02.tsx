"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EmployeesPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/employees");
  }, [router]);

  return null;
}
